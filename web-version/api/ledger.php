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
$id = isset($path_parts[2]) ? parseId($path_parts[2]) : null; // Expecting /api/ledger/{id}

$conn = getDbConnection();
$store_id = $_SERVER['CURRENT_USER']['store_id'];

switch ($request_method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM ledger WHERE id = ? AND store_id = ?");
            $stmt->bind_param("ii", $id, $store_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $entry = $result->fetch_assoc();
            if (!$entry) {
                jsonResponse(['error' => 'Entri buku besar tidak ditemukan'], 404);
            }
            jsonResponse($entry);
        } else {
            $result = $conn->query("SELECT * FROM ledger WHERE store_id = {$store_id} ORDER BY created_at DESC");
            $ledger_entries = [];
            while($row = $result->fetch_assoc()) {
                $ledger_entries[] = $row;
            }
            jsonResponse($ledger_entries);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $tanggal = $data['tanggal'] ?? date('Y-m-d');
        $tipe = $data['tipe'] ?? '';
        $deskripsi = $data['deskripsi'] ?? '';
        $nominal = $data['nominal'] ?? 0;
        $kategori = $data['kategori'] ?? '';
        $order_id = $data['orderId'] ?? null;

        if (empty($tipe) || empty($deskripsi) || empty($nominal)) {
            jsonResponse(['error' => 'Tipe, deskripsi, dan nominal wajib diisi'], 400);
        }

        $stmt = $conn->prepare("INSERT INTO ledger (tanggal, tipe, deskripsi, nominal, kategori, orderId, store_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssisii", $tanggal, $tipe, $deskripsi, $nominal, $kategori, $order_id, $store_id);
        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM ledger WHERE id = ?");
            $stmt->bind_param("i", $newId);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc(), 201);
        } else {
            jsonResponse(['error' => 'Error membuat entri buku besar: ' . $conn->error], 500);
        }
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $tanggal = $data['tanggal'] ?? date('Y-m-d');
        $tipe = $data['tipe'] ?? '';
        $deskripsi = $data['deskripsi'] ?? '';
        $nominal = $data['nominal'] ?? 0;
        $kategori = $data['kategori'] ?? '';
        $order_id = $data['orderId'] ?? null;

        if (empty($tipe) || empty($deskripsi) || empty($nominal)) {
            jsonResponse(['error' => 'Tipe, deskripsi, dan nominal wajib diisi'], 400);
        }

        $stmt = $conn->prepare("UPDATE ledger SET tanggal = ?, tipe = ?, deskripsi = ?, nominal = ?, kategori = ?, orderId = ? WHERE id = ? AND store_id = ?");
        $stmt->bind_param("sssisiii", $tanggal, $tipe, $deskripsi, $nominal, $kategori, $order_id, $id, $store_id);
        if ($stmt->execute()) {
            $stmt->close();
            $stmt = $conn->prepare("SELECT * FROM ledger WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            jsonResponse($stmt->get_result()->fetch_assoc());
        } else {
            jsonResponse(['error' => 'Error mengupdate entri buku besar: ' . $conn->error], 500);
        }
        break;

    case 'DELETE':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $stmt = $conn->prepare("DELETE FROM ledger WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ii", $id, $store_id);
        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                jsonResponse(['ok' => true]);
            } else {
                jsonResponse(['error' => 'Entri buku besar tidak ditemukan atau tidak memiliki izin'], 404);
            }
        } else {
            jsonResponse(['error' => 'Error menghapus entri buku besar: ' . $conn->error], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>