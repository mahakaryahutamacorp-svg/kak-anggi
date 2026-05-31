<?php
// php/db.php - Konfigurasi koneksi MySQL
// [MULTI-STORE]

// TODO: Ganti dengan kredensial database Hostinger Anda
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'm3chicken');

function getDbConnection() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            die('Koneksi database gagal: ' . $conn->connect_error);
        }
        $conn->set_charset('utf8mb4');
    }
    return $conn;
}

// Fungsi helper untuk eksekusi query
function query($sql, $params = [], $types = '') {
    $conn = getDbConnection();
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        die('Prepare statement gagal: ' . $conn->error);
    }
    if (!empty($params) && !empty($types)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    return $stmt;
}

// Fungsi untuk mendapatkan satu baris hasil
function fetchOne($sql, $params = [], $types = '') {
    $stmt = query($sql, $params, $types);
    $result = $stmt->get_result();
    return $result->fetch_assoc();
}

// Fungsi untuk mendapatkan semua baris hasil
function fetchAll($sql, $params = [], $types = '') {
    $stmt = query($sql, $params, $types);
    $result = $stmt->get_result();
    return $result->fetch_all(MYSQLI_ASSOC);
}

// Fungsi untuk eksekusi non-SELECT (INSERT, UPDATE, DELETE)
function execute($sql, $params = [], $types = '') {
    $stmt = query($sql, $params, $types);
    $affected_rows = $stmt->affected_rows;
    $insert_id = $stmt->insert_id;
    $stmt->close();
    return ['affected_rows' => $affected_rows, 'insert_id' => $insert_id];
}

// Fungsi untuk enkripsi password
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Fungsi untuk verifikasi password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Fungsi untuk respons JSON
function jsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Middleware autentikasi
function authMiddleware() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';

    if (empty($token) || !str_starts_with($token, 'Bearer ')) {
        jsonResponse(['error' => 'Token tidak ditemukan'], 401);
    }

    $token = substr($token, 7); // Hapus "Bearer "

    // TODO: Implementasi verifikasi token yang sebenarnya (misal JWT, atau session ID di DB)
    // Untuk demo sederhana, kita akan anggap token adalah ID user untuk sementara
    // Ini TIDAK AMAN untuk produksi.
    $user_id = (int)$token; // Anggap token adalah user ID

    if (!$user_id) {
        jsonResponse(['error' => 'Token tidak valid'], 401);
    }

    $user = fetchOne('SELECT id, username, role, nama, telepon FROM users WHERE id = ?', [$user_id], 'i');

    if (!$user) {
        jsonResponse(['error' => 'User tidak ditemukan'], 401);
    }

    return $user; // Kembalikan data user yang terautentikasi
}

// Fungsi untuk mendapatkan ID toko aktif
function getCurrentStoreId() {
    // TODO: Ambil dari session atau parameter request. Ini perlu diperbaiki di frontend.
    return isset($_GET['store_id']) ? (int)$_GET['store_id'] : 1;
}

// Fungsi untuk parse ID dari request parameter
function parseId($param) {
    $id = (int)$param;
    return $id > 0 ? $id : null;
}
