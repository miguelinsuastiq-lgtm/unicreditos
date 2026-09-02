<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Documentos del proceso de crédito
// 9 tipos requeridos — proceso real Uniautónoma del Cauca
// ============================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../middleware/notificaciones_helper.php';

aplicarCORS();

// ─── Tipos válidos — proceso real Uniautónoma ─────────────────────────────────
const TIPOS_VALIDOS = [
    'cedula_deudor',
    'cedula_codeudor',
    'ingresos_codeudor',
    'servicio_publico',
    'pago_datacredito',
    'autorizacion_datacredito',
    'solicitud_credito',
    'pagare',
    'carta_instrucciones',
    'recibo_matricula',
    'recibo_servicio_brilla',
    'cedula_titular_recibo',
];

// Extensiones y tipos MIME permitidos
const MIME_PERMITIDOS = [
    'application/pdf'  => 'pdf',
    'image/jpeg'       => 'jpg',
    'image/png'        => 'png',
    'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
];

const TAMANO_MAX = 5 * 1024 * 1024; // 5 MB


// ─── GET: documentos del estudiante por crédito ───────────────────────────────
function getMisDocumentos(array $payload): void {
    requerirRol($payload, 'estudiante');

    $creditoId = (int)($_GET['credito_id'] ?? 0);
    if (!$creditoId) responderError(400, 'ID de crédito requerido.');

    // Verificar que el crédito pertenece al estudiante
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM creditos WHERE id = ? AND estudiante_id = ?');
    $stmt->execute([$creditoId, $payload['id']]);
    if (!$stmt->fetch()) {
        responderError(403, 'No tienes acceso a este crédito.');
    }

    $stmt = $db->prepare('
        SELECT
            id, tipo, nombre_archivo, tamanio_bytes,
            estado, observacion, fecha_subida, fecha_revision
        FROM documentos
        WHERE credito_id = ? AND estudiante_id = ?
        ORDER BY fecha_subida DESC
    ');
    $stmt->execute([$creditoId, $payload['id']]);
    $documentos = $stmt->fetchAll();

    responderOk(['documentos' => $documentos]);
}

// ─── GET: todos los documentos (solo admin) ───────────────────────────────────
function getTodos(array $payload): void {
    requerirRol($payload, 'admin');

    $estado     = $_GET['estado']      ?? '';
    $tipo       = $_GET['tipo']        ?? '';
    $buscar     = $_GET['buscar']      ?? '';
    $creditoId  = (int)($_GET['credito_id'] ?? 0);
    $desde      = $_GET['desde']       ?? '';
    $hasta      = $_GET['hasta']       ?? '';
    $semestre   = $_GET['semestre']    ?? '';

    $where  = ['1=1'];
    $params = [];

    if ($estado) {
        $where[]  = 'd.estado = ?';
        $params[] = $estado;
    }
    if ($tipo && in_array($tipo, TIPOS_VALIDOS, true)) {
        $where[]  = 'd.tipo = ?';
        $params[] = $tipo;
    }
    if ($creditoId) {
        $where[]  = 'd.credito_id = ?';
        $params[] = $creditoId;
    }
    if ($semestre) {
        $where[]  = 'c.deudor_semestre = ?';
        $params[] = (int)$semestre;
    }
    if ($desde) {
        $where[]  = 'd.fecha_subida >= ?';
        $params[] = $desde . ' 00:00:00';
    }
    if ($hasta) {
        $where[]  = 'd.fecha_subida <= ?';
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
            d.id, d.tipo, d.nombre_archivo, d.tamanio_bytes,
            d.estado, d.observacion, d.fecha_subida, d.fecha_revision,
            c.codigo AS credito_codigo,
            u.id AS estudiante_id, u.nombre AS estudiante_nombre, u.cc AS estudiante_cc
        FROM documentos d
        JOIN creditos c ON c.id = d.credito_id
        JOIN usuarios u ON u.id = d.estudiante_id
        WHERE $whereStr
        ORDER BY d.fecha_subida DESC
    ");
    $stmt->execute($params);
    $documentos = $stmt->fetchAll();

    // Totales
    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(estado = 'En revisión') AS por_revisar,
            SUM(estado = 'Aprobado')    AS aprobados,
            SUM(estado = 'Rechazado')   AS rechazados
        FROM documentos
    ")->fetch();

    responderOk([
        'documentos' => $documentos,
        'totales'    => $totales,
    ]);
}

// ─── POST: subir documento ────────────────────────────────────────────────────
function subirDocumento(array $payload): void {
    requerirRol($payload, 'estudiante');

    $creditoId = (int)($_POST['credito_id'] ?? 0);
    $tipo      = $_POST['tipo'] ?? '';

    if (!$creditoId) responderError(400, 'ID de crédito requerido.');
    if (!in_array($tipo, TIPOS_VALIDOS, true)) {
        responderError(400, 'Tipo de documento no válido.');
    }

    // Verificar que el crédito pertenece al estudiante
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM creditos WHERE id = ? AND estudiante_id = ?');
    $stmt->execute([$creditoId, $payload['id']]);
    if (!$stmt->fetch()) {
        responderError(403, 'No tienes acceso a este crédito.');
    }

    // Validar archivo
    if (!isset($_FILES['archivo']) || $_FILES['archivo']['error'] !== UPLOAD_ERR_OK) {
        responderError(400, 'No se recibió ningún archivo o ocurrió un error en la subida.');
    }

    $archivo = $_FILES['archivo'];

    // Validar tamaño
    if ($archivo['size'] > TAMANO_MAX) {
        responderError(400, 'El archivo supera el límite de 5 MB.');
    }

    // Validar tipo MIME real (no confiar en la extensión)
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeReal = $finfo->file($archivo['tmp_name']);

    if (!array_key_exists($mimeReal, MIME_PERMITIDOS)) {
        responderError(400, 'Tipo de archivo no permitido. Solo PDF, JPG, PNG, DOC o DOCX.');
    }

    // Crear directorio de uploads si no existe
    $dirDestino = __DIR__ . "/../uploads/$creditoId/";
    if (!is_dir($dirDestino)) {
        mkdir($dirDestino, 0755, true);
    }

    // Nombre único para evitar colisiones
    $ext          = MIME_PERMITIDOS[$mimeReal];
    $nombreArchivo = "{$tipo}_" . time() . ".$ext";
    $rutaCompleta  = $dirDestino . $nombreArchivo;
    $rutaRelativa  = "uploads/$creditoId/$nombreArchivo";

    if (!move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
        responderError(500, 'Error al guardar el archivo. Intenta nuevamente.');
    }

    // Si ya existe un documento del mismo tipo, reemplazarlo
    $stmtExiste = $db->prepare('
        SELECT id, ruta_archivo FROM documentos
        WHERE credito_id = ? AND tipo = ?
    ');
    $stmtExiste->execute([$creditoId, $tipo]);
    $docExistente = $stmtExiste->fetch();

    if ($docExistente) {
        // Borrar archivo anterior si existe
        $rutaAnterior = __DIR__ . '/../' . $docExistente['ruta_archivo'];
        if (file_exists($rutaAnterior)) {
            unlink($rutaAnterior);
        }

        // Actualizar registro
        $stmt = $db->prepare('
            UPDATE documentos SET
                nombre_archivo = ?, ruta_archivo = ?,
                tamanio_bytes = ?, mime_type = ?,
                estado = "En revisión", observacion = NULL,
                revisado_por = NULL, fecha_revision = NULL,
                fecha_subida = NOW(), updated_at = NOW()
            WHERE id = ?
        ');
        $stmt->execute([
            $archivo['name'], $rutaRelativa,
            $archivo['size'], $mimeReal,
            $docExistente['id'],
        ]);
        $docId = $docExistente['id'];
    } else {
        // Insertar nuevo documento
        $stmt = $db->prepare('
            INSERT INTO documentos
                (credito_id, estudiante_id, tipo, nombre_archivo, ruta_archivo, tamanio_bytes, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $creditoId, $payload['id'], $tipo,
            $archivo['name'], $rutaRelativa,
            $archivo['size'], $mimeReal,
        ]);
        $docId = $db->lastInsertId();
    }

    registrarLog(
        $payload['id'],
        'SUBIDA_DOCUMENTO',
        'documentos',
        "Documento '$tipo' subido para crédito ID $creditoId",
        ['documento_id' => $docId, 'tipo' => $tipo]
    );

    $nombreTipo = str_replace('_', ' ', $tipo);
    notificarAdmins(
        'documento_subido', 'Nuevo documento por revisar',
        "El estudiante subió el documento \"$nombreTipo\" para el crédito #$creditoId. Está pendiente de revisión.",
        '/documentos'
    );

    responderOk([
        'message'      => 'Documento subido correctamente. Quedará en revisión.',
        'documento_id' => $docId,
    ], 201);
}

// ─── PUT: revisar documento (solo admin) ──────────────────────────────────────
function revisarDocumento(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['id'] ?? 0);

    if (!$id) responderError(400, 'ID de documento requerido.');

    $estadosValidos = ['En revisión', 'Aprobado', 'Rechazado'];
    $nuevoEstado    = $body['estado'] ?? '';

    if (!in_array($nuevoEstado, $estadosValidos, true)) {
        responderError(400, 'Estado no válido.');
    }

    if ($nuevoEstado === 'Rechazado' && empty($body['observacion'])) {
        responderError(400, 'Debes indicar el motivo del rechazo.');
    }

    $db = getDB();

    // Datos del documento antes de actualizar, para armar la notificación
    $stmtInfo = $db->prepare('SELECT estudiante_id, tipo FROM documentos WHERE id = ?');
    $stmtInfo->execute([$id]);
    $docInfo = $stmtInfo->fetch();

    $stmt = $db->prepare('
        UPDATE documentos SET
            estado = ?, observacion = ?,
            revisado_por = ?, fecha_revision = NOW(),
            updated_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([
        $nuevoEstado,
        $body['observacion'] ?? null,
        $payload['id'],
        $id,
    ]);

    if ($stmt->rowCount() === 0) {
        responderError(404, 'Documento no encontrado.');
    }

    if ($docInfo && $nuevoEstado !== 'En revisión') {
        $nombreTipo = str_replace('_', ' ', $docInfo['tipo']);
        if ($nuevoEstado === 'Aprobado') {
            notificarEstudiante(
                (int)$docInfo['estudiante_id'], 'documento_aprobado', 'Documento aprobado',
                "Tu documento \"$nombreTipo\" fue aprobado por el Departamento Financiero.",
                '/documentos'
            );
        } else {
            $motivo = $body['observacion'] ?? '';
            notificarEstudiante(
                (int)$docInfo['estudiante_id'], 'documento_rechazado', 'Documento rechazado',
                "Tu documento \"$nombreTipo\" fue rechazado. Motivo: $motivo",
                '/documentos'
            );
        }
    }

    registrarLog(
        $payload['id'],
        'REVISION_DOCUMENTO',
        'documentos',
        "Documento ID $id marcado como: $nuevoEstado",
        ['documento_id' => $id, 'estado' => $nuevoEstado]
    );

    responderOk(['message' => "Documento marcado como $nuevoEstado."]);
}

// ─── GET: descargar documento ─────────────────────────────────────────────────
function descargarDocumento(array $payload): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de documento requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT d.*, c.estudiante_id
        FROM documentos d
        JOIN creditos c ON c.id = d.credito_id
        WHERE d.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if (!$doc) responderError(404, 'Documento no encontrado.');

    // Solo el propietario o admin puede descargar
    requerirPropietarioOAdmin($payload, (int)$doc['estudiante_id']);

    $ruta = __DIR__ . '/../' . $doc['ruta_archivo'];
    if (!file_exists($ruta)) {
        responderError(404, 'Archivo no encontrado en el servidor.');
    }

    // Servir el archivo
    header('Content-Type: ' . $doc['mime_type']);
    header('Content-Disposition: attachment; filename="' . $doc['nombre_archivo'] . '"');
    header('Content-Length: ' . filesize($ruta));
    readfile($ruta);
    exit;
}

// ─── Enrutamiento ──────────────────────────────────────────────────────────────
// Va al final del archivo a propósito: en PHP las funciones se "elevan" (hoisting)
// y están disponibles en cualquier parte del archivo, pero las const de nivel de
// archivo NO — se ejecutan en el orden en que aparecen. Si este bloque llamara a
// las funciones antes de que el archivo llegue a declarar TIPOS_VALIDOS/MIME_PERMITIDOS/
// TAMANO_MAX más arriba, esas constantes todavía no existirían → error fatal.
$payload = requerirAuth();
$metodo  = $_SERVER['REQUEST_METHOD'];
$accion  = $_GET['accion'] ?? '';

match (true) {
    $metodo === 'GET'  && $accion === 'mis_documentos' => getMisDocumentos($payload),
    $metodo === 'GET'  && $accion === 'todos'          => getTodos($payload),
    $metodo === 'POST' && $accion === 'subir'          => subirDocumento($payload),
    $metodo === 'PUT'  && $accion === 'revisar'        => revisarDocumento($payload),
    $metodo === 'GET'  && $accion === 'descargar'      => descargarDocumento($payload),
    default => responderError(400, 'Acción no válida.'),
};