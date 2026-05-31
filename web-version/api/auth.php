<?php
require_once 'config.php';

// Allow cross-origin requests
header("Access-Control-Allow-Origin: *"); // Sesuaikan di produksi
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$request_method = $_SERVER["REQUEST_METHOD"];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

// Endpoint health check
if ($path == '/api/health') { // Atau sesuai path yang Anda inginkan
    jsonResponse(['ok' => true, 'service' => 'M3 Chicken API', 'database' => 'mysql']);
}

// Proses request
switch ($request_method) {
    case 'POST':
        if (end($path_parts) == 'login') {
            $data = json_decode(file_get_contents("php://input"), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                jsonResponse(['error' => 'Username dan password wajib diisi'], 400);
            }

            $conn = getDbConnection();
            $stmt = $conn->prepare("SELECT id, username, password, role, nama, telepon FROM users WHERE username = ?");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            $stmt->close();
            $conn->close();

            if (!$user || $user['password'] !== hashPassword($password)) {
                jsonResponse(['error' => 'Username atau password salah'], 401);
            }

            // Generate token dan simpan sesi
            $token = bin2hex(random_bytes(32)); // Token acak
            $expires_at = date('Y-m-d H:i:s', time() + 24 * 60 * 60); // 24 jam

            $conn = getDbConnection();
            $stmt = $conn->prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)");
            $stmt->bind_param("sis", $token, $user['id'], $expires_at);
            $stmt->execute();
            $stmt->close();
            $conn->close();

            jsonResponse([
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'nama' => $user['nama'],
                    'telepon' => $user['telepon']
                ]
            ]);
        } elseif (end($path_parts) == 'logout') {
            authenticate(); // Verifikasi token
            $conn = getDbConnection();
            $stmt = $conn->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->bind_param("s", $_SERVER['CURRENT_TOKEN']);
            $stmt->execute();
            $stmt->close();
            $conn->close();
            jsonResponse(['ok' => true]);
        }
        break;

    case 'GET':
        if (end($path_parts) == 'me') {
            authenticate(); // Verifikasi token dan set CURRENT_USER
            jsonResponse(['user' => $_SERVER['CURRENT_USER']]);
        }
        break;

    default:
        jsonResponse(['error' => 'Metode tidak diizinkan'], 405);
        break;
}

?>