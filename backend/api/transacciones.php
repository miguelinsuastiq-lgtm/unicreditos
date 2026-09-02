<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Transacciones — historial de movimientos financieros
// ============================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';

aplicarCORS();

$payload = requerirAuth();
$metodo  = $_SERVER['REQUEST_METHOD'];
$accion  = $_GET['accion'] ?? '';

match (true) {
    $metodo === 'GET' && $accion === 'mis_transacciones' => getMisTransacciones($payload),
    $metodo === 'GET' && $accion === 'todas'             => getTodas($payload),
    $metodo === 'GET' && $accion === 'detalle'           => getDetalle($payload),
    $metodo === 'GET' && $accion === 'resumen'           => getResumen($payload),
    default => responderError(400, 'Acción no válida.'),
};

// ─── GET: transacciones del estudiante ────────────────────────────────────────
function getMisTransacciones(array $payload): void {
    requerirRol($payload, 'estudiante');

    $creditoId = (int)($_GET['credito_id'] ?? 0);
    $tipo      = $_GET['tipo']   ?? '';
    $orden     = $_GET['orden']  ?? 'desc';
    $orden     = in_array(strtoupper($orden), ['ASC','DESC']) ? strtoupper($orden) : 'DESC';

    $where  = ['t.estudiante_id = ?'];
    $params = [$payload['id']];

    if ($creditoId) {
        $where[]  = 't.credito_id = ?';
        $params[] = $creditoId;
    }

    $tiposValidos = ['desembolso','pago','interes','mora','ajuste'];
    if ($tipo && in_array($tipo, $tiposValidos, true)) {
        $where[]  = 't.tipo = ?';
        $params[] = $tipo;
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            t.id, t.tipo, t.descripcion,
            t.monto, t.saldo_antes, t.saldo_despues,
            t.canal, t.referencia, t.fecha,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo
        FROM transacciones t
        JOIN creditos c ON c.id = t.credito_id
        WHERE $whereStr
        ORDER BY t.fecha $orden
    ");
    $stmt->execute($params);
    $transacciones = $stmt->fetchAll();

    // Resumen del crédito seleccionado
    $resumen = null;
    if ($creditoId) {
        $stmtR = $db->prepare("
            SELECT
                SUM(CASE WHEN tipo = 'pago'   THEN monto ELSE 0 END) AS total_pagado,
                SUM(CASE WHEN tipo IN ('mora','interes') THEN monto ELSE 0 END) AS total_mora_interes,
                COUNT(CASE WHEN tipo = 'pago' THEN 1 END) AS cant_pagos,
                MAX(saldo_despues) AS saldo_maximo,
                MIN(CASE WHEN tipo = 'pago' THEN saldo_despues END) AS saldo_minimo
            FROM transacciones
            WHERE credito_id = ? AND estudiante_id = ?
        ");
        $stmtR->execute([$creditoId, $payload['id']]);
        $resumen = $stmtR->fetch();
    }

    responderOk([
        'transacciones' => $transacciones,
        'resumen'       => $resumen,
    ]);
}

// ─── GET: todas las transacciones (solo admin) ────────────────────────────────
function getTodas(array $payload): void {
    requerirRol($payload, 'admin');

    $tipo      = $_GET['tipo']      ?? '';
    $canal     = $_GET['canal']     ?? '';
    $buscar    = $_GET['buscar']    ?? '';
    $creditoId = (int)($_GET['credito_id'] ?? 0);
    $desde     = $_GET['desde']     ?? '';
    $hasta     = $_GET['hasta']     ?? '';
    $semestre  = $_GET['semestre']  ?? '';
    $orden     = $_GET['orden']     ?? 'desc';
    $orden     = in_array(strtoupper($orden), ['ASC','DESC']) ? strtoupper($orden) : 'DESC';

    $where  = ['1=1'];
    $params = [];

    $tiposValidos = ['desembolso','pago','interes','mora','ajuste'];
    if ($tipo && in_array($tipo, $tiposValidos, true)) {
        $where[]  = 't.tipo = ?';
        $params[] = $tipo;
    }

    $canalesValidos = ['PSE','Transferencia','Efectivo','Sistema'];
    if ($canal && in_array($canal, $canalesValidos, true)) {
        $where[]  = 't.canal = ?';
        $params[] = $canal;
    }

    if ($creditoId) {
        $where[]  = 't.credito_id = ?';
        $params[] = $creditoId;
    }

    if ($semestre) {
        $where[]  = 'c.deudor_semestre = ?';
        $params[] = (int)$semestre;
    }

    if ($desde) {
        $where[]  = 't.fecha >= ?';
        $params[] = $desde . ' 00:00:00';
    }

    if ($hasta) {
        $where[]  = 't.fecha <= ?';
        $params[] = $hasta . ' 23:59:59';
    }

    if ($buscar) {
        $where[]  = '(u.nombre LIKE ? OR u.cc LIKE ? OR c.codigo LIKE ? OR t.referencia LIKE ?)';
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            t.id, t.tipo, t.descripcion,
            t.monto, t.saldo_antes, t.saldo_despues,
            t.canal, t.referencia, t.fecha,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo,
            u.id AS estudiante_id, u.nombre AS estudiante_nombre,
            u.cc AS estudiante_cc
        FROM transacciones t
        JOIN creditos c ON c.id = t.credito_id
        JOIN usuarios u ON u.id = t.estudiante_id
        WHERE $whereStr
        ORDER BY t.fecha $orden
    ");
    $stmt->execute($params);
    $transacciones = $stmt->fetchAll();

    // Totales globales
    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN tipo = 'desembolso' THEN monto ELSE 0 END) AS total_desembolsado,
            SUM(CASE WHEN tipo = 'pago'       THEN monto ELSE 0 END) AS total_recaudado,
            SUM(CASE WHEN tipo IN ('mora','interes') THEN monto ELSE 0 END) AS total_mora_interes,
            COUNT(DISTINCT estudiante_id) AS estudiantes_unicos
        FROM transacciones
    ")->fetch();

    responderOk([
        'transacciones' => $transacciones,
        'totales'       => $totales,
    ]);
}

// ─── GET: detalle de una transacción ─────────────────────────────────────────
function getDetalle(array $payload): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de transacción requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT
            t.*,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo,
            c.periodo, c.estudiante_id,
            u.nombre AS estudiante_nombre, u.cc AS estudiante_cc,
            u.email AS estudiante_email,
            f.numero AS factura_numero
        FROM transacciones t
        JOIN creditos c ON c.id = t.credito_id
        JOIN usuarios u ON u.id = t.estudiante_id
        LEFT JOIN facturas f ON f.id = t.factura_id
        WHERE t.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $tx = $stmt->fetch();

    if (!$tx) responderError(404, 'Transacción no encontrada.');

    requerirPropietarioOAdmin($payload, (int)$tx['estudiante_id']);

    responderOk(['transaccion' => $tx]);
}

// ─── GET: resumen financiero global (solo admin) ──────────────────────────────
function getResumen(array $payload): void {
    requerirRol($payload, 'admin');

    $db = getDB();

    // Resumen por tipo
    $porTipo = $db->query("
        SELECT tipo,
               COUNT(*) AS cantidad,
               SUM(monto) AS total
        FROM transacciones
        GROUP BY tipo
        ORDER BY total DESC
    ")->fetchAll();

    // Resumen por canal
    $porCanal = $db->query("
        SELECT canal,
               COUNT(*) AS cantidad,
               SUM(CASE WHEN tipo = 'pago' THEN monto ELSE 0 END) AS total_pagado
        FROM transacciones
        WHERE tipo = 'pago'
        GROUP BY canal
        ORDER BY total_pagado DESC
    ")->fetchAll();

    // Movimientos por mes (últimos 6 meses)
    $porMes = $db->query("
        SELECT
            DATE_FORMAT(fecha, '%Y-%m') AS mes,
            SUM(CASE WHEN tipo = 'pago' THEN monto ELSE 0 END) AS pagado,
            SUM(CASE WHEN tipo = 'desembolso' THEN monto ELSE 0 END) AS desembolsado,
            COUNT(*) AS cantidad
        FROM transacciones
        WHERE fecha >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY mes
        ORDER BY mes ASC
    ")->fetchAll();

    // Estudiantes en mora
    $enMora = $db->query("
        SELECT COUNT(DISTINCT estudiante_id) AS total
        FROM transacciones
        WHERE tipo = 'mora'
          AND fecha >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
    ")->fetch();

    responderOk([
        'por_tipo'  => $porTipo,
        'por_canal' => $porCanal,
        'por_mes'   => $porMes,
        'en_mora'   => $enMora,
    ]);
}