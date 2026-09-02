<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Pagarés digitales
// NO AUTENTICAR — Ley 527/1999 firma electrónica
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
    $metodo === 'GET'  && $accion === 'mis_pagares'  => getMisPagares($payload),
    $metodo === 'GET'  && $accion === 'todos'        => getTodos($payload),
    $metodo === 'GET'  && $accion === 'detalle'      => getDetalle($payload),
    $metodo === 'POST' && $accion === 'solicitar_2fa'=> solicitar2FA($payload),
    $metodo === 'POST' && $accion === 'firmar'       => firmarPagare($payload),
    $metodo === 'POST' && $accion === 'generar'      => generarPagare($payload),
    default => responderError(400, 'Acción no válida.'),
};

// ─── GET: pagarés del estudiante ──────────────────────────────────────────────
function getMisPagares(array $payload): void {
    requerirRol($payload, 'estudiante');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT
            p.id, p.numero, p.monto,
            p.fecha_emision, p.fecha_vencimiento,
            p.firmado, p.fecha_firma, p.estado,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo
        FROM pagares p
        JOIN creditos c ON c.id = p.credito_id
        WHERE p.estudiante_id = ?
        ORDER BY p.fecha_emision DESC
    ');
    $stmt->execute([$payload['id']]);
    $pagares = $stmt->fetchAll();

    responderOk(['pagares' => $pagares]);
}

// ─── GET: todos los pagarés (solo admin) ──────────────────────────────────────
function getTodos(array $payload): void {
    requerirRol($payload, 'admin');

    $estado   = $_GET['estado']   ?? '';
    $buscar   = $_GET['buscar']   ?? '';
    $firmado  = $_GET['firmado']  ?? '';
    $desde    = $_GET['desde']    ?? '';
    $hasta    = $_GET['hasta']    ?? '';
    $semestre = $_GET['semestre'] ?? '';

    $where  = ['1=1'];
    $params = [];

    if ($estado) {
        $where[]  = 'p.estado = ?';
        $params[] = $estado;
    }
    if ($firmado !== '') {
        $where[]  = 'p.firmado = ?';
        $params[] = (int)$firmado;
    }
    if ($semestre) {
        $where[]  = 'c.deudor_semestre = ?';
        $params[] = (int)$semestre;
    }
    if ($desde) {
        $where[]  = 'p.fecha_emision >= ?';
        $params[] = $desde;
    }
    if ($hasta) {
        $where[]  = 'p.fecha_emision <= ?';
        $params[] = $hasta;
    }
    if ($buscar) {
        $where[]  = '(u.nombre LIKE ? OR u.cc LIKE ? OR p.numero LIKE ?)';
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            p.id, p.numero, p.monto,
            p.fecha_emision, p.fecha_vencimiento,
            p.firmado, p.fecha_firma, p.estado,
            c.codigo AS credito_codigo, c.tipo AS credito_tipo, c.periodo,
            u.id AS estudiante_id, u.nombre AS estudiante_nombre,
            u.cc AS estudiante_cc, u.email AS estudiante_email
        FROM pagares p
        JOIN creditos c ON c.id = p.credito_id
        JOIN usuarios u ON u.id = p.estudiante_id
        WHERE $whereStr
        ORDER BY p.fecha_emision DESC
    ");
    $stmt->execute($params);
    $pagares = $stmt->fetchAll();

    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(firmado = 0 AND estado = 'Pendiente firma') AS pendientes,
            SUM(firmado = 1 AND estado = 'Vigente') AS vigentes,
            SUM(estado = 'Vencido') AS vencidos,
            SUM(monto) AS monto_total
        FROM pagares
    ")->fetch();

    responderOk([
        'pagares' => $pagares,
        'totales' => $totales,
    ]);
}

// ─── GET: detalle de un pagaré ────────────────────────────────────────────────
function getDetalle(array $payload): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de pagaré requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT p.*, c.codigo AS credito_codigo, c.tipo AS credito_tipo,
               c.deudor_nombre, c.deudor_cc, c.codeudor_nombre, c.codeudor_cc,
               u.nombre AS estudiante_nombre, u.email AS estudiante_email
        FROM pagares p
        JOIN creditos c ON c.id = p.credito_id
        JOIN usuarios u ON u.id = p.estudiante_id
        WHERE p.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $pagare = $stmt->fetch();

    if (!$pagare) responderError(404, 'Pagaré no encontrado.');

    requerirPropietarioOAdmin($payload, (int)$pagare['estudiante_id']);

    responderOk(['pagare' => $pagare]);
}

// ─── POST: solicitar código 2FA para firmar ───────────────────────────────────
function solicitar2FA(array $payload): void {
    requerirRol($payload, 'estudiante');

    $body = obtenerBody();
    $id   = (int)($body['pagare_id'] ?? 0);
    if (!$id) responderError(400, 'ID de pagaré requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT p.id, p.firmado, p.estado, u.email, u.nombre
        FROM pagares p
        JOIN usuarios u ON u.id = p.estudiante_id
        WHERE p.id = ? AND p.estudiante_id = ?
        LIMIT 1
    ');
    $stmt->execute([$id, $payload['id']]);
    $pagare = $stmt->fetch();

    if (!$pagare) responderError(404, 'Pagaré no encontrado.');
    if ($pagare['firmado']) responderError(409, 'Este pagaré ya fue firmado.');

    // Generar OTP de 6 dígitos
    $otp        = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $otpHash    = hash('sha256', $otp);
    $expiracion = date('Y-m-d H:i:s', time() + 600); // 10 minutos

    // Guardar OTP hasheado en el pagaré
    $db->prepare('UPDATE pagares SET token_firma = ?, updated_at = NOW() WHERE id = ?')
       ->execute([$otpHash . '|' . $expiracion, $id]);

    // Enviar OTP por correo
    enviarCorreoFirma($pagare['email'], $pagare['nombre'], $otp);

    registrarLog(
        $payload['id'],
        'SOLICITUD_FIRMA_PAGARE',
        'pagares',
        "Código de firma solicitado para pagaré ID $id"
    );

    responderOk([
        'message' => "Código de verificación enviado a {$pagare['email']}. Válido por 10 minutos.",
    ]);
}

// ─── POST: firmar pagaré con OTP ─────────────────────────────────────────────
function firmarPagare(array $payload): void {
    requerirRol($payload, 'estudiante');

    $body  = obtenerBody();
    $id    = (int)($body['pagare_id'] ?? 0);
    $otp   = trim($body['codigo_otp'] ?? '');

    if (!$id || !$otp) responderError(400, 'ID de pagaré y código OTP requeridos.');
    if (strlen($otp) !== 6) responderError(400, 'El código debe tener 6 dígitos.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT p.id, p.firmado, p.token_firma, p.estado,
               u.email, u.nombre
        FROM pagares p
        JOIN usuarios u ON u.id = p.estudiante_id
        WHERE p.id = ? AND p.estudiante_id = ?
        LIMIT 1
    ');
    $stmt->execute([$id, $payload['id']]);
    $pagare = $stmt->fetch();

    if (!$pagare) responderError(404, 'Pagaré no encontrado.');
    if ($pagare['firmado']) responderError(409, 'Este pagaré ya fue firmado.');
    if (!$pagare['token_firma']) responderError(400, 'Solicita primero el código de verificación.');

    // Parsear token almacenado: hash|expiracion
    [$hashAlmacenado, $expiracion] = explode('|', $pagare['token_firma']);

    // Verificar expiración
    if (strtotime($expiracion) < time()) {
        responderError(401, 'El código expiró. Solicita uno nuevo.');
    }

    // Verificar OTP
    if (!hash_equals($hashAlmacenado, hash('sha256', $otp))) {
        registrarLog($payload['id'], 'FIRMA_OTP_FALLIDA', 'pagares', "Código OTP incorrecto para pagaré ID $id");
        responderError(401, 'Código de verificación incorrecto.');
    }

    // Firmar pagaré — registrar IP y fecha exacta (Ley 527/1999)
    $db->prepare('
        UPDATE pagares SET
            firmado     = 1,
            fecha_firma = NOW(),
            ip_firma    = ?,
            token_firma = NULL,
            estado      = "Vigente",
            updated_at  = NOW()
        WHERE id = ?
    ')->execute([
        $_SERVER['REMOTE_ADDR'] ?? null,
        $id,
    ]);

    registrarLog(
        $payload['id'],
        'FIRMA_PAGARE',
        'pagares',
        "Pagaré ID $id firmado digitalmente por {$pagare['email']}",
        [
            'pagare_id' => $id,
            'ip'        => $_SERVER['REMOTE_ADDR'] ?? null,
            'fecha'     => date('Y-m-d H:i:s'),
        ]
    );

    notificarAdmins(
        'pagare_firmado', 'Pagaré firmado',
        "{$pagare['nombre']} firmó su pagaré digitalmente. El crédito ya puede continuar el proceso de desembolso.",
        '/pagares'
    );

    responderOk([
        'message'    => 'Pagaré firmado correctamente. Recibirás una copia en tu correo institucional.',
        'firmado'    => true,
        'fecha_firma'=> date('Y-m-d H:i:s'),
    ]);
}

// ─── POST: generar pagaré (solo admin) ───────────────────────────────────────
function generarPagare(array $payload): void {
    requerirRol($payload, 'admin');

    $body      = obtenerBody();
    $creditoId = (int)($body['credito_id'] ?? 0);

    if (!$creditoId) responderError(400, 'ID de crédito requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT c.*, u.id AS uid, u.nombre, u.email
        FROM creditos c
        JOIN usuarios u ON u.id = c.estudiante_id
        WHERE c.id = ?
        LIMIT 1
    ');
    $stmt->execute([$creditoId]);
    $credito = $stmt->fetch();

    if (!$credito) responderError(404, 'Crédito no encontrado.');
    if (!$credito['monto']) responderError(400, 'El crédito no tiene monto asignado. Completa los datos financieros primero.');

    // Verificar que no exista ya un pagaré vigente para este crédito
    $stmtExiste = $db->prepare("
        SELECT id FROM pagares
        WHERE credito_id = ? AND estado NOT IN ('Anulado')
        LIMIT 1
    ");
    $stmtExiste->execute([$creditoId]);
    if ($stmtExiste->fetch()) {
        responderError(409, 'Ya existe un pagaré activo para este crédito.');
    }

    // Generar número único
    $stmt  = $db->query('SELECT COUNT(*) AS total FROM pagares');
    $total = $stmt->fetch()['total'] + 1;
    $numero = 'PAG-' . date('Y') . '-' . str_pad($total, 5, '0', STR_PAD_LEFT);

    // Fecha de emisión hoy, vencimiento según el crédito
    $fechaEmision    = date('Y-m-d');
    $fechaVencimiento = $body['fecha_vencimiento'] ?? $credito['fecha_vencimiento'] ?? date('Y-m-d', strtotime('+1 year'));

    $db->prepare('
        INSERT INTO pagares
            (numero, credito_id, estudiante_id, monto, fecha_emision, fecha_vencimiento, generado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $numero, $creditoId, $credito['uid'],
        $credito['monto'], $fechaEmision, $fechaVencimiento,
        $payload['id'],
    ]);

    $pagareId = $db->lastInsertId();

    registrarLog(
        $payload['id'],
        'GENERACION_PAGARE',
        'pagares',
        "Pagaré $numero generado para crédito ID $creditoId",
        ['pagare_id' => $pagareId, 'monto' => $credito['monto']]
    );

    notificarEstudiante(
        (int)$credito['uid'], 'pagare_generado', 'Tu pagaré está listo para firmar',
        "Se generó el pagaré $numero por " . number_format($credito['monto'], 0, ',', '.') . " pesos. Ingresa a Pagarés para firmarlo con el código que te llegará por correo.",
        '/pagares'
    );

    responderOk([
        'message'   => "Pagaré $numero generado. El estudiante debe firmarlo digitalmente.",
        'pagare_id' => $pagareId,
        'numero'    => $numero,
    ], 201);
}

// ─── Envío de correo firma ────────────────────────────────────────────────────
function enviarCorreoFirma(string $email, string $nombre, string $otp): void {
    $asunto  = 'UniCréditos — Código para firma de pagaré';
    $mensaje = "
        <html>
        <body style='font-family:Inter,sans-serif;color:#2c3e50;'>
          <div style='max-width:480px;margin:0 auto;padding:2rem;'>
            <div style='background:#1e3a5f;padding:1rem 1.5rem;border-radius:10px 10px 0 0;'>
              <h2 style='color:#c89b14;margin:0;'>UniCréditos</h2>
              <p style='color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:0.85rem;'>Corporación Universitaria Autónoma del Cauca</p>
            </div>
            <div style='background:#f3ede1;padding:1.5rem;border-radius:0 0 10px 10px;'>
              <p>Hola, <strong>$nombre</strong>.</p>
              <p>Has solicitado firmar digitalmente tu pagaré. Tu código de verificación es:</p>
              <div style='background:#e8740e;color:#fff;font-size:2rem;font-weight:700;letter-spacing:0.5rem;text-align:center;padding:1rem;border-radius:8px;margin:1rem 0;'>
                $otp
              </div>
              <p style='font-size:0.82rem;color:#6b7a8d;'>
                Este código expira en <strong>10 minutos</strong>.<br>
                Al firmar aceptas las condiciones del pagaré y su validez legal según la Ley 527 de 1999.<br>
                Recuerda: este documento es un <strong>PAGARÉ — NO AUTENTICAR</strong>.
              </p>
            </div>
          </div>
        </body>
        </html>
    ";

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=utf-8\r\n";
    $headers .= "From: UniCréditos <noreply@uniautonoma.edu.co>\r\n";

    mail($email, $asunto, $mensaje, $headers);
}