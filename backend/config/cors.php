<?php
function aplicarCORS(): void {
    $origenes_permitidos = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ];

    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origen, $origenes_permitidos, true)) {
        header("Access-Control-Allow-Origin: $origen");
    } else {
        // En desarrollo permitir cualquier origen local
        header("Access-Control-Allow-Origin: *");
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}