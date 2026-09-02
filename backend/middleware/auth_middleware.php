<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// Middleware de autenticación — JWT + RBAC por rol
// Cumple requerimientos TI: JWT, RBAC, logs de auditoría
// ============================================================

require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../config/database.php';

/**
 * Verifica que la petición tenga un JWT válido.
 * Si el token es inválido o expiró, responde 401 y corta la ejecución.
 * Retorna el payload del token si es válido.
 */
function requerirAuth(): array {
    $token = obtenerTokenDelHeader();

    if (!$token) {
        responderError(401, 'Token no proporcionado. Inicia sesión.');
    }

    $payload = validarJWT($token);

    if (!$payload) {
        responderError(401, 'Token inválido o expirado. Inicia sesión nuevamente.');
    }

    // Verificar que el token no haya sido invalidado (logout)
    $db   = getDB();
    $stmt = $db->prepare('SELECT activo FROM tokens_jwt WHERE token_hash = ? AND usuario_id = ?');
    $stmt->execute([hash('sha256', $token), $payload['id']]);
    $tokenDB = $stmt->fetch();

    if (!$tokenDB || !$tokenDB['activo']) {
        responderError(401, 'Sesión cerrada. Inicia sesión nuevamente.');
    }

    return $payload;
}

/**
 * Verifica que el usuario autenticado tenga el rol requerido.
 * Uso: requerirRol($payload, 'admin')
 */
function requerirRol(array $payload, string $rol): void {
    if ($payload['rol'] !== $rol) {
        responderError(403, 'No tienes permisos para realizar esta acción.');
    }
}

/**
 * Verifica que el usuario sea admin O que el recurso le pertenezca.
 * Evita que un estudiante acceda a datos de otro estudiante.
 */
function requerirPropietarioOAdmin(array $payload, int $estudianteId): void {
    if ($payload['rol'] !== 'admin' && $payload['id'] !== $estudianteId) {
        responderError(403, 'No tienes permisos para acceder a este recurso.');
    }
}

/**
 * Registra un evento en la tabla logs_auditoria.
 * Cumple retención mínima 12 meses requerida por TI.
 */
function registrarLog(
    int|null $usuarioId,
    string   $accion,
    string   $modulo,
    string   $descripcion,
    array    $datosExtra = []
): void {
    try {
        $db   = getDB();
        $stmt = $db->prepare('
            INSERT INTO logs_auditoria
                (usuario_id, accion, modulo, descripcion, ip, user_agent, datos_extra)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $usuarioId,
            $accion,
            $modulo,
            $descripcion,
            $_SERVER['REMOTE_ADDR']      ?? null,
            $_SERVER['HTTP_USER_AGENT']  ?? null,
            !empty($datosExtra) ? json_encode($datosExtra) : null,
        ]);
    } catch (Throwable) {
        // No interrumpir el flujo si falla el log
    }
}

/**
 * Responde con un error JSON y corta la ejecución.
 */
function responderError(int $codigo, string $mensaje): never {
    http_response_code($codigo);
    echo json_encode([
        'success' => false,
        'message' => $mensaje,
    ]);
    exit;
}

/**
 * Responde con éxito en JSON.
 */
function responderOk(array $datos, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode([
        'success' => true,
        ...$datos,
    ]);
}

/**
 * Lee y valida el body JSON de la petición.
 */
function obtenerBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}