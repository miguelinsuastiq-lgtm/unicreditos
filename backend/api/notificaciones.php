<?php
// ============================================================
// UniCréditos — API: Notificaciones (campanita)
// ============================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';

aplicarCORS();

// ─── GET: mis notificaciones (estudiante ve las suyas, admin ve las de para_admin) ─
function getMisNotificaciones(array $payload): void {
    $db = getDB();

    if ($payload['rol'] === 'admin') {
        $stmt = $db->prepare('SELECT * FROM notificaciones WHERE para_admin = 1 ORDER BY created_at DESC LIMIT 30');
        $stmt->execute();
        $noLeidasStmt = $db->query('SELECT COUNT(*) AS total FROM notificaciones WHERE para_admin = 1 AND leida = 0');
    } else {
        $stmt = $db->prepare('SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 30');
        $stmt->execute([$payload['id']]);
        $noLeidasStmt = $db->prepare('SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = 0');
        $noLeidasStmt->execute([$payload['id']]);
    }

    $notificaciones = $stmt->fetchAll();
    $noLeidas = $noLeidasStmt->fetch()['total'];

    responderOk(['notificaciones' => $notificaciones, 'no_leidas' => (int)$noLeidas]);
}

// ─── PUT: marcar una notificación como leída ──────────────────────────────────
function marcarLeida(array $payload): void {
    $body = obtenerBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) responderError(400, 'ID requerido.');

    $db = getDB();
    if ($payload['rol'] === 'admin') {
        $stmt = $db->prepare('UPDATE notificaciones SET leida = 1 WHERE id = ? AND para_admin = 1');
        $stmt->execute([$id]);
    } else {
        $stmt = $db->prepare('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?');
        $stmt->execute([$id, $payload['id']]);
    }

    responderOk(['message' => 'Notificación marcada como leída.']);
}

// ─── PUT: marcar todas como leídas ─────────────────────────────────────────────
function marcarTodasLeidas(array $payload): void {
    $db = getDB();
    if ($payload['rol'] === 'admin') {
        $db->exec('UPDATE notificaciones SET leida = 1 WHERE para_admin = 1');
    } else {
        $stmt = $db->prepare('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?');
        $stmt->execute([$payload['id']]);
    }
    responderOk(['message' => 'Todas las notificaciones marcadas como leídas.']);
}

// ─── Enrutamiento ──────────────────────────────────────────────────────────────
$payload = requerirAuth();
$metodo  = $_SERVER['REQUEST_METHOD'];
$accion  = $_GET['accion'] ?? '';

match (true) {
    $metodo === 'GET' && $accion === 'mis_notificaciones'  => getMisNotificaciones($payload),
    $metodo === 'PUT' && $accion === 'marcar_leida'         => marcarLeida($payload),
    $metodo === 'PUT' && $accion === 'marcar_todas_leidas'  => marcarTodasLeidas($payload),
    default => responderError(400, 'Acción no válida.'),
};