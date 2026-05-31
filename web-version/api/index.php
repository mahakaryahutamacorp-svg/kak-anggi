<?php
// This is a simple router for the API endpoints
// It maps /api/resource to resource.php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

// Expecting path like /api/auth or /api/menu/1
if (isset($path_parts[1])) {
    $resource = $path_parts[1]; // e.g., 'auth', 'menu', 'customers'

    // List of allowed API resources
    $allowed_resources = [
        'auth',
        'menu',
        'customers',
        'suppliers',
        'transactions',
        'dashboard',
        'ledger',
        'cashbook',
        'stores',
        'settings'
    ];

    if (in_array($resource, $allowed_resources)) {
        // Include the corresponding PHP file
        require_once $resource . '.php';
    } else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Resource API tidak ditemukan']);
    }
} else {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Endpoint API tidak ditemukan']);
}
?>