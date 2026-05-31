<?php
// [MULTI-STORE] Konfigurasi Database MySQL untuk Hostinger
define('DB_HOST', 'localhost'); // Biasanya localhost di Hostinger
define('DB_USER', 'u123456789_m3chicken'); // Ganti dengan username database Anda
define('DB_PASS', 'PasswordDatabaseAnda'); // Ganti dengan password database Anda
define('DB_NAME', 'u123456789_m3chicken'); // Ganti dengan nama database Anda

// Koneksi ke database
function getDbConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die("Koneksi database gagal: " . $conn->connect_error);
    }
    return $conn;
}

// Fungsi untuk membuat respons JSON standar
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Fungsi untuk menghash password (SHA-256)
function hashPassword($password) {
    return hash('sha256', $password);
}

// Middleware autentikasi
function authenticate() {
    $headers = apache_request_headers();
    $token = null;

    if (isset($headers['Authorization'])) {
        $token = str_replace('Bearer ', '', $headers['Authorization']);
    }

    if (!$token) {
        jsonResponse(['error' => 'Token tidak ditemukan'], 401);
    }

    // Untuk PHP, kita perlu menyimpan sesi di database atau JWT
    // Untuk POC ini, kita akan simulasikan dengan token sederhana atau dari DB
    // Asumsi: token adalah user ID atau sessionId yang tersimpan di DB
    $conn = getDbConnection();
    $stmt = $conn->prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    $session = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    if (!$session || strtotime($session['expires_at']) < time()) {
        // Hapus sesi kedaluwarsa
        if ($session) {
            $conn = getDbConnection();
            $stmt = $conn->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $stmt->close();
            $conn->close();
        }
        jsonResponse(['error' => 'Sesi kedaluwarsa, silakan login ulang'], 401);
    }

    // Ambil detail user
    $conn = getDbConnection();
    $stmt = $conn->prepare("SELECT id, username, role, nama, telepon FROM users WHERE id = ?");
    $stmt->bind_param("i", $session['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    if (!$user) {
        jsonResponse(['error' => 'User tidak ditemukan'], 401);
    }

    // Simpan user di global context untuk request selanjutnya
    $_SERVER['CURRENT_USER'] = $user;
    $_SERVER['CURRENT_TOKEN'] = $token;
}

// Fungsi untuk parsing ID dari URL
function parseId($param) {
    $id = (int)$param;
    return $id > 0 ? $id : null;
}

// Inisialisasi sesi table (jika belum ada)
function initSessionsTable() {
    $conn = getDbConnection();
    $conn->query("
        CREATE TABLE IF NOT EXISTS `sessions` (
            `token` VARCHAR(255) PRIMARY KEY,
            `user_id` INT NOT NULL,
            `expires_at` DATETIME NOT NULL,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    $conn->close();
}

// Panggil sekali untuk memastikan tabel sesi ada
initSessionsTable();

?>