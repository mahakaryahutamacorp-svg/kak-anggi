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
$id = isset($path_parts[2]) ? parseId($path_parts[2]) : null; // Expecting /api/transactions/{id}
$sub_path = isset($path_parts[3]) ? $path_parts[3] : null; // Expecting /api/transactions/{id}/items or /api/transactions/{id}/payments

$conn = getDbConnection();

// Helper function to map transaction data
function mapTransactionToOrder($tx) {
    $created = $tx['created_at'] ?? '';
    $metode_bayar = strtolower($tx['metode_pembayaran'] ?? 'tunai');

    // Assume we also fetch customer and user name in the main query
    $customer_nama = $tx['customer_nama'] ?? '';
    $user_nama = $tx['user_nama'] ?? '';
    $item_count = $tx['item_count'] ?? 0;

    return [
        'id' => $tx['id'],
        'nomor' => $tx['nomor_transaksi'],
        'tanggal' => substr($created, 0, 10),
        'createdAt' => $created,
        'total' => $tx['total'],
        'kasir' => $user_nama,
        'kasirNama' => $user_nama,
        'metodeBayar' => $metode_bayar,
        'items' => [], // Items will be fetched separately or joined
        'itemCount' => $item_count
    ];
}

switch ($request_method) {
    case 'GET':
        if ($id) {
            if ($sub_path === 'items') {
                $stmt = $conn->prepare("SELECT * FROM transaction_items WHERE transaksi_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                $items = [];
                while($row = $result->fetch_assoc()) {
                    $items[] = $row;
                }
                jsonResponse($items);
            } elseif ($sub_path === 'payments') {
                $stmt = $conn->prepare("SELECT * FROM payments WHERE transaksi_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                $payments = [];
                while($row = $result->fetch_assoc()) {
                    $payments[] = $row;
                }
                jsonResponse($payments);
            } else {
                // Get single transaction
                $stmt = $conn->prepare("
                    SELECT t.*, c.nama as customer_nama, u.nama as user_nama
                    FROM transactions t
                    LEFT JOIN customers c ON t.pelanggan_id = c.id
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.id = ? AND t.store_id = ?
                ");
                $stmt->bind_param("ii", $id, $_SERVER['CURRENT_USER']['store_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                $transaction = $result->fetch_assoc();

                if (!$transaction) {
                    jsonResponse(['error' => 'Transaksi tidak ditemukan'], 404);
                }

                $items_stmt = $conn->prepare("SELECT * FROM transaction_items WHERE transaksi_id = ?");
                $items_stmt->bind_param("i", $id);
                $items_stmt->execute();
                $items_result = $items_stmt->get_result();
                $items = [];
                while($row = $items_result->fetch_assoc()) {
                    $items[] = $row;
                }

                $payments_stmt = $conn->prepare("SELECT * FROM payments WHERE transaksi_id = ?");
                $payments_stmt->bind_param("i", $id);
                $payments_stmt->execute();
                $payments_result = $payments_stmt->get_result();
                $payments = [];
                while($row = $payments_result->fetch_assoc()) {
                    $payments[] = $row;
                }

                jsonResponse(array_merge($transaction, ['items' => $items, 'payments' => $payments]));
            }
        } else {
            // List transactions
            $page = $_GET['page'] ?? 1;
            $limit = $_GET['limit'] ?? 50;
            $tanggal = $_GET['tanggal'] ?? '';
            $store_id = $_SERVER['CURRENT_USER']['store_id'];

            $offset = ($page - 1) * $limit;

            $where_clauses = ["t.status != 'BATAL'", "t.store_id = ?"];
            $params = [$store_id];
            $param_types = "i";

            if (!empty($tanggal)) {
                $where_clauses[] = "DATE(t.created_at) = ?";
                $params[] = $tanggal;
                $param_types .= "s";
            }

            $where_sql = "WHERE " . implode(" AND ", $where_clauses);

            $query = "
                SELECT t.*,
                       c.nama as customer_nama,
                       u.nama as user_nama,
                       COUNT(ti.id) as item_count
                FROM transactions t
                LEFT JOIN customers c ON t.pelanggan_id = c.id
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN transaction_items ti ON t.id = ti.transaksi_id
                $where_sql
                GROUP BY t.id
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            ";

            $stmt = $conn->prepare($query);
            $stmt->bind_param($param_types . "ii", ...$params, $limit, $offset);
            $stmt->execute();
            $result = $stmt->get_result();
            $transactions = [];
            while($row = $result->fetch_assoc()) {
                $transactions[] = mapTransactionToOrder($row);
            }

            $count_query = "SELECT COUNT(*) as count FROM transactions t $where_sql";
            $count_stmt = $conn->prepare($count_query);
            $count_stmt->bind_param($param_types, ...$params);
            $count_stmt->execute();
            $total = $count_stmt->get_result()->fetch_assoc()['count'];

            jsonResponse([
                'data' => $transactions,
                'pagination' => [
                    'page' => (int)$page,
                    'limit' => (int)$limit,
                    'total' => (int)$total,
                    'pages' => (int)ceil($total / $limit) ?: 1
                ]
            ]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $pelanggan_id = $data['pelanggan_id'] ?? null;
        $items_data = $data['items'] ?? [];
        $metode_pembayaran = $data['metode_pembayaran'] ?? 'TUNAI';
        $diskon = $data['diskon'] ?? 0;
        $catatan = $data['catatan'] ?? '';
        $store_id = $_SERVER['CURRENT_USER']['store_id']; // [MULTI-STORE]
        $user_id = $_SERVER['CURRENT_USER']['id'];

        if (empty($items_data)) {
            jsonResponse(['error' => 'Minimal harus ada 1 item'], 400);
        }

        $conn->begin_transaction();
        try {
            $nomor_transaksi = 'TRX-' . time();
            $subtotal = 0;

            // Calculate totals and check menu stock
            foreach ($items_data as $item) {
                $menu_id = $item['menu_id'] ?? null;
                $qty = $item['qty'] ?? 0;
                if (!$menu_id || $qty <= 0) {
                    throw new Exception('Item tidak valid');
                }
                $stmt = $conn->prepare("SELECT harga, stok FROM menu WHERE id = ? AND store_id = ?");
                $stmt->bind_param("ii", $menu_id, $store_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $menu_item = $result->fetch_assoc();
                $stmt->close();

                if (!$menu_item) {
                    throw new Exception("Menu ID {$menu_id} tidak ditemukan");
                }
                if ($menu_item['stok'] < $qty) {
                    throw new Exception("Stok untuk menu ID {$menu_id} tidak cukup");
                }
                $subtotal += $menu_item['harga'] * $qty;
            }

            $diskon_amount = max(0, (int)$diskon);
            $total = $subtotal - $diskon_amount;

            // Insert transaction
            $stmt = $conn->prepare("
                INSERT INTO transactions (nomor_transaksi, pelanggan_id, user_id, subtotal, total, diskon, metode_pembayaran, catatan, store_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("siiiisssi", $nomor_transaksi, $pelanggan_id, $user_id, $subtotal, $total, $diskon_amount, $metode_pembayaran, $catatan, $store_id);
            $stmt->execute();
            $transaksi_id = $conn->insert_id;
            $stmt->close();

            // Insert transaction items and update stock
            foreach ($items_data as $item) {
                $menu_id = $item['menu_id'] ?? null;
                $qty = $item['qty'] ?? 0;

                $stmt = $conn->prepare("SELECT nama, harga FROM menu WHERE id = ? AND store_id = ?");
                $stmt->bind_param("ii", $menu_id, $store_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $menu_info = $result->fetch_assoc();
                $stmt->close();

                $item_subtotal = $menu_info['harga'] * $qty;

                $stmt = $conn->prepare("INSERT INTO transaction_items (transaksi_id, menu_id, nama_menu, harga_satuan, qty, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("iisiii", $transaksi_id, $menu_id, $menu_info['nama'], $menu_info['harga'], $qty, $item_subtotal);
                $stmt->execute();
                $stmt->close();

                // Update stock
                $stmt = $conn->prepare("UPDATE menu SET stok = stok - ? WHERE id = ? AND store_id = ?");
                $stmt->bind_param("iii", $qty, $menu_id, $store_id);
                $stmt->execute();
                $stmt->close();
            }

            // Insert payment record
            $stmt = $conn->prepare("INSERT INTO payments (transaksi_id, jumlah, metode) VALUES (?, ?, ?)");
            $stmt->bind_param("iis", $transaksi_id, $total, $metode_pembayaran);
            $stmt->execute();
            $stmt->close();

            $conn->commit();

            jsonResponse([
                'id' => $transaksi_id,
                'nomor_transaksi' => $nomor_transaksi,
                'subtotal' => $subtotal,
                'diskon' => $diskon_amount,
                'total' => $total,
                'metode_pembayaran' => $metode_pembayaran,
                'items_count' => count($items_data),
                'created_at' => date('Y-m-d H:i:s')
            ], 201);

        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(['error' => 'Error membuat transaksi: ' . $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $data = json_decode(file_get_contents("php://input"), true);
        $status = $data['status'] ?? null;
        $catatan = $data['catatan'] ?? null;
        $store_id = $_SERVER['CURRENT_USER']['store_id'];

        if ($status !== null) {
            $stmt = $conn->prepare("UPDATE transactions SET status = ? WHERE id = ? AND store_id = ?");
            $stmt->bind_param("sii", $status, $id, $store_id);
            $stmt->execute();
            $stmt->close();
        }
        if ($catatan !== null) {
            $stmt = $conn->prepare("UPDATE transactions SET catatan = ? WHERE id = ? AND store_id = ?");
            $stmt->bind_param("sii", $catatan, $id, $store_id);
            $stmt->execute();
            $stmt->close();
        }

        $stmt = $conn->prepare("SELECT * FROM transactions WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ii", $id, $store_id);
        $stmt->execute();
        jsonResponse($stmt->get_result()->fetch_assoc());
        break;

    case 'DELETE': // Soft delete by setting status to BATAL
        if (!$id) {
            jsonResponse(['error' => 'ID tidak valid'], 400);
        }
        $store_id = $_SERVER['CURRENT_USER']['store_id'];

        $stmt = $conn->prepare("UPDATE transactions SET status = 'BATAL' WHERE id = ? AND store_id = ?");
        $stmt->bind_param("ii", $id, $store_id);
        $stmt->execute();
        if ($conn->affected_rows > 0) {
            jsonResponse(['ok' => true]);
        } else {
            jsonResponse(['error' => 'Transaksi tidak ditemukan atau sudah dibatalkan'], 404);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>