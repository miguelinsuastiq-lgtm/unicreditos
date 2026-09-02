<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// Configuración de base de datos
// ============================================================

define('DB_HOST',    'localhost');
define('DB_NAME',    'unicreditos');
define('DB_USER',    'root');
define('DB_PASS',    '');         // En producción cambiar con TI
define('DB_CHARSET', 'utf8mb4');

/**
 * Retorna una conexión PDO a la base de datos.
 * Usa el patrón singleton para no abrir múltiples conexiones.
 */
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST, DB_NAME, DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // No exponer detalles de la conexión al cliente
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos.',
            ]);
            exit;
        }
    }

    return $pdo;
}