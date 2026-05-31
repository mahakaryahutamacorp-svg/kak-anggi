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

$conn = getDbConnection();

// Default settings (matching JavaScript frontend)
$default_settings = [
    'businessName' => 'M3 Chicken',
    'ownerName' => 'Selino Anggri',
    'phone' => '081373546317',
    'address' => 'Jalan Pasar Raya Sidodadi BK 9, OKU Timur, Sumatera Selatan',
    'receiptFooter' => 'Terima kasih — Selamat menikmati!',
    'lowStockThreshold' => 5
];

switch ($request_method) {
    case 'GET':
        $result = $conn->query("SELECT `key`, `value` FROM settings");
        $db_settings = [];
        while ($row = $result->fetch_assoc()) {
            $db_settings[$row['key']] = $row['value'];
        }
        jsonResponse(array_merge($default_settings, $db_settings));
        break;

    case 'POST': // For saving multiple settings (like PUT for all)
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data)) {
            jsonResponse(['error' => 'Data pengaturan kosong'], 400);
        }

        $conn->begin_transaction();
        try {
            $stmt_insert_update = $conn->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");

            foreach ($data as $key => $value) {
                // Ensure key is valid and prevent arbitrary writes
                if (!array_key_exists($key, $default_settings) && !in_array($key, ['current_store_id'])) { // 'current_store_id' for front-end persistence
                    // Skip keys not in default or explicitly allowed
                    continue;
                }
                $stmt_insert_update->bind_param("ss", $key, $value);
                $stmt_insert_update->execute();
            }
            $stmt_insert_update->close();
            $conn->commit();

            // Return updated settings
            $result = $conn->query("SELECT `key`, `value` FROM settings");
            $db_settings = [];
            while ($row = $result->fetch_assoc()) {
                $db_settings[$row['key']] = $row['value'];
            }
            jsonResponse(array_merge($default_settings, $db_settings));

        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(['error' => 'Error menyimpan pengaturan: ' . $e->getMessage()], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>