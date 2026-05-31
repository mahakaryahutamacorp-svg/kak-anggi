<?php
require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

authenticate(); // Store operations require authentication

// Only owner role can manage stores
if ($_SERVER['CURRENT_USER']['role'] !== 'owner') {
    jsonResponse(['error' => 'Hanya pemilik yang bisa mengelola toko'], 403);
}

$request_method = $_SERVER["REQUEST_METHOD"];
$path_parts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$id = isset($path_parts[2]) ? parseId($path_parts[2]) : null; // Expecting /api/stores/{id}
$action = isset($path_parts[3]) ? $path_parts[3] : null; // Expecting /api/stores/{id}/default

$conn = getDbConnection();

switch ($request_method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM stores WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $store = $result->fetch_assoc();
            if (!$store) {
                jsonResponse(['error' => 'Toko tidak ditemukan'], 404);
            }
            jsonResponse($store);
        } else {
            $result = $conn->query("SELECT * FROM stores ORDER BY is_default DESC, nama_toko");
            $stores = [];
            while($row = $result->fetch_assoc()) {
                $stores[] = $row;
            }
            jsonResponse($stores);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $kode_toko = $data['kode_toko'] ?? '';
        $nama_toko = $data['nama_toko'] ?? '';
        $alamat = $data['alamat'] ?? '';
        $telepon = $data['telepon'] ?? '';
        $is_active = $data['is_active'] ?? 1;

        if (empty($kode_toko) || empty($nama_toko)) {
            jsonResponse(['error' => 'Kode toko dan nama toko wajib diisi'], 400);
        }

        $stmt = $conn->prepare("INSERT INTO stores (kode_toko, nama_toko, alamat, telepon, is_active) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssi", $kode_toko, $nama_toko, $alamat, $telepon, $is_active);
        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM stores WHERE id = ?");
            $stmt->bind_param("i", $newId);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc(), 201);
        } else {
            if ($conn->errno == 1062) { // MySQL error for duplicate entry
                jsonResponse(['error' => 'Kode toko sudah digunakan'], 409);
            } else {
                jsonResponse(['error' => 'Error membuat toko: ' . $conn->error], 500);
            }
        }
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        if ($action === 'default') { // Set default store
            $conn->begin_transaction();
            try {
                // Reset all to not default
                $conn->query("UPDATE stores SET is_default = 0");
                // Set the chosen store as default and active
                $stmt = $conn->prepare("UPDATE stores SET is_default = 1, is_active = 1 WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $conn->commit();

                $stmt->close();
                $stmt = $conn->prepare("SELECT * FROM stores WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                jsonResponse($stmt->get_result()->fetch_assoc());

            } catch (Exception $e) {
                $conn->rollback();
                jsonResponse(['error' => 'Gagal mengatur toko default: ' . $e->getMessage()], 500);
            }
        } else {
            $data = json_decode(file_get_contents("php://input"), true);
            $kode_toko = $data['kode_toko'] ?? '';
            $nama_toko = $data['nama_toko'] ?? '';
            $alamat = $data['alamat'] ?? '';
            $telepon = $data['telepon'] ?? '';
            $is_active = $data['is_active'] ?? 1;

            if (empty($kode_toko) || empty($nama_toko)) {
                jsonResponse(['error' => 'Kode toko dan nama toko wajib diisi'], 400);
            }

            $stmt = $conn->prepare("UPDATE stores SET kode_toko = ?, nama_toko = ?, alamat = ?, telepon = ?, is_active = ? WHERE id = ?");
            $stmt->bind_param("ssssii", $kode_toko, $nama_toko, $alamat, $telepon, $is_active, $id);
            if ($stmt->execute()) {
                $stmt->close();
                $stmt = $conn->prepare("SELECT * FROM stores WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                jsonResponse($stmt->get_result()->fetch_assoc());
            } else {
                if ($conn->errno == 1062) {
                    jsonResponse(['error' => 'Kode toko sudah digunakan'], 409);
                } else {
                    jsonResponse(['error' => 'Error mengupdate toko: ' . $conn->error], 500);
                }
            }
        }
        break;

    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }

        $stmt = $conn->prepare("SELECT is_default FROM stores WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $store = $result->fetch_assoc();
        $stmt->close();

        if (!$store) {
            jsonResponse(['error' => 'Toko tidak ditemukan'], 404);
        }
        if ($store['is_default']) {
            jsonResponse(['error' => 'Toko default tidak dapat dihapus'], 409);
        }

        // Check for linked transactions
        $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM transactions WHERE store_id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $linked = $result->fetch_assoc();
        $stmt->close();

        if ($linked['total'] > 0) {
            jsonResponse(['error' => 'Toko memiliki transaksi terkait, tidak dapat dihapus'], 409);
        }

        $stmt = $conn->prepare("DELETE FROM stores WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                jsonResponse(['ok' => true]);
            } else {
                jsonResponse(['error' => 'Toko tidak ditemukan'], 404);
            }
        } else {
            jsonResponse(['error' => 'Error menghapus toko: ' . $conn->error], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>