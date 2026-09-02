<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Solicitudes públicas (preinscripción desde la landing)
// "enviar" es la única acción pública — el resto requiere admin.
// Campos calcados del formato real "Solicitud de Crédito para
// Matrícula": datos de deudor y codeudor, sin montos ni fechas
// (esos los diligencia la institución, no el solicitante).
// ============================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../middleware/notificaciones_helper.php';
require_once __DIR__ . '/../lib/generador_pdfs.php';

aplicarCORS();

$metodo = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['accion'] ?? '';

match (true) {
    $metodo === 'POST' && $accion === 'enviar'            => enviarSolicitud(),
    $metodo === 'GET'  && $accion === 'listar'             => listarSolicitudes(),
    $metodo === 'PUT'  && $accion === 'actualizar_estado'  => actualizarEstado(),
    $metodo === 'GET'  && $accion === 'descargar_generado' => descargarDocumentoGenerado(),
    $metodo === 'GET'  && $accion === 'datos_codeudor'     => obtenerDatosCodeudor(),
    $metodo === 'POST' && $accion === 'firmar_codeudor'    => firmarCodeudor(),
    $metodo === 'POST' && $accion === 'convertir'          => convertirEnCredito(),
    $metodo === 'GET'  && $accion === 'documentos'         => listarDocumentosSolicitud(),
    $metodo === 'GET'  && $accion === 'descargar_documento_admin' => descargarDocumentoSolicitudAdmin(),
    default => responderError(400, 'Acción no válida.'),
};

// ─── Pública: enviar preinscripción desde la landing ──────────────────────────
// Brilla usa un formulario mucho más simple (sin codeudor ni firma digital) y
// llega como multipart/form-data porque incluye 3 fotos. Matrícula e ICETEX
// siguen el flujo completo de siempre, en JSON.
function enviarSolicitud(): void {
    $esMultipart = str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    $tipoCredito = $esMultipart ? ($_POST['tipo_credito'] ?? '') : (obtenerBody()['tipo_credito'] ?? '');

    if ($tipoCredito === 'Brilla') {
        enviarSolicitudBrilla();
    } else {
        enviarSolicitudMatricula();
    }
}

// ─── Brilla: solo datos del estudiante + recibo de matrícula, recibo de
// servicio con cupo Brilla, y cédula del titular de ese recibo. Sin codeudor,
// sin firma digital, sin generación de pagaré — Brilla evalúa y aprueba
// directamente sobre su propio cupo, la Universidad no interviene en eso. ────
function enviarSolicitudBrilla(): void {
    $requeridos = ['deudor_nombre', 'deudor_cc', 'deudor_email', 'deudor_telefono', 'deudor_direccion', 'deudor_programa', 'deudor_semestre', 'deudor_jornada'];
    foreach ($requeridos as $campo) {
        if (empty($_POST[$campo]) && $_POST[$campo] !== '0') {
            responderError(400, "Falta el campo obligatorio: $campo.");
        }
    }
    if (!filter_var($_POST['deudor_email'], FILTER_VALIDATE_EMAIL)) {
        responderError(400, 'El correo electrónico no es válido.');
    }
    $esPrimiparo = !isset($_POST['es_primiparo']) || $_POST['es_primiparo'] === '1' || $_POST['es_primiparo'] === 'true' ? 1 : 0;
    if (!$esPrimiparo && !str_ends_with(strtolower(trim($_POST['deudor_email'])), '@uniautonoma.edu.co')) {
        responderError(400, 'Como ya eres estudiante, debes usar tu correo institucional (@uniautonoma.edu.co).');
    }
    $semestre = intval($_POST['deudor_semestre']);
    if ($semestre < 1 || $semestre > 15) {
        responderError(400, 'El semestre no es válido.');
    }

    // Los 3 documentos son obligatorios — sin ellos Brilla no puede evaluar nada.
    $documentosEsperados = [
        'recibo_matricula'       => 'Recibo de matrícula (factura de las materias)',
        'recibo_servicio_brilla' => 'Recibo de servicio público con el cupo Brilla',
        'cedula_titular_recibo'  => 'Cédula del titular del recibo',
    ];
    foreach ($documentosEsperados as $campo => $nombreLegible) {
        if (!isset($_FILES[$campo]) || $_FILES[$campo]['error'] !== UPLOAD_ERR_OK) {
            responderError(400, "Falta adjuntar: $nombreLegible.");
        }
        if ($_FILES[$campo]['size'] > 5 * 1024 * 1024) {
            responderError(400, "$nombreLegible supera el límite de 5 MB.");
        }
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeReal = $finfo->file($_FILES[$campo]['tmp_name']);
        if (!in_array($mimeReal, ['image/jpeg', 'image/png', 'application/pdf'], true)) {
            responderError(400, "$nombreLegible debe ser una imagen (JPG/PNG) o PDF.");
        }
    }

    try {
        $db = getDB();
        $stmt = $db->prepare('
            INSERT INTO solicitudes_publicas (
                tipo_credito, es_primiparo,
                deudor_nombre, deudor_cc, deudor_email, deudor_telefono, deudor_direccion,
                deudor_programa, deudor_semestre, deudor_jornada, mensaje
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            'Brilla', $esPrimiparo,
            trim($_POST['deudor_nombre']), trim($_POST['deudor_cc']), trim($_POST['deudor_email']),
            trim($_POST['deudor_telefono']), trim($_POST['deudor_direccion']),
            trim($_POST['deudor_programa']), $semestre, trim($_POST['deudor_jornada']),
            isset($_POST['mensaje']) ? trim($_POST['mensaje']) : null,
        ]);
        $id = $db->lastInsertId();

        $dirDestino = __DIR__ . "/../uploads/solicitudes_publicas/$id";
        if (!is_dir($dirDestino)) mkdir($dirDestino, 0755, true);

        $stmtDoc = $db->prepare('INSERT INTO solicitud_documentos (solicitud_id, tipo, nombre_archivo, ruta_archivo) VALUES (?, ?, ?, ?)');
        foreach ($documentosEsperados as $campo => $nombreLegible) {
            $archivo = $_FILES[$campo];
            $ext = pathinfo($archivo['name'], PATHINFO_EXTENSION) ?: 'jpg';
            $nombreArchivo = "{$campo}_" . time() . ".$ext";
            $rutaDestino = "$dirDestino/$nombreArchivo";
            if (move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
                $stmtDoc->execute([$id, $campo, $archivo['name'], "uploads/solicitudes_publicas/$id/$nombreArchivo"]);
            }
        }

        registrarLog(null, 'SOLICITUD_PUBLICA_CREADA', 'solicitudes_publicas', "Nueva preinscripción Brilla #$id — {$_POST['deudor_nombre']}");

        notificarAdmins(
            'nueva_solicitud_publica', 'Nueva preinscripción Brilla',
            "{$_POST['deudor_nombre']} envió una preinscripción de crédito Brilla desde la página pública.",
            '/solicitudes'
        );

        responderOk([
            'id' => $id,
            'message' => 'Solicitud enviada correctamente. El Departamento Financiero la revisará y se pondrá en contacto contigo pronto.',
        ], 201);
    } catch (Throwable $e) {
        responderError(500, 'No se pudo registrar la solicitud. Intenta nuevamente.');
    }
}

// ─── Matrícula / ICETEX: flujo completo con codeudor y firma digital ──────────
function enviarSolicitudMatricula(): void {
    $body = obtenerBody();

    $requeridos = [
        'deudor_nombre', 'deudor_cc', 'deudor_email', 'deudor_telefono', 'deudor_direccion',
        'deudor_programa', 'deudor_semestre', 'deudor_jornada',
        'codeudor_nombre', 'codeudor_cc', 'codeudor_telefono', 'codeudor_direccion', 'codeudor_ingreso',
    ];
    foreach ($requeridos as $campo) {
        if (empty($body[$campo]) && $body[$campo] !== '0') {
            responderError(400, "Falta el campo obligatorio: $campo.");
        }
    }

    if (!filter_var($body['deudor_email'], FILTER_VALIDATE_EMAIL)) {
        responderError(400, 'El correo electrónico no es válido.');
    }

    // Si ya es estudiante (no primíparo), el correo del deudor debe ser el institucional
    // — ya lo tiene asignado. Los primíparos aún no tienen cuenta, así que se acepta cualquiera.
    $esPrimiparo = !isset($body['es_primiparo']) || $body['es_primiparo'] ? 1 : 0;
    if (!$esPrimiparo && !str_ends_with(strtolower(trim($body['deudor_email'])), '@uniautonoma.edu.co')) {
        responderError(400, 'Como ya eres estudiante, debes usar tu correo institucional (@uniautonoma.edu.co).');
    }

    $ingreso = floatval($body['codeudor_ingreso']);
    if ($ingreso <= 0) {
        responderError(400, 'El ingreso del codeudor debe ser un valor positivo.');
    }

    $semestre = intval($body['deudor_semestre']);
    if ($semestre < 1 || $semestre > 15) {
        responderError(400, 'El semestre no es válido.');
    }

    // Tipo de crédito — por ahora solo cambia la etiqueta, el proceso interno es
    // La Universidad solo gestiona Matrícula directamente — Brilla e ICETEX son
    // aliados externos: su propia evaluación, aprobación y desembolso, no del
    // crédito interno (ver "Funcionamiento de créditos internos y aliados").
    $tiposValidos = ['Matrícula', 'ICETEX'];
    $tipoCredito = in_array($body['tipo_credito'] ?? '', $tiposValidos, true) ? $body['tipo_credito'] : 'Matrícula';

    try {
        $db = getDB();
        $tokenCodeudor = bin2hex(random_bytes(20));
        $stmt = $db->prepare('
            INSERT INTO solicitudes_publicas (
                tipo_credito, es_primiparo,
                deudor_nombre, deudor_cc, deudor_email, deudor_telefono, deudor_direccion,
                deudor_programa, deudor_semestre, deudor_jornada,
                codeudor_nombre, codeudor_cc, codeudor_telefono, codeudor_direccion, codeudor_ingreso,
                mensaje, token_codeudor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $tipoCredito,
            $esPrimiparo,
            trim($body['deudor_nombre']),
            trim($body['deudor_cc']),
            trim($body['deudor_email']),
            trim($body['deudor_telefono']),
            trim($body['deudor_direccion']),
            trim($body['deudor_programa']),
            $semestre,
            trim($body['deudor_jornada']),
            trim($body['codeudor_nombre']),
            trim($body['codeudor_cc']),
            trim($body['codeudor_telefono']),
            trim($body['codeudor_direccion']),
            $ingreso,
            isset($body['mensaje']) ? trim($body['mensaje']) : null,
            $tokenCodeudor,
        ]);

        $id = $db->lastInsertId();
        registrarLog(null, 'SOLICITUD_PUBLICA_CREADA', 'solicitudes_publicas', "Nueva preinscripción #$id — {$body['deudor_nombre']}");

        // ─── Cero papel: si viene firma digital, genera los 3 documentos que
        // legalmente sí se pueden firmar sin notaría (la Carta de Instrucciones
        // requiere autenticación notarial por ley y no se genera aquí).
        $documentosGenerados = [];
        if (!empty($body['firma_deudor'])) {
            try {
                $documentosGenerados = generarDocumentosSolicitud($body, $body['firma_deudor'], (int)$id);
                $stmtDoc = $db->prepare('
                    INSERT INTO solicitud_documentos (solicitud_id, tipo, nombre_archivo, ruta_archivo)
                    VALUES (?, ?, ?, ?)
                ');
                foreach ($documentosGenerados as $tipo => $info) {
                    $stmtDoc->execute([$id, $tipo, $info['nombre'], $info['ruta']]);
                }
            } catch (Throwable $e) {
                // No se detiene la solicitud si falla la generación de PDFs —
                // la preinscripción ya quedó guardada, que es lo esencial.
                registrarLog(null, 'ERROR_GENERAR_PDF', 'solicitud_documentos', $e->getMessage());
            }
        }

        notificarAdmins(
            'nueva_solicitud_publica', 'Nueva preinscripción',
            "{$body['deudor_nombre']} envió una preinscripción de crédito $tipoCredito desde la página pública.",
            '/solicitudes'
        );

        responderOk([
            'id' => $id,
            'message' => 'Solicitud enviada correctamente. El Departamento Financiero se pondrá en contacto contigo pronto.',
            'documentos_generados' => array_keys($documentosGenerados),
            'token_codeudor' => $tokenCodeudor,
        ], 201);
    } catch (Throwable $e) {
        responderError(500, 'No se pudo registrar la solicitud. Intenta nuevamente.');
    }
}

// ─── Admin: listar solicitudes ────────────────────────────────────────────────
function listarSolicitudes(): void {
    $payload = requerirAuth();
    requerirRol($payload, 'admin');

    $estado   = $_GET['estado']   ?? '';
    $buscar   = $_GET['buscar']   ?? '';
    $desde    = $_GET['desde']    ?? '';
    $hasta    = $_GET['hasta']    ?? '';
    $semestre = $_GET['semestre'] ?? '';

    $where  = [];
    $params = [];

    if ($estado !== '') {
        $where[] = 'estado = ?';
        $params[] = $estado;
    }
    if ($semestre !== '') {
        $where[] = 'deudor_semestre = ?';
        $params[] = (int)$semestre;
    }
    if ($desde !== '') {
        $where[] = 'fecha_solicitud >= ?';
        $params[] = $desde . ' 00:00:00';
    }
    if ($hasta !== '') {
        $where[] = 'fecha_solicitud <= ?';
        $params[] = $hasta . ' 23:59:59';
    }
    if ($buscar !== '') {
        $where[] = '(deudor_nombre LIKE ? OR deudor_cc LIKE ? OR deudor_email LIKE ?)';
        $like = "%$buscar%";
        array_push($params, $like, $like, $like);
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM solicitudes_publicas $whereSql ORDER BY fecha_solicitud DESC");
    $stmt->execute($params);
    $solicitudes = $stmt->fetchAll();

    $totales = $db->query('
        SELECT
            COUNT(*) AS total,
            SUM(estado = "Nueva")       AS nuevas,
            SUM(estado = "Contactada")  AS contactadas,
            SUM(estado = "Descartada")  AS descartadas
        FROM solicitudes_publicas
    ')->fetch();

    responderOk(['solicitudes' => $solicitudes, 'totales' => $totales]);
}

// ─── Admin: marcar como Contactada / Descartada ───────────────────────────────
function actualizarEstado(): void {
    $payload = requerirAuth();
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id     = intval($body['id'] ?? 0);
    $estado = $body['estado'] ?? '';

    if (!$id || !in_array($estado, ['Nueva', 'Contactada', 'Descartada'], true)) {
        responderError(400, 'Datos inválidos.');
    }

    $db = getDB();
    $stmt = $db->prepare('UPDATE solicitudes_publicas SET estado = ?, revisado_por = ?, fecha_revision = NOW() WHERE id = ?');
    $stmt->execute([$estado, $payload['id'], $id]);

    if ($stmt->rowCount() === 0) {
        responderError(404, 'Solicitud no encontrada.');
    }

    registrarLog($payload['id'], 'SOLICITUD_PUBLICA_ACTUALIZADA', 'solicitudes_publicas', "Solicitud #$id marcada como $estado");
    responderOk(['message' => 'Estado actualizado.']);
}

// ─── Pública (con verificación mínima): descargar un documento generado ───────
// Como en este punto la persona todavía no tiene cuenta ni sesión, se verifica
// que el correo coincida con el de la solicitud antes de servir el archivo —
// evita que alguien adivine IDs consecutivos y descargue documentos ajenos.
function descargarDocumentoGenerado(): void {
    $solicitudId = (int)($_GET['solicitud_id'] ?? 0);
    $tipo        = $_GET['tipo'] ?? '';
    $email       = trim($_GET['email'] ?? '');

    if (!$solicitudId || !$tipo || !$email) {
        responderError(400, 'Faltan parámetros.');
    }

    $db = getDB();
    $stmt = $db->prepare('
        SELECT sd.nombre_archivo, sd.ruta_archivo
        FROM solicitud_documentos sd
        JOIN solicitudes_publicas sp ON sp.id = sd.solicitud_id
        WHERE sd.solicitud_id = ? AND sd.tipo = ? AND LOWER(sp.deudor_email) = LOWER(?)
        LIMIT 1
    ');
    $stmt->execute([$solicitudId, $tipo, $email]);
    $doc = $stmt->fetch();

    if (!$doc) {
        responderError(404, 'Documento no encontrado.');
    }

    $ruta = __DIR__ . '/../' . $doc['ruta_archivo'];
    if (!file_exists($ruta)) {
        responderError(404, 'Archivo no encontrado en el servidor.');
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $doc['nombre_archivo'] . '"');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}

// ─── Pública (por token): datos mínimos para que el codeudor sepa qué firma ───
// No expone todo el registro — solo lo necesario para dar contexto antes de
// pedirle la firma (nombre del estudiante, programa, y sus propios datos).
function obtenerDatosCodeudor(): void {
    $token = $_GET['token'] ?? '';
    if (!$token) responderError(400, 'Falta el token.');

    $db = getDB();
    $stmt = $db->prepare('
        SELECT deudor_nombre, deudor_programa, deudor_semestre, tipo_credito,
               codeudor_nombre, codeudor_cc, firmado_codeudor
        FROM solicitudes_publicas
        WHERE token_codeudor = ?
        LIMIT 1
    ');
    $stmt->execute([$token]);
    $sol = $stmt->fetch();

    if (!$sol) responderError(404, 'Enlace no válido o vencido.');

    responderOk(['solicitud' => $sol]);
}

// ─── Pública (por token): el codeudor firma y se regeneran los 3 documentos ──
function firmarCodeudor(): void {
    $body  = obtenerBody();
    $token = $body['token'] ?? '';
    $firma = $body['firma_codeudor'] ?? '';

    if (!$token || !$firma) responderError(400, 'Faltan datos para firmar.');

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM solicitudes_publicas WHERE token_codeudor = ? LIMIT 1');
    $stmt->execute([$token]);
    $sol = $stmt->fetch();

    if (!$sol) responderError(404, 'Enlace no válido o vencido.');
    if ((int)$sol['firmado_codeudor'] === 1) responderError(409, 'Este codeudor ya había firmado antes.');

    try {
        regenerarConFirmaCodeudor($sol, (int)$sol['id'], $firma);

        $upd = $db->prepare('UPDATE solicitudes_publicas SET firmado_codeudor = 1 WHERE id = ?');
        $upd->execute([$sol['id']]);

        registrarLog(null, 'CODEUDOR_FIRMO', 'solicitudes_publicas', "Codeudor firmó la solicitud #{$sol['id']}");

        notificarAdmins(
            'codeudor_firmo', 'Codeudor firmó',
            "{$sol['codeudor_nombre']} ya firmó como codeudor de {$sol['deudor_nombre']} — documentos completos.",
            '/solicitudes'
        );

        responderOk(['message' => 'Firma registrada. Los documentos ya quedaron completos.']);
    } catch (Throwable $e) {
        responderError(500, 'No se pudo procesar la firma. Intenta nuevamente.');
    }
}

// ─── Admin: convertir una preinscripción en cuenta + crédito real ─────────────
// Crea el usuario (o reutiliza uno ya existente con la misma cédula/correo,
// por si el admin ya lo había creado a mano antes de que existiera este botón),
// crea el crédito, y copia los documentos ya firmados durante la preinscripción
// hacia el módulo de Documentos, para que el estudiante los vea al iniciar sesión.
function convertirEnCredito(): void {
    $payload = requerirAuth();
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) responderError(400, 'ID de solicitud requerido.');

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM solicitudes_publicas WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $sol = $stmt->fetch();
    if (!$sol) responderError(404, 'Solicitud no encontrada.');

    try {
        $db->beginTransaction();

        // 1) Buscar si ya existe un usuario con esa cédula o correo (por si el
        //    admin ya lo había creado manualmente, como en este caso).
        $stmtU = $db->prepare('SELECT id, codigo FROM usuarios WHERE cc = ? OR email = ? LIMIT 1');
        $stmtU->execute([$sol['deudor_cc'], $sol['deudor_email']]);
        $usuario = $stmtU->fetch();

        $usuarioNuevo = !$usuario;
        $passwordTemporal = null;

        if ($usuario) {
            $usuarioId = (int)$usuario['id'];
            $codigoUsuario = $usuario['codigo'];
        } else {
            // Generar código institucional simple: año + consecutivo
            $totalUsuarios = (int)$db->query('SELECT COUNT(*) AS t FROM usuarios')->fetch()['t'];
            $codigoUsuario = date('Y') . '-' . str_pad((string)($totalUsuarios + 1), 4, '0', STR_PAD_LEFT);
            $passwordTemporal = bin2hex(random_bytes(4)); // se muestra UNA vez en la respuesta — no se guarda en texto plano

            $stmtCrear = $db->prepare('
                INSERT INTO usuarios (nombre, cc, codigo, email, password_hash, rol, estado, programa, semestre, jornada, telefono, direccion)
                VALUES (?, ?, ?, ?, ?, "estudiante", "Activo", ?, ?, ?, ?, ?)
            ');
            $stmtCrear->execute([
                $sol['deudor_nombre'], $sol['deudor_cc'], $codigoUsuario, $sol['deudor_email'],
                password_hash($passwordTemporal, PASSWORD_BCRYPT, ['cost' => 12]),
                $sol['deudor_programa'], $sol['deudor_semestre'], $sol['deudor_jornada'],
                $sol['deudor_telefono'], $sol['deudor_direccion'],
            ]);
            $usuarioId = (int)$db->lastInsertId();
        }

        // 2) Crear el crédito, con los mismos datos de deudor/codeudor de la solicitud
        $mesActual = (int)date('n');
        $periodo   = date('Y') . '-' . ($mesActual <= 6 ? '1' : '2');
        $totalCreditos = (int)$db->query('SELECT COUNT(*) AS t FROM creditos')->fetch()['t'];
        $codigoCredito = 'CRED-' . date('Y') . '-' . str_pad((string)($totalCreditos + 1), 3, '0', STR_PAD_LEFT);

        $stmtCred = $db->prepare('
            INSERT INTO creditos (
                codigo, estudiante_id, tipo, periodo,
                deudor_nombre, deudor_cc, deudor_programa, deudor_semestre, deudor_jornada, deudor_direccion, deudor_telefono,
                codeudor_nombre, codeudor_cc, codeudor_direccion, codeudor_telefono, codeudor_ingreso, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Pendiente")
        ');
        $stmtCred->execute([
            $codigoCredito, $usuarioId, $sol['tipo_credito'], $periodo,
            $sol['deudor_nombre'], $sol['deudor_cc'], $sol['deudor_programa'], $sol['deudor_semestre'], $sol['deudor_jornada'], $sol['deudor_direccion'], $sol['deudor_telefono'],
            $sol['codeudor_nombre'], $sol['codeudor_cc'], $sol['codeudor_direccion'], $sol['codeudor_telefono'], $sol['codeudor_ingreso'],
        ]);
        $creditoId = (int)$db->lastInsertId();

        // 3) Copiar los documentos ya generados y firmados durante la preinscripción
        $stmtDocs = $db->prepare('SELECT tipo, nombre_archivo, ruta_archivo FROM solicitud_documentos WHERE solicitud_id = ?');
        $stmtDocs->execute([$id]);
        $docsOrigen = $stmtDocs->fetchAll();

        $dirDestino = __DIR__ . "/../uploads/$creditoId/";
        if (!is_dir($dirDestino)) mkdir($dirDestino, 0755, true);

        $stmtInsertDoc = $db->prepare('
            INSERT INTO documentos (credito_id, estudiante_id, tipo, nombre_archivo, ruta_archivo, tamanio_bytes, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, "application/pdf")
        ');
        $documentosCopiados = 0;
        foreach ($docsOrigen as $doc) {
            $rutaOrigen = __DIR__ . '/../' . $doc['ruta_archivo'];
            if (!file_exists($rutaOrigen)) continue;

            $nombreArchivo = "{$doc['tipo']}_" . time() . ".pdf";
            $rutaDestino   = $dirDestino . $nombreArchivo;
            $rutaRelativa  = "uploads/$creditoId/$nombreArchivo";

            if (copy($rutaOrigen, $rutaDestino)) {
                $stmtInsertDoc->execute([$creditoId, $usuarioId, $doc['tipo'], $doc['nombre_archivo'], $rutaRelativa, filesize($rutaDestino)]);
                $documentosCopiados++;
            }
        }

        // 4) Marcar la solicitud como contactada
        $stmtEstado = $db->prepare('UPDATE solicitudes_publicas SET estado = "Contactada", revisado_por = ?, fecha_revision = NOW() WHERE id = ?');
        $stmtEstado->execute([$payload['id'], $id]);

        $db->commit();

        registrarLog($payload['id'], 'CONVERTIR_SOLICITUD', 'solicitudes_publicas', "Solicitud #$id convertida en crédito $codigoCredito (usuario #$usuarioId)");

        notificarEstudiante(
            $usuarioId, 'credito_creado', 'Tu crédito ya está registrado',
            "Tu crédito $codigoCredito ya está activo en la plataforma. Revisa el módulo de Documentos.",
            '/documentos'
        );

        // Si la cuenta se creó de cero, el estudiante todavía no tiene forma de
        // saber su código ni su contraseña — se le envían por correo real al
        // correo que puso en la solicitud, en vez de depender de que el admin
        // se los copie y comunique manualmente.
        if ($usuarioNuevo && $passwordTemporal) {
            $asuntoCred = 'UniCréditos — Tu cuenta ya está activa';
            $cuerpoCred = "
                <html><body style='font-family:Arial,sans-serif;background:#f3ede1;padding:2rem;'>
                  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:2rem;'>
                    <p style='color:#1e3a5f;font-weight:700;font-size:1.15rem;margin:0 0 1rem;'>¡Tu cuenta en UniCréditos ya está activa!</p>
                    <p style='color:#2c3e50;font-size:0.9rem;line-height:1.5;'>Hola " . htmlspecialchars($sol['deudor_nombre']) . ",</p>
                    <p style='color:#2c3e50;font-size:0.9rem;line-height:1.5;'>
                      El Departamento Financiero aprobó tu solicitud y tu crédito <strong>$codigoCredito</strong> ya está registrado.
                      Usa estos datos para iniciar sesión:
                    </p>
                    <div style='background:#f3ede1;border-radius:8px;padding:1rem 1.25rem;margin:1rem 0;'>
                      <p style='margin:0 0 6px;font-size:0.9rem;'>Código: <strong style='font-family:monospace;'>" . htmlspecialchars($codigoUsuario) . "</strong></p>
                      <p style='margin:0;font-size:0.9rem;'>Contraseña temporal: <strong style='font-family:monospace;'>" . htmlspecialchars($passwordTemporal) . "</strong></p>
                    </div>
                    <p style='color:#6b7a8d;font-size:0.78rem;line-height:1.5;'>
                      Por seguridad, te recomendamos cambiar esta contraseña apenas inicies sesión.
                      Si no reconoces esta solicitud, contacta al Departamento Financiero.
                    </p>
                    <p style='color:#6b7a8d;font-size:0.78rem;margin-top:1.5rem;'>Corporación Universitaria Autónoma del Cauca — UniCréditos</p>
                  </div>
                </body></html>
            ";
            enviarCorreoSMTP($sol['deudor_email'], $sol['deudor_nombre'], $asuntoCred, $cuerpoCred);
        }

        responderOk([
            'message' => "Cuenta y crédito creados correctamente ($codigoCredito).",
            'usuario_id' => $usuarioId,
            'usuario_nuevo' => $usuarioNuevo,
            'codigo_usuario' => $codigoUsuario,
            'password_temporal' => $passwordTemporal,
            'credito_id' => $creditoId,
            'codigo_credito' => $codigoCredito,
            'documentos_copiados' => $documentosCopiados,
        ], 201);
    } catch (Throwable $e) {
        $db->rollBack();
        responderError(500, 'No se pudo convertir la solicitud: ' . $e->getMessage());
    }
}

// ─── Admin: listar los documentos adjuntos de una solicitud (Brilla, etc.) ────
function listarDocumentosSolicitud(): void {
    $payload = requerirAuth();
    requerirRol($payload, 'admin');

    $solicitudId = (int)($_GET['solicitud_id'] ?? 0);
    if (!$solicitudId) responderError(400, 'ID de solicitud requerido.');

    $db = getDB();
    $stmt = $db->prepare('SELECT id, tipo, nombre_archivo, created_at FROM solicitud_documentos WHERE solicitud_id = ? ORDER BY created_at ASC');
    $stmt->execute([$solicitudId]);
    responderOk(['documentos' => $stmt->fetchAll()]);
}

// ─── Admin: descargar/ver un documento adjunto (con token en la URL, para
// que funcione con window.open directo igual que en otros módulos) ────────────
function descargarDocumentoSolicitudAdmin(): void {
    $payload = requerirAuth();
    requerirRol($payload, 'admin');

    $documentoId = (int)($_GET['documento_id'] ?? 0);
    if (!$documentoId) responderError(400, 'ID de documento requerido.');

    $db = getDB();
    $stmt = $db->prepare('SELECT nombre_archivo, ruta_archivo FROM solicitud_documentos WHERE id = ?');
    $stmt->execute([$documentoId]);
    $doc = $stmt->fetch();

    if (!$doc) responderError(404, 'Documento no encontrado.');

    $ruta = __DIR__ . '/../' . $doc['ruta_archivo'];
    if (!file_exists($ruta)) responderError(404, 'Archivo no encontrado en el servidor.');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    header('Content-Type: ' . $finfo->file($ruta));
    header('Content-Disposition: inline; filename="' . $doc['nombre_archivo'] . '"');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}