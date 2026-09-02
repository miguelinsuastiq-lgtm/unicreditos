<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Facturas y pagos de cuotas de matrícula
// ============================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../middleware/notificaciones_helper.php';

aplicarCORS();

$payload = requerirAuth();
$metodo  = $_SERVER['REQUEST_METHOD'];
$accion  = $_GET['accion'] ?? '';

match (true) {
    $metodo === 'GET'  && $accion === 'mis_facturas'  => getMisFacturas($payload),
    $metodo === 'GET'  && $accion === 'todas'         => getTodas($payload),
    $metodo === 'GET'  && $accion === 'detalle'       => getDetalle($payload),
    $metodo === 'POST' && $accion === 'pagar'         => registrarPago($payload),
    $metodo === 'POST' && $accion === 'reportar_pago' => reportarPago($payload),
    $metodo === 'GET'  && $accion === 'descargar_comprobante' => descargarComprobante($payload),
    $metodo === 'POST' && $accion === 'generar_cuotas'=> generarCuotas($payload),
    $metodo === 'PUT'  && $accion === 'marcar_vencida'=> marcarVencidas($payload),
    default => responderError(400, 'Acción no válida.'),
};

// ─── GET: facturas del estudiante ─────────────────────────────────────────────
function getMisFacturas(array $payload): void {
    requerirRol($payload, 'estudiante');

    $creditoId = (int)($_GET['credito_id'] ?? 0);
    $estado    = $_GET['estado'] ?? '';

    $where  = ['f.estudiante_id = ?'];
    $params = [$payload['id']];

    if ($creditoId) {
        $where[]  = 'f.credito_id = ?';
        $params[] = $creditoId;
    }
    if ($estado) {
        $where[]  = 'f.estado = ?';
        $params[] = $estado;
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            f.id, f.numero, f.concepto,
            f.numero_cuota, f.total_cuotas,
            f.monto, f.fecha_emision,
            f.fecha_vencimiento, f.fecha_pago,
            f.estado, f.metodo_pago, f.referencia_pago, f.comprobante_ruta,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo
        FROM facturas f
        JOIN creditos c ON c.id = f.credito_id
        WHERE $whereStr
        ORDER BY f.numero_cuota ASC
    ");
    $stmt->execute($params);
    $facturas = $stmt->fetchAll();

    // Resumen financiero
    $resumen = $db->prepare("
        SELECT
            SUM(monto) AS total_monto,
            SUM(CASE WHEN estado = 'Pagada'    THEN monto ELSE 0 END) AS total_pagado,
            SUM(CASE WHEN estado != 'Pagada'   THEN monto ELSE 0 END) AS total_pendiente,
            COUNT(CASE WHEN estado = 'Pagada'   THEN 1 END) AS cant_pagadas,
            COUNT(CASE WHEN estado = 'Vencida'  THEN 1 END) AS cant_vencidas,
            COUNT(CASE WHEN estado = 'Pendiente'THEN 1 END) AS cant_pendientes
        FROM facturas
        WHERE estudiante_id = ?
        " . ($creditoId ? ' AND credito_id = ?' : '')
    );
    $resumen->execute($creditoId ? [$payload['id'], $creditoId] : [$payload['id']]);

    responderOk([
        'facturas' => $facturas,
        'resumen'  => $resumen->fetch(),
    ]);
}

// ─── GET: todas las facturas (solo admin) ─────────────────────────────────────
function getTodas(array $payload): void {
    requerirRol($payload, 'admin');

    $estado   = $_GET['estado']   ?? '';
    $buscar   = $_GET['buscar']   ?? '';
    $periodo  = $_GET['periodo']  ?? '';
    $desde    = $_GET['desde']    ?? '';
    $hasta    = $_GET['hasta']    ?? '';
    $semestre = $_GET['semestre'] ?? '';

    $where  = ['1=1'];
    $params = [];

    if ($estado) {
        $where[]  = 'f.estado = ?';
        $params[] = $estado;
    }
    if ($periodo) {
        $where[]  = 'c.periodo = ?';
        $params[] = $periodo;
    }
    if ($semestre) {
        $where[]  = 'c.deudor_semestre = ?';
        $params[] = (int)$semestre;
    }
    if ($desde) {
        $where[]  = 'f.fecha_emision >= ?';
        $params[] = $desde . ' 00:00:00';
    }
    if ($hasta) {
        $where[]  = 'f.fecha_emision <= ?';
        $params[] = $hasta . ' 23:59:59';
    }
    if ($buscar) {
        $where[]  = '(u.nombre LIKE ? OR u.cc LIKE ? OR f.numero LIKE ? OR c.codigo LIKE ?)';
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            f.id, f.numero, f.concepto,
            f.numero_cuota, f.total_cuotas,
            f.monto, f.fecha_emision,
            f.fecha_vencimiento, f.fecha_pago,
            f.estado, f.metodo_pago, f.referencia_pago, f.comprobante_ruta,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo,
            u.id AS estudiante_id, u.nombre AS estudiante_nombre,
            u.cc AS estudiante_cc
        FROM facturas f
        JOIN creditos c ON c.id = f.credito_id
        JOIN usuarios u ON u.id = f.estudiante_id
        WHERE $whereStr
        ORDER BY f.fecha_vencimiento ASC
    ");
    $stmt->execute($params);
    $facturas = $stmt->fetchAll();

    // Totales globales
    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(estado = 'Pagada')      AS pagadas,
            SUM(estado = 'Pendiente')   AS pendientes,
            SUM(estado = 'Vencida')     AS vencidas,
            SUM(estado = 'En revisión') AS en_revision,
            SUM(CASE WHEN estado != 'Pagada' THEN monto ELSE 0 END) AS monto_por_cobrar
        FROM facturas
    ")->fetch();

    responderOk([
        'facturas' => $facturas,
        'totales'  => $totales,
    ]);
}

// ─── GET: detalle de una factura ──────────────────────────────────────────────
function getDetalle(array $payload): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de factura requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT f.*, c.estudiante_id,
               c.codigo AS credito_codigo, c.tipo AS credito_tipo,
               u.nombre AS estudiante_nombre, u.email AS estudiante_email
        FROM facturas f
        JOIN creditos c ON c.id = f.credito_id
        JOIN usuarios u ON u.id = f.estudiante_id
        WHERE f.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $factura = $stmt->fetch();

    if (!$factura) responderError(404, 'Factura no encontrada.');

    requerirPropietarioOAdmin($payload, (int)$factura['estudiante_id']);

    responderOk(['factura' => $factura]);
}

// ─── POST: registrar pago de una factura ──────────────────────────────────────
function registrarPago(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['factura_id'] ?? 0);

    if (!$id) responderError(400, 'ID de factura requerido.');

    $metodosValidos = ['PSE', 'Transferencia', 'Efectivo'];
    $metodo         = $body['metodo_pago'] ?? '';
    $referencia     = trim($body['referencia'] ?? '');

    if (!in_array($metodo, $metodosValidos, true)) {
        responderError(400, 'Método de pago no válido. Usa PSE, Transferencia o Efectivo.');
    }
    if (!$referencia) {
        responderError(400, 'Ingresa el número de referencia del pago.');
    }

    // Admin siempre puede registrar — estudiante solo sus propias facturas
    $db   = getDB();
    $stmt = $db->prepare('
        SELECT f.*, c.estudiante_id, c.id AS credito_id
        FROM facturas f
        JOIN creditos c ON c.id = f.credito_id
        WHERE f.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $factura = $stmt->fetch();

    if (!$factura) responderError(404, 'Factura no encontrada.');
    if ($factura['estado'] === 'Pagada') responderError(409, 'Esta factura ya fue pagada.');

    requerirPropietarioOAdmin($payload, (int)$factura['estudiante_id']);

    $db->beginTransaction();
    try {
        // Actualizar factura
        $db->prepare('
            UPDATE facturas SET
                estado          = "Pagada",
                fecha_pago      = NOW(),
                metodo_pago     = ?,
                referencia_pago = ?,
                registrado_por  = ?,
                updated_at      = NOW()
            WHERE id = ?
        ')->execute([$metodo, $referencia, $payload['id'], $id]);

        // Calcular saldo antes y después
        $stmtSaldo = $db->prepare('
            SELECT COALESCE(SUM(monto), 0) AS pagado
            FROM transacciones
            WHERE credito_id = ? AND tipo = "pago"
        ');
        $stmtSaldo->execute([$factura['credito_id']]);
        $pagado      = (float)$stmtSaldo->fetch()['pagado'];
        $creditoStmt = $db->prepare('SELECT monto FROM creditos WHERE id = ?');
        $creditoStmt->execute([$factura['credito_id']]);
        $montoTotal  = (float)$creditoStmt->fetch()['monto'];

        $saldoAntes   = $montoTotal - $pagado;
        $saldoDespues = $saldoAntes - $factura['monto'];

        // Registrar transacción
        $refTx = 'TX-' . strtoupper($metodo[0]) . '-' . date('YmdHis') . '-' . $id;
        $db->prepare('
            INSERT INTO transacciones
                (credito_id, estudiante_id, factura_id, tipo, descripcion,
                 monto, saldo_antes, saldo_despues, canal, referencia, registrado_por)
            VALUES (?, ?, ?, "pago", ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $factura['credito_id'], $factura['estudiante_id'], $id,
            "Pago cuota {$factura['numero_cuota']}/{$factura['total_cuotas']} — {$factura['numero']}",
            $factura['monto'], $saldoAntes, max(0, $saldoDespues),
            $metodo, $refTx, $payload['id'],
        ]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        responderError(500, 'Error al procesar el pago. Intenta nuevamente.');
    }

    registrarLog(
        $payload['id'],
        'PAGO_FACTURA',
        'facturas',
        "Pago registrado para factura {$factura['numero']} vía $metodo",
        ['factura_id' => $id, 'monto' => $factura['monto'], 'referencia' => $referencia]
    );

    responderOk([
        'message'    => 'Pago registrado correctamente.',
        'referencia' => $referencia,
        'fecha_pago' => date('Y-m-d H:i:s'),
    ]);
}

// ─── POST: generar cuotas de un crédito (solo admin) ─────────────────────────
function generarCuotas(array $payload): void {
    requerirRol($payload, 'admin');

    $body      = obtenerBody();
    $creditoId = (int)($body['credito_id'] ?? 0);

    if (!$creditoId) responderError(400, 'ID de crédito requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT c.*, u.id AS uid
        FROM creditos c
        JOIN usuarios u ON u.id = c.estudiante_id
        WHERE c.id = ?
        LIMIT 1
    ');
    $stmt->execute([$creditoId]);
    $credito = $stmt->fetch();

    if (!$credito) responderError(404, 'Crédito no encontrado.');
    if (!$credito['monto'] || !$credito['cuotas']) {
        responderError(400, 'El crédito necesita monto y número de cuotas para generar facturas.');
    }

    // Verificar que no existan facturas ya generadas
    $stmtExiste = $db->prepare('SELECT COUNT(*) AS total FROM facturas WHERE credito_id = ?');
    $stmtExiste->execute([$creditoId]);
    if ($stmtExiste->fetch()['total'] > 0) {
        responderError(409, 'Ya existen facturas generadas para este crédito.');
    }

    $cuotas      = (int)$credito['cuotas'];
    $valorCuota  = (float)$credito['valor_cuota'];
    $fechaInicio = $credito['fecha_desembolso'] ?? date('Y-m-d');
    $total       = $db->query('SELECT COUNT(*) AS t FROM facturas')->fetch()['t'];

    $db->beginTransaction();
    try {
        for ($i = 1; $i <= $cuotas; $i++) {
            $fechaVenc  = date('Y-m-d', strtotime("+$i month", strtotime($fechaInicio)));
            $numero     = 'FAC-' . date('Y') . '-' . str_pad($total + $i, 5, '0', STR_PAD_LEFT);
            $concepto   = "Cuota $i/$cuotas — Crédito matrícula {$credito['periodo']}";

            $db->prepare('
                INSERT INTO facturas
                    (numero, credito_id, estudiante_id, concepto,
                     numero_cuota, total_cuotas, monto,
                     fecha_emision, fecha_vencimiento)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            ')->execute([
                $numero, $creditoId, $credito['uid'],
                $concepto, $i, $cuotas, $valorCuota, $fechaVenc,
            ]);
        }

        // Registrar desembolso como transacción
        $db->prepare('
            INSERT INTO transacciones
                (credito_id, estudiante_id, tipo, descripcion,
                 monto, saldo_antes, saldo_despues, canal, referencia, registrado_por)
            VALUES (?, ?, "desembolso", ?, ?, 0, ?, "Sistema", ?, ?)
        ')->execute([
            $creditoId, $credito['uid'],
            "Desembolso inicial — Crédito matrícula {$credito['periodo']}",
            $credito['monto'], $credito['monto'],
            'DSB-' . date('YmdHis') . '-' . $creditoId,
            $payload['id'],
        ]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        responderError(500, 'Error al generar las cuotas. Intenta nuevamente.');
    }

    registrarLog(
        $payload['id'],
        'GENERACION_CUOTAS',
        'facturas',
        "$cuotas cuotas generadas para crédito ID $creditoId",
        ['credito_id' => $creditoId, 'cuotas' => $cuotas, 'valor_cuota' => $valorCuota]
    );

    responderOk([
        'message' => "$cuotas facturas generadas correctamente para el crédito.",
        'cuotas'  => $cuotas,
    ], 201);
}

// ─── PUT: marcar facturas vencidas automáticamente (solo admin/sistema) ───────
function marcarVencidas(array $payload): void {
    requerirRol($payload, 'admin');

    $db   = getDB();
    $stmt = $db->prepare("
        UPDATE facturas
        SET estado = 'Vencida', updated_at = NOW()
        WHERE estado = 'Pendiente' AND fecha_vencimiento < CURDATE()
    ");
    $stmt->execute();
    $afectadas = $stmt->rowCount();

    registrarLog(
        $payload['id'],
        'MARCAR_VENCIDAS',
        'facturas',
        "$afectadas facturas marcadas como vencidas"
    );

    responderOk([
        'message'   => "$afectadas factura(s) marcadas como vencidas.",
        'afectadas' => $afectadas,
    ]);
}

// ─── Estudiante: reporta un pago con comprobante — queda "En revisión" ────────
// No marca la factura como pagada directamente. Sin una pasarela de pagos real
// (PSE/Wompi con API propia) no hay forma de confirmar automáticamente que el
// banco recibió el dinero, así que el Departamento Financiero revisa el
// comprobante y confirma manualmente con "Registrar pago" — mismo modelo de
// confianza que ya se usa para revisar documentos.
function reportarPago(array $payload): void {
    requerirRol($payload, 'estudiante');

    $id         = (int)($_POST['factura_id'] ?? 0);
    $metodo     = $_POST['metodo_pago'] ?? '';
    $referencia = trim($_POST['referencia'] ?? '');

    if (!$id) responderError(400, 'ID de factura requerido.');

    $metodosValidos = ['PSE', 'Transferencia', 'Efectivo'];
    if (!in_array($metodo, $metodosValidos, true)) {
        responderError(400, 'Método de pago no válido.');
    }
    if (!$referencia) {
        responderError(400, 'Ingresa el número de referencia real de tu comprobante.');
    }
    if (empty($_FILES['comprobante']) || $_FILES['comprobante']['error'] !== UPLOAD_ERR_OK) {
        responderError(400, 'Adjunta una foto o captura de tu comprobante de pago.');
    }

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT f.*, c.estudiante_id, c.id AS credito_id
        FROM facturas f
        JOIN creditos c ON c.id = f.credito_id
        WHERE f.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $factura = $stmt->fetch();

    if (!$factura) responderError(404, 'Factura no encontrada.');
    if ($factura['estado'] === 'Pagada')     responderError(409, 'Esta factura ya fue pagada.');
    if ($factura['estado'] === 'En revisión') responderError(409, 'Ya reportaste un pago para esta factura — está pendiente de revisión.');
    if ((int)$factura['estudiante_id'] !== $payload['id']) {
        responderError(403, 'No puedes reportar el pago de una factura que no es tuya.');
    }

    // Validar el archivo — mismo patrón que la subida de documentos
    $archivo = $_FILES['comprobante'];
    if ($archivo['size'] > 5 * 1024 * 1024) {
        responderError(400, 'El comprobante supera el límite de 5 MB.');
    }
    $mimesPermitidos = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf',
    ];
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeReal = $finfo->file($archivo['tmp_name']);
    if (!array_key_exists($mimeReal, $mimesPermitidos)) {
        responderError(400, 'Solo se aceptan imágenes (JPG, PNG) o PDF.');
    }

    $dirDestino = __DIR__ . "/../uploads/comprobantes/{$factura['credito_id']}";
    if (!is_dir($dirDestino)) mkdir($dirDestino, 0755, true);

    $ext           = $mimesPermitidos[$mimeReal];
    $nombreArchivo = "comprobante_{$id}_" . time() . ".$ext";
    $rutaCompleta  = "$dirDestino/$nombreArchivo";
    $rutaRelativa  = "uploads/comprobantes/{$factura['credito_id']}/$nombreArchivo";

    if (!move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
        responderError(500, 'No se pudo guardar el comprobante. Intenta nuevamente.');
    }

    $db->prepare('
        UPDATE facturas SET
            estado           = "En revisión",
            metodo_pago      = ?,
            referencia_pago  = ?,
            comprobante_ruta = ?,
            registrado_por   = ?,
            updated_at       = NOW()
        WHERE id = ?
    ')->execute([$metodo, $referencia, $rutaRelativa, $payload['id'], $id]);

    registrarLog(
        $payload['id'], 'REPORTAR_PAGO', 'facturas',
        "Estudiante reportó pago de la factura {$factura['numero']} — pendiente de verificación",
        ['factura_id' => $id]
    );

    notificarAdmins(
        'pago_reportado', 'Nuevo comprobante de pago',
        "Se reportó un pago para la factura {$factura['numero']} — está pendiente de que lo verifiques.",
        '/facturacion'
    );

    responderOk(['message' => 'Tu comprobante fue enviado. El Departamento Financiero lo revisará y confirmará tu pago pronto.']);
}

// ─── Ver el comprobante subido (estudiante dueño o admin) ─────────────────────
function descargarComprobante(array $payload): void {
    $id = (int)($_GET['factura_id'] ?? 0);
    if (!$id) responderError(400, 'ID de factura requerido.');

    $db   = getDB();
    $stmt = $db->prepare('SELECT comprobante_ruta, estudiante_id, numero FROM facturas WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $factura = $stmt->fetch();

    if (!$factura || !$factura['comprobante_ruta']) responderError(404, 'No hay comprobante para esta factura.');
    requerirPropietarioOAdmin($payload, (int)$factura['estudiante_id']);

    $ruta = __DIR__ . '/../' . $factura['comprobante_ruta'];
    if (!file_exists($ruta)) responderError(404, 'Archivo no encontrado en el servidor.');

    $mime = mime_content_type($ruta);
    header("Content-Type: $mime");
    header('Content-Disposition: inline; filename="comprobante_' . $factura['numero'] . '"');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}