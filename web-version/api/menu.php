<?php
require_once 'config.php';

// Allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

authenticate(); // All menu operations require authentication

$request_method = $_SERVER["REQUEST_METHOD"];
$path_parts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$id = isset($path_parts[2]) ? parseId($path_parts[2]) : null; // Expecting /api/menu/{id}

$conn = getDbConnection();

switch ($request_method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM menu WHERE id = ? AND store_id = ?");
            $stmt->bind_param("ii", $id, $_SERVER['CURRENT_USER']['store_id']); // [MULTI-STORE]
            $stmt->execute();
            $result = $stmt->get_result();
            $menu_item = $result->fetch_assoc();
            if (!$menu_item) {
                jsonResponse(['error' => 'Menu tidak ditemukan'], 404);
            }
            jsonResponse($menu_item);
        } else {
            $store_id = $_SERVER['CURRENT_USER']['store_id']; // [MULTI-STORE]
            $stmt = $conn->prepare("SELECT * FROM menu WHERE store_id = ? ORDER BY nama");
            $stmt->bind_param("i", $store_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $menu = [];
            while($row = $result->fetch_assoc()) {
                $menu[] = $row;
            }
            jsonResponse($menu);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $nama = $data['nama'] ?? '';
        $kategori = $data['kategori'] ?? '';
        $harga = $data['harga'] ?? 0;
        $stok = $data['stok'] ?? 0;
        $barcode = $data['barcode'] ?? '';
        $store_id = $_SERVER['CURRENT_USER']['store_id']; // [MULTI-STORE]

        if (empty($nama) || empty($kategori)) {
            jsonResponse(['error' => 'Nama dan kategori wajib diisi'], 400);
        }

        $stmt = $conn->prepare("INSERT INTO menu (nama, kategori, harga, stok, barcode, store_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssiisi", $nama, $kategori, $harga, $stok, $barcode, $store_id);
        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM menu WHERE id = ?");
            $stmt->bind_param("i", $newId);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc(), 201);
        } else {
            jsonResponse(['error' => 'Error membuat menu: ' . $conn->error], 500);
        }
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $nama = $data['nama'] ?? '';
        $kategori = $data['kategori'] ?? '';
        $harga = $data['harga'] ?? 0;
        $stok = $data['stok'] ?? 0;
        $barcode = $data['barcode'] ?? '';
        $store_id = $_SERVER['CURRENT_USER']['store_id']; // [MULTI-STORE]

        if (empty($nama) || empty($kategori)) {
            jsonResponse(['error' => 'Nama dan kategori wajib diisi'], 400);
        }

        $stmt = $conn->prepare("UPDATE menu SET nama = ?, kategori = ?, harga = ?, stok = ?, barcode = ? WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ssiisii", $nama, $kategori, $harga, $stok, $barcode, $id, $store_id);
        if ($stmt->execute()) {
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM menu WHERE id = ? AND store_id = ?");
            $stmt->bind_param("ii", $id, $store_id);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc());
        } else {
            jsonResponse(['error' => 'Error mengupdate menu: ' . $conn->error], 500);
        }
        break;

    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $store_id = $_SERVER['CURRENT_USER']['store_id']; // [MULTI-STORE]

        $stmt = $conn->prepare("DELETE FROM menu WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ii", $id, $store_id);
        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                jsonResponse(['ok' => true]);
            } else {
                jsonResponse(['error' => 'Menu tidak ditemukan atau tidak memiliki izin'], 404);
            }
        } else {
            jsonResponse(['error' => 'Error menghapus menu: ' . $conn->error], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>