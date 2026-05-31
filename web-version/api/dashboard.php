<?php
require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

authenticate();

$request_method = $_SERVER["REQUEST_METHOD"];

$conn = getDbConnection();
$store_id = $_SERVER['CURRENT_USER']['store_id'];

switch ($request_method) {
    case 'GET':
        $today = date('Y-m-d');
        $month_prefix = date('Y-m');

        // Today stats
        $stmt = $conn->prepare("
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
            FROM transactions
            WHERE status != 'BATAL' AND DATE(created_at) = ? AND store_id = ?
        ");
        $stmt->bind_param("si", $today, $store_id);
        $stmt->execute();
        $today_stats = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // Month stats
        $stmt = $conn->prepare("
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
            FROM transactions
            WHERE status != 'BATAL' AND DATE_FORMAT(created_at, '%Y-%m') = ? AND store_id = ?
        ");
        $stmt->bind_param("si", $month_prefix, $store_id);
        $stmt->execute();
        $month_stats = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // Top Products
        $stmt = $conn->prepare("
            SELECT ti.menu_id, ti.nama_menu, SUM(ti.qty) as total_qty, SUM(ti.subtotal) as revenue
            FROM transaction_items ti
            JOIN transactions t ON ti.transaksi_id = t.id
            WHERE DATE(t.created_at) = ? AND t.status != 'BATAL' AND t.store_id = ?
            GROUP BY ti.menu_id, ti.nama_menu
            ORDER BY total_qty DESC
            LIMIT 5
        ");
        $stmt->bind_param("si", $today, $store_id);
        $stmt->execute();
        $top_products_result = $stmt->get_result();
        $top_products = [];
        while($row = $top_products_result->fetch_assoc()) {
            $top_products[] = $row;
        }
        $stmt->close();

        // Low Stock (using a fixed threshold for now, can be dynamic from settings table)
        $low_stock_threshold = 10;
        $stmt = $conn->prepare("
            SELECT id, nama, kategori, stok, harga
            FROM menu
            WHERE stok <= ? AND store_id = ?
            ORDER BY stok ASC
        ");
        $stmt->bind_param("ii", $low_stock_threshold, $store_id);
        $stmt->execute();
        $low_stock_result = $stmt->get_result();
        $low_stock = [];
        while($row = $low_stock_result->fetch_assoc()) {
            $low_stock[] = $row;
        }
        $stmt->close();

        // Recent Transactions
        $stmt = $conn->prepare("
            SELECT t.id, t.nomor_transaksi, t.total, t.metode_pembayaran, t.created_at,
                   u.nama as user_nama,
                   COUNT(ti.id) as item_count
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN transaction_items ti ON t.id = ti.transaksi_id
            WHERE t.status != 'BATAL' AND t.store_id = ?
            GROUP BY t.id
            ORDER BY t.created_at DESC
            LIMIT 5
        ");
        $stmt->bind_param("i", $store_id);
        $stmt->execute();
        $recent_transactions_result = $stmt->get_result();
        $recent_transactions = [];
        while($row = $recent_transactions_result->fetch_assoc()) {
            $recent_transactions[] = $row;
        }
        $stmt->close();

        // Other counts
        $customer_count = $conn->query("SELECT COUNT(*) as count FROM customers WHERE store_id = {$store_id}")->fetch_assoc()['count'];
        $menu_count = $conn->query("SELECT COUNT(*) as count FROM menu WHERE store_id = {$store_id}")->fetch_assoc()['count'];

        $supplier_stats = $conn->query("SELECT COUNT(*) as count, COALESCE(SUM(hutang), 0) as totalHutang FROM suppliers WHERE store_id = {$store_id}")->fetch_assoc();

        // Cashbook saldo (if applicable per store)
        $cashbook_saldo_in = $conn->query("SELECT COALESCE(SUM(nominal), 0) as total FROM cashbook WHERE tipe = 'cash-in' AND store_id = {$store_id}")->fetch_assoc()['total'];
        $cashbook_saldo_out = $conn->query("SELECT COALESCE(SUM(nominal), 0) as total FROM cashbook WHERE tipe = 'cash-out' AND store_id = {$store_id}")->fetch_assoc()['total'];
        $cashbook_saldo = $cashbook_saldo_in - $cashbook_saldo_out;

        jsonResponse([
            'today' => $today_stats,
            'month' => $month_stats,
            'topProducts' => $top_products,
            'lowStock' => $low_stock,
            'lowStockThreshold' => $low_stock_threshold,
            'recentTransactions' => $recent_transactions,
            'counts' => [
                'customers' => (int)$customer_count,
                'menu' => (int)$menu_count,
                'suppliers' => (int)$supplier_stats['count'],
                'totalHutang' => (int)$supplier_stats['totalHutang']
            ],
            'cashbookSaldo' => (int)$cashbook_saldo
        ]);
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

$conn->close();
?>