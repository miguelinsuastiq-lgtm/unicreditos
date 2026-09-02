<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Créditos de matrícula
// Solo créditos de matrícula — proceso real Uniautónoma
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
    // Estudiante — ver sus créditos
    $metodo === 'GET'  && $accion === 'mis_creditos'   => getMisCreditos($payload),
    // Estudiante — ver detalle de un crédito
    $metodo === 'GET'  && $accion === 'detalle'        => getDetalle($payload),
    // Estudiante — solicitar nuevo crédito
    $metodo === 'POST' && $accion === 'solicitar'      => solicitarCredito($payload),
    // Admin — ver todos los créditos
    $metodo === 'GET'  && $accion === 'todos'          => getTodos($payload),
    // Admin — actualizar estado de un crédito
    $metodo === 'PUT'  && $accion === 'actualizar'     => actualizarCredito($payload),
    // Admin — completar datos financieros (monto, cuotas, etc.)
    $metodo === 'PUT'  && $accion === 'completar'      => completarCredito($payload),
    default => responderError(400, 'Acción no válida.'),
};

// ─── GET: créditos del estudiante autenticado ─────────────────────────────────
function getMisCreditos(array $payload): void {
    requerirRol($payload, 'estudiante');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT
            id, codigo, tipo, periodo,
            monto, cuotas, valor_cuota, tasa_interes,
            fecha_solicitud, fecha_aprobacion, fecha_desembolso, fecha_vencimiento,
            fecha_evaluacion, estado, observacion
        FROM creditos
        WHERE estudiante_id = ?
        ORDER BY fecha_solicitud DESC
    ');
    $stmt->execute([$payload['id']]);
    $creditos = $stmt->fetchAll();

    responderOk(['creditos' => $creditos]);
}

// ─── GET: detalle de un crédito ───────────────────────────────────────────────
function getDetalle(array $payload): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de crédito requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT c.*,
               u.nombre AS estudiante_nombre,
               u.email  AS estudiante_email
        FROM creditos c
        JOIN usuarios u ON u.id = c.estudiante_id
        WHERE c.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $credito = $stmt->fetch();

    if (!$credito) responderError(404, 'Crédito no encontrado.');

    // Solo el propietario o admin puede ver el detalle
    requerirPropietarioOAdmin($payload, (int)$credito['estudiante_id']);

    responderOk(['credito' => $credito]);
}

// ─── POST: solicitar nuevo crédito de matrícula ───────────────────────────────
function solicitarCredito(array $payload): void {
    requerirRol($payload, 'estudiante');

    $body = obtenerBody();

    // Tipo de crédito — por ahora solo cambia la etiqueta, el proceso interno es
    // La Universidad solo gestiona Matrícula directamente — Brilla e ICETEX son
    // aliados externos: su propia evaluación, aprobación y desembolso, no del
    // crédito interno (ver "Funcionamiento de créditos internos y aliados").
    $tiposValidos = ['Matrícula', 'Brilla', 'ICETEX'];
    $tipo = in_array($body['tipo'] ?? '', $tiposValidos, true) ? $body['tipo'] : 'Matrícula';

    // Validar campos requeridos del deudor
    $requeridos = [
        'deudor_nombre','deudor_cc','deudor_programa','deudor_semestre',
        'deudor_jornada','deudor_direccion','deudor_telefono',
        'codeudor_nombre','codeudor_cc','codeudor_direccion',
        'codeudor_telefono','codeudor_ingreso',
    ];

    foreach ($requeridos as $campo) {
        if (empty($body[$campo])) {
            responderError(400, "El campo $campo es requerido.");
        }
    }

    // Validar ingreso mínimo codeudor (2 SMMLV 2026 ≈ $2,847,000)
    $smmlv2  = 2847000;
    $ingreso = (float)$body['codeudor_ingreso'];
    if ($ingreso < $smmlv2) {
        responderError(400, "El ingreso del codeudor debe ser mínimo 2 SMMLV ($" . number_format($smmlv2, 0, ',', '.') . ").");
    }

    // Verificar que no tenga un crédito activo en el mismo periodo
    $db      = getDB();
    $periodo = $body['periodo'] ?? date('Y') . '-2';
    $stmt    = $db->prepare('
        SELECT id FROM creditos
        WHERE estudiante_id = ? AND periodo = ? AND estado NOT IN ("Negado","Cerrado")
        LIMIT 1
    ');
    $stmt->execute([$payload['id'], $periodo]);
    if ($stmt->fetch()) {
        responderError(409, 'Ya tienes una solicitud de crédito activa para este periodo.');
    }

    // Generar código único
    $stmt  = $db->query('SELECT COUNT(*) as total FROM creditos');
    $total = $stmt->fetch()['total'] + 1;
    $codigo = 'CRED-' . date('Y') . '-' . str_pad($total, 3, '0', STR_PAD_LEFT);

    // Insertar solicitud
    $stmt = $db->prepare('
        INSERT INTO creditos (
            codigo, estudiante_id, tipo, periodo,
            deudor_nombre, deudor_cc, deudor_programa, deudor_semestre,
            deudor_jornada, deudor_direccion, deudor_telefono,
            deudor_dir_oficina, deudor_tel_oficina,
            codeudor_nombre, codeudor_cc, codeudor_direccion,
            codeudor_telefono, codeudor_dir_oficina, codeudor_tel_oficina,
            codeudor_ingreso, estado
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, "Pendiente"
        )
    ');
    $stmt->execute([
        $codigo, $payload['id'], $tipo, $periodo,
        $body['deudor_nombre'], $body['deudor_cc'], $body['deudor_programa'],
        $body['deudor_semestre'], $body['deudor_jornada'],
        $body['deudor_direccion'], $body['deudor_telefono'],
        $body['deudor_dir_oficina'] ?? null, $body['deudor_tel_oficina'] ?? null,
        $body['codeudor_nombre'], $body['codeudor_cc'], $body['codeudor_direccion'],
        $body['codeudor_telefono'], $body['codeudor_dir_oficina'] ?? null,
        $body['codeudor_tel_oficina'] ?? null, $ingreso,
    ]);

    $creditoId = $db->lastInsertId();

    registrarLog(
        $payload['id'],
        'SOLICITUD_CREDITO',
        'creditos',
        "Solicitud de crédito $codigo creada",
        ['credito_id' => $creditoId, 'periodo' => $periodo]
    );

    notificarAdmins(
        'nueva_solicitud_credito', 'Nueva solicitud de crédito',
        "{$body['deudor_nombre']} solicitó un crédito de $tipo — código $codigo.",
        '/creditos'
    );

    responderOk([
        'message'    => 'Solicitud enviada correctamente. Recuerda subir los documentos requeridos.',
        'credito_id' => $creditoId,
        'codigo'     => $codigo,
    ], 201);
}

// ─── GET: todos los créditos (solo admin) ─────────────────────────────────────
function getTodos(array $payload): void {
    requerirRol($payload, 'admin');

    $estado   = $_GET['estado']   ?? '';
    $periodo  = $_GET['periodo']  ?? '';
    $buscar   = $_GET['buscar']   ?? '';
    $desde    = $_GET['desde']    ?? '';
    $hasta    = $_GET['hasta']    ?? '';
    $semestre = $_GET['semestre'] ?? '';

    $where  = ['1=1'];
    $params = [];

    if ($estado) {
        $where[]  = 'c.estado = ?';
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
        $where[]  = 'c.fecha_solicitud >= ?';
        $params[] = $desde . ' 00:00:00';
    }
    if ($hasta) {
        $where[]  = 'c.fecha_solicitud <= ?';
        $params[] = $hasta . ' 23:59:59';
    }
    if ($buscar) {
        $where[]  = '(u.nombre LIKE ? OR u.cc LIKE ? OR c.codigo LIKE ?)';
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            c.id, c.codigo, c.tipo, c.periodo, c.estado,
            c.monto, c.cuotas, c.valor_cuota,
            c.fecha_solicitud, c.fecha_aprobacion,
            c.deudor_nombre, c.deudor_programa, c.deudor_semestre,
            c.codeudor_nombre, c.observacion,
            c.fecha_evaluacion, ev.nombre AS evaluado_por_nombre,
            u.id AS estudiante_id, u.nombre AS estudiante_nombre,
            u.cc AS estudiante_cc, u.email AS estudiante_email,
            -- Documentos aprobados vs requeridos
            (SELECT COUNT(*) FROM documentos d WHERE d.credito_id = c.id) AS docs_total,
            (SELECT COUNT(*) FROM documentos d WHERE d.credito_id = c.id AND d.estado = 'Aprobado') AS docs_aprobados
        FROM creditos c
        JOIN usuarios u ON u.id = c.estudiante_id
        LEFT JOIN usuarios ev ON ev.id = c.evaluado_por
        WHERE $whereStr
        ORDER BY c.fecha_solicitud DESC
    ");
    $stmt->execute($params);
    $creditos = $stmt->fetchAll();

    // Totales para el dashboard admin
    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(estado IN ('Pendiente','En validación','En estudio','Devuelta')) AS por_revisar,
            SUM(estado IN ('Aprobado','Activo')) AS aprobados,
            SUM(estado = 'En mora') AS en_mora,
            SUM(CASE WHEN estado IN ('Aprobado','Activo') THEN monto ELSE 0 END) AS monto_total
        FROM creditos
    ")->fetch();

    responderOk([
        'creditos' => $creditos,
        'totales'  => $totales,
    ]);
}

// ─── PUT: actualizar estado (solo admin) ──────────────────────────────────────
function actualizarCredito(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['id'] ?? 0);

    if (!$id) responderError(400, 'ID de crédito requerido.');

    $estadosValidos = [
        'Pendiente','En validación','Devuelta','En estudio','Remitido a aliado',
        'Aprobado','Activo','Negado','En mora','Cerrado',
    ];

    $nuevoEstado = $body['estado'] ?? '';
    if (!in_array($nuevoEstado, $estadosValidos, true)) {
        responderError(400, 'Estado no válido.');
    }

    $db = getDB();

    $stmtInfo = $db->prepare('SELECT estudiante_id, codigo, tipo FROM creditos WHERE id = ?');
    $stmtInfo->execute([$id]);
    $credInfo = $stmtInfo->fetch();

    // Cada cambio de estado ES la decisión de evaluación (Art. 5 del flujo:
    // Solicitud → Recepción → Evaluación → Determinación de alternativa) — se
    // deja constancia de quién decidió y cuándo, como evidencia institucional.
    $stmt = $db->prepare('
        UPDATE creditos
        SET estado = ?, observacion = ?, creado_por = ?, evaluado_por = ?, fecha_evaluacion = NOW(), updated_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([
        $nuevoEstado,
        $body['observacion'] ?? null,
        $payload['id'],
        $payload['id'],
        $id,
    ]);

    if ($stmt->rowCount() === 0) {
        responderError(404, 'Crédito no encontrado.');
    }

    if ($credInfo) {
        $obsTexto = !empty($body['observacion']) ? " Nota: {$body['observacion']}" : '';
        $esAliado = in_array($credInfo['tipo'], ['Brilla', 'ICETEX'], true);

        // Mensaje distinto cuando se remite a un aliado externo — el estudiante
        // debe entender que de aquí en adelante el trámite y la aprobación son
        // responsabilidad del aliado, no de la Universidad (Sección 8 del
        // documento: "evitar presentar una financiación externa como si fuera
        // un crédito interno de la Universidad").
        if ($nuevoEstado === 'Remitido a aliado') {
            $nombreAliado = $esAliado ? $credInfo['tipo'] : 'Brilla o ICETEX';
            $mensaje = "Tu solicitud {$credInfo['codigo']} fue evaluada. La Universidad determinó que debes continuar el trámite directamente con $nombreAliado — ellos realizan su propia evaluación, aprobación y desembolso.$obsTexto";
        } else {
            $mensaje = "Tu crédito {$credInfo['codigo']} ahora está en estado: $nuevoEstado.$obsTexto";
        }

        notificarEstudiante(
            (int)$credInfo['estudiante_id'], 'credito_actualizado', 'Tu crédito cambió de estado',
            $mensaje,
            '/creditos'
        );
    }

    registrarLog(
        $payload['id'],
        'ACTUALIZACION_CREDITO',
        'creditos',
        "Crédito ID $id actualizado a estado: $nuevoEstado",
        ['credito_id' => $id, 'estado' => $nuevoEstado]
    );

    responderOk(['message' => 'Crédito actualizado correctamente.']);
}

// ─── PUT: completar datos financieros (solo admin) ────────────────────────────
// El Dpto. Financiero completa monto, cuotas, tasas — no el estudiante
function completarCredito(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['id'] ?? 0);

    if (!$id) responderError(400, 'ID de crédito requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        UPDATE creditos SET
            monto             = ?,
            cuotas            = ?,
            valor_cuota       = ?,
            tasa_interes      = ?,
            fecha_aprobacion  = ?,
            fecha_desembolso  = ?,
            fecha_vencimiento = ?,
            updated_at        = NOW()
        WHERE id = ?
    ');
    $stmt->execute([
        $body['monto']             ?? null,
        $body['cuotas']            ?? null,
        $body['valor_cuota']       ?? null,
        $body['tasa_interes']      ?? null,
        $body['fecha_aprobacion']  ?? null,
        $body['fecha_desembolso']  ?? null,
        $body['fecha_vencimiento'] ?? null,
        $id,
    ]);

    registrarLog(
        $payload['id'],
        'COMPLETAR_CREDITO',
        'creditos',
        "Datos financieros completados para crédito ID $id",
        ['credito_id' => $id, 'monto' => $body['monto'] ?? null]
    );

    responderOk(['message' => 'Datos financieros del crédito actualizados.']);
}