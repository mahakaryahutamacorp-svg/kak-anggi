<?php
require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

authenticate();

$request_method = $_SERVER["REQUEST_METHOD"];
$path_parts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$id = isset($path_parts[2]) ? parseId($path_parts[2]) : null; // Expecting /api/supplier/{id}

$conn = getDbConnection();

switch ($request_method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM suppliers WHERE id = ? AND store_id = ?");
            $stmt->bind_param("ii", $id, $_SERVER['CURRENT_USER']['store_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            $supplier = $result->fetch_assoc();
            if (!$supplier) {
                jsonResponse(['error' => 'Supplier tidak ditemukan'], 404);
            }
            jsonResponse($supplier);
        } else {
            $store_id = $_SERVER['CURRENT_USER']['store_id'];
            $stmt = $conn->prepare("SELECT * FROM suppliers WHERE store_id = ? ORDER BY nama");
            $stmt->bind_param("i", $store_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $suppliers = [];
            while($row = $result->fetch_assoc()) {
                $suppliers[] = $row;
            }
            jsonResponse($suppliers);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $nama = $data['nama'] ?? '';
        $kontak = $data['kontak'] ?? '';
        $telepon = $data['telepon'] ?? '';
        $alamat = $data['alamat'] ?? '';
        $kategori = $data['kategori'] ?? '';
        $hutang = $data['hutang'] ?? 0;
        $catatan = $data['catatan'] ?? '';
        $store_id = $_SERVER['CURRENT_USER']['store_id'];

        if (empty($nama)) {
            jsonResponse(['error' => 'Nama wajib diisi'], 400);
        }

        $stmt = $conn->prepare("INSERT INTO suppliers (nama, kontak, telepon, alamat, kategori, hutang, catatan, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssisi", $nama, $kontak, $telepon, $alamat, $kategori, $hutang, $catatan, $store_id);
        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM suppliers WHERE id = ?");
            $stmt->bind_param("i", $newId);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc(), 201);
        } else {
            jsonResponse(['error' => 'Error membuat supplier: ' . $conn->error], 500);
        }
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $nama = $data['nama'] ?? '';
        $kontak = $data['kontak'] ?? '';
        $telepon = $data['telepon'] ?? '';
        $alamat = $data['alamat'] ?? '';
        $kategori = $data['kategori'] ?? '';
        $hutang = $data['hutang'] ?? 0;
        $catatan = $data['catatan'] ?? '';
        $store_id = $_SERVER['CURRENT_USER']['store_id'];

        if (empty($nama)) {
            jsonResponse(['error' => 'Nama wajib diisi'], 400);
        }

        $stmt = $conn->prepare("UPDATE suppliers SET nama = ?, kontak = ?, telepon = ?, alamat = ?, kategori = ?, hutang = ?, catatan = ? WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ssssisii", $nama, $kontak, $telepon, $alamat, $kategori, $hutang, $catatan, $id, $store_id);
        if ($stmt->execute()) {
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM suppliers WHERE id = ? AND store_id = ?");
            $stmt->bind_param("ii", $id, $store_id);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc());
        } else {
            jsonResponse(['error' => 'Error mengupdate supplier: ' . $conn->error], 500);
        }
        break;

    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $store_id = $_SERVER['CURRENT_USER']['store_id'];

        $stmt = $conn->prepare("DELETE FROM suppliers WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ii", $id, $store_id);
        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                jsonResponse(['ok' => true]);
            } else {
                jsonResponse(['error' => 'Supplier tidak ditemukan atau tidak memiliki izin'], 404);
            }
        } else {
            jsonResponse(['error' => 'Error menghapus supplier: ' . $conn->error], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>