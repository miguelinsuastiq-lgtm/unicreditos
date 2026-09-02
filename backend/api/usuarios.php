<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Usuarios — gestión de estudiantes y administradores
// Solo accesible para rol admin (excepto perfil propio)
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
    $metodo === 'GET'    && $accion === 'todos'         => getTodos($payload),
    $metodo === 'GET'    && $accion === 'perfil'        => getPerfil($payload),
    $metodo === 'GET'    && $accion === 'detalle'       => getDetalle($payload),
    $metodo === 'POST'   && $accion === 'crear'         => crearUsuario($payload),
    $metodo === 'PUT'    && $accion === 'actualizar'    => actualizarUsuario($payload),
    $metodo === 'PUT'    && $accion === 'cambiar_estado'=> cambiarEstado($payload),
    $metodo === 'PUT'    && $accion === 'cambiar_pass'  => cambiarPassword($payload),
    $metodo === 'DELETE' && $accion === 'eliminar'      => eliminarUsuario($payload),
    default => responderError(400, 'Acción no válida.'),
};

// ─── GET: todos los usuarios (solo admin) ─────────────────────────────────────
function getTodos(array $payload): void {
    requerirRol($payload, 'admin');

    $rol      = $_GET['rol']      ?? '';
    $estado   = $_GET['estado']   ?? '';
    $buscar   = $_GET['buscar']   ?? '';
    $desde    = $_GET['desde']    ?? '';
    $hasta    = $_GET['hasta']    ?? '';
    $semestre = $_GET['semestre'] ?? '';

    $where  = ['1=1'];
    $params = [];

    if ($rol && in_array($rol, ['estudiante','admin'], true)) {
        $where[]  = 'rol = ?';
        $params[] = $rol;
    }
    if ($estado && in_array($estado, ['Activo','Inactivo'], true)) {
        $where[]  = 'estado = ?';
        $params[] = $estado;
    }
    if ($semestre) {
        $where[]  = 'semestre = ?';
        $params[] = (int)$semestre;
    }
    if ($desde) {
        $where[]  = 'fecha_registro >= ?';
        $params[] = $desde . ' 00:00:00';
    }
    if ($hasta) {
        $where[]  = 'fecha_registro <= ?';
        $params[] = $hasta . ' 23:59:59';
    }
    if ($buscar) {
        $where[]  = '(nombre LIKE ? OR cc LIKE ? OR codigo LIKE ? OR email LIKE ?)';
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
        $params[] = "%$buscar%";
    }

    $whereStr = implode(' AND ', $where);
    $db       = getDB();
    $stmt     = $db->prepare("
        SELECT
            u.id, u.nombre, u.cc, u.codigo, u.email,
            u.rol, u.estado, u.programa, u.semestre,
            u.jornada, u.telefono, u.fecha_registro, u.ultimo_login,
            -- Créditos activos del estudiante
            (SELECT COUNT(*) FROM creditos c
             WHERE c.estudiante_id = u.id
             AND c.estado IN ('Activo','Aprobado')) AS creditos_activos
        FROM usuarios u
        WHERE $whereStr
        ORDER BY u.fecha_registro DESC
    ");
    $stmt->execute($params);
    $usuarios = $stmt->fetchAll();

    // Totales
    $totales = $db->query("
        SELECT
            COUNT(*) AS total,
            SUM(rol = 'estudiante') AS estudiantes,
            SUM(rol = 'admin')      AS admins,
            SUM(estado = 'Activo')  AS activos,
            SUM(estado = 'Inactivo')AS inactivos
        FROM usuarios
    ")->fetch();

    responderOk([
        'usuarios' => $usuarios,
        'totales'  => $totales,
    ]);
}

// ─── GET: perfil del usuario autenticado ──────────────────────────────────────
function getPerfil(array $payload): void {
    $db   = getDB();
    $stmt = $db->prepare('
        SELECT
            id, nombre, cc, codigo, email, rol, estado,
            programa, semestre, jornada, telefono,
            fecha_registro, ultimo_login
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    ');
    $stmt->execute([$payload['id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) responderError(404, 'Usuario no encontrado.');

    responderOk(['usuario' => $usuario]);
}

// ─── GET: detalle de un usuario (solo admin) ──────────────────────────────────
function getDetalle(array $payload): void {
    requerirRol($payload, 'admin');

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de usuario requerido.');

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT
            u.id, u.nombre, u.cc, u.codigo, u.email,
            u.rol, u.estado, u.programa, u.semestre,
            u.jornada, u.telefono, u.direccion,
            u.fecha_registro, u.ultimo_login
        FROM usuarios u
        WHERE u.id = ?
        LIMIT 1
    ');
    $stmt->execute([$id]);
    $usuario = $stmt->fetch();

    if (!$usuario) responderError(404, 'Usuario no encontrado.');

    // Historial de créditos si es estudiante
    $creditos = [];
    if ($usuario['rol'] === 'estudiante') {
        $stmtC = $db->prepare('
            SELECT id, codigo, tipo, periodo, monto, estado, fecha_solicitud
            FROM creditos
            WHERE estudiante_id = ?
            ORDER BY fecha_solicitud DESC
        ');
        $stmtC->execute([$id]);
        $creditos = $stmtC->fetchAll();
    }

    responderOk([
        'usuario'  => $usuario,
        'creditos' => $creditos,
    ]);
}

// ─── POST: crear usuario (solo admin) ─────────────────────────────────────────
function crearUsuario(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();

    // Validar campos requeridos
    $requeridos = ['nombre','cc','codigo','email','password','rol'];
    foreach ($requeridos as $campo) {
        if (empty($body[$campo])) {
            responderError(400, "El campo '$campo' es requerido.");
        }
    }

    if (!in_array($body['rol'], ['estudiante','admin'], true)) {
        responderError(400, 'Rol no válido. Usa estudiante o admin.');
    }

    if (strlen($body['password']) < 8) {
        responderError(400, 'La contraseña debe tener mínimo 8 caracteres.');
    }

    $db = getDB();

    // Verificar unicidad de cc, codigo y email
    $stmt = $db->prepare('
        SELECT id FROM usuarios
        WHERE cc = ? OR codigo = ? OR email = ?
        LIMIT 1
    ');
    $stmt->execute([$body['cc'], $body['codigo'], $body['email']]);
    if ($stmt->fetch()) {
        responderError(409, 'Ya existe un usuario con esa cédula, código o correo.');
    }

    $stmt = $db->prepare('
        INSERT INTO usuarios
            (nombre, cc, codigo, email, password_hash, rol, estado,
             programa, semestre, jornada, telefono, direccion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $body['nombre'],
        $body['cc'],
        $body['codigo'],
        $body['email'],
        password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]),
        $body['rol'],
        $body['estado'] ?? 'Activo',
        $body['programa']  ?? null,
        $body['semestre']  ?? null,
        $body['jornada']   ?? null,
        $body['telefono']  ?? null,
        $body['direccion'] ?? null,
    ]);

    $nuevoId = $db->lastInsertId();

    registrarLog(
        $payload['id'],
        'CREAR_USUARIO',
        'usuarios',
        "Usuario '{$body['nombre']}' ({$body['rol']}) creado",
        ['usuario_id' => $nuevoId, 'rol' => $body['rol']]
    );

    responderOk([
        'message'    => 'Usuario creado correctamente.',
        'usuario_id' => $nuevoId,
    ], 201);
}

// ─── PUT: actualizar datos de un usuario (solo admin) ─────────────────────────
function actualizarUsuario(array $payload): void {
    requerirRol($payload, 'admin');

    $body = obtenerBody();
    $id   = (int)($body['id'] ?? 0);
    if (!$id) responderError(400, 'ID de usuario requerido.');

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, rol, nombre, email FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $usuario = $stmt->fetch();
    if (!$usuario) responderError(404, 'Usuario no encontrado.');
    $correoAnterior = $usuario['email'];

    // Verificar unicidad si cambia cc, codigo o email
    if (!empty($body['cc']) || !empty($body['codigo']) || !empty($body['email'])) {
        $stmtU = $db->prepare('
            SELECT id FROM usuarios
            WHERE (cc = ? OR codigo = ? OR email = ?) AND id != ?
            LIMIT 1
        ');
        $stmtU->execute([
            $body['cc']     ?? '',
            $body['codigo'] ?? '',
            $body['email']  ?? '',
            $id,
        ]);
        if ($stmtU->fetch()) {
            responderError(409, 'Ya existe otro usuario con esa cédula, código o correo.');
        }
    }

    $campos  = [];
    $valores = [];

    $actualizables = [
        'nombre','cc','codigo','email','rol','estado',
        'programa','semestre','jornada','telefono','direccion',
    ];

    foreach ($actualizables as $campo) {
        if (array_key_exists($campo, $body)) {
            $campos[]  = "$campo = ?";
            $valores[] = $body[$campo];
        }
    }

    // Actualizar password si viene
    if (!empty($body['password'])) {
        if (strlen($body['password']) < 8) {
            responderError(400, 'La contraseña debe tener mínimo 8 caracteres.');
        }
        $campos[]  = 'password_hash = ?';
        $valores[] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($campos)) responderError(400, 'No se enviaron campos para actualizar.');

    $valores[] = $id;
    $db->prepare('UPDATE usuarios SET ' . implode(', ', $campos) . ', updated_at = NOW() WHERE id = ?')
       ->execute($valores);

    registrarLog(
        $payload['id'],
        'ACTUALIZAR_USUARIO',
        'usuarios',
        "Usuario ID $id actualizado",
        ['usuario_id' => $id]
    );

    // Avisar al estudiante — al correo NUEVO si se lo cambiaron, para que sepa
    // que su cuenta quedó con el correo institucional (o lo que haya cambiado).
    if ($usuario['rol'] === 'estudiante') {
        $correoCambio = array_key_exists('email', $body) && $body['email'] !== $correoAnterior;
        $mensaje = $correoCambio
            ? "El Departamento Financiero actualizó tu correo de acceso a {$body['email']}. Úsalo la próxima vez que inicies sesión."
            : "El Departamento Financiero actualizó los datos de tu cuenta en UniCréditos.";
        notificarEstudiante($id, 'datos_actualizados', 'Tus datos fueron actualizados', $mensaje, '/dashboard');
    }

    responderOk(['message' => 'Usuario actualizado correctamente.']);
}

// ─── PUT: cambiar estado activo/inactivo (solo admin) ─────────────────────────
function cambiarEstado(array $payload): void {
    requerirRol($payload, 'admin');

    $body   = obtenerBody();
    $id     = (int)($body['id'] ?? 0);
    $estado = $body['estado'] ?? '';

    if (!$id) responderError(400, 'ID de usuario requerido.');
    if (!in_array($estado, ['Activo','Inactivo'], true)) {
        responderError(400, 'Estado no válido. Usa Activo o Inactivo.');
    }

    // No permitir desactivarse a sí mismo
    if ($id === $payload['id']) {
        responderError(403, 'No puedes cambiar tu propio estado.');
    }

    $db = getDB();
    $db->prepare('UPDATE usuarios SET estado = ?, updated_at = NOW() WHERE id = ?')
       ->execute([$estado, $id]);

    // Invalida todas las sesiones del usuario si se desactiva
    if ($estado === 'Inactivo') {
        $db->prepare('UPDATE tokens_jwt SET activo = 0 WHERE usuario_id = ?')
           ->execute([$id]);
    }

    registrarLog(
        $payload['id'],
        'CAMBIO_ESTADO_USUARIO',
        'usuarios',
        "Usuario ID $id cambiado a estado: $estado",
        ['usuario_id' => $id, 'estado' => $estado]
    );

    responderOk(['message' => "Usuario marcado como $estado."]);
}

// ─── PUT: cambiar contraseña (usuario propio o admin) ─────────────────────────
function cambiarPassword(array $payload): void {
    $body = obtenerBody();
    $id   = (int)($body['id'] ?? $payload['id']);

    // Solo admin puede cambiar la de otro usuario
    if ($id !== $payload['id'] && $payload['rol'] !== 'admin') {
        responderError(403, 'No tienes permisos para cambiar la contraseña de otro usuario.');
    }

    $nuevaPass = $body['nueva_password'] ?? '';
    if (strlen($nuevaPass) < 8) {
        responderError(400, 'La contraseña debe tener mínimo 8 caracteres.');
    }

    // Si es el mismo usuario, verificar contraseña actual
    if ($id === $payload['id'] && $payload['rol'] !== 'admin') {
        $passActual = $body['password_actual'] ?? '';
        if (!$passActual) responderError(400, 'Debes ingresar tu contraseña actual.');

        $db   = getDB();
        $stmt = $db->prepare('SELECT password_hash FROM usuarios WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        if (!password_verify($passActual, $user['password_hash'])) {
            responderError(401, 'La contraseña actual es incorrecta.');
        }
    }

    $db = getDB();
    $db->prepare('UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?')
       ->execute([password_hash($nuevaPass, PASSWORD_BCRYPT, ['cost' => 12]), $id]);

    // Invalidar todas las sesiones activas
    $db->prepare('UPDATE tokens_jwt SET activo = 0 WHERE usuario_id = ?')
       ->execute([$id]);

    registrarLog(
        $payload['id'],
        'CAMBIO_PASSWORD',
        'usuarios',
        "Contraseña cambiada para usuario ID $id"
    );

    // Si fue el admin quien la cambió (no la propia persona), avisarle —
    // así sabe que su contraseña cambió aunque no haya sido él quien lo pidió.
    if ($id !== $payload['id']) {
        $stmtRol = $db->prepare('SELECT rol FROM usuarios WHERE id = ?');
        $stmtRol->execute([$id]);
        $rolAfectado = $stmtRol->fetchColumn();
        if ($rolAfectado === 'estudiante') {
            notificarEstudiante(
                $id, 'password_cambiada', 'Tu contraseña fue restablecida',
                'El Departamento Financiero restableció la contraseña de tu cuenta en UniCréditos. Si no lo esperabas, contacta a la Universidad.',
                '/dashboard'
            );
        }
    }

    responderOk(['message' => 'Contraseña actualizada. Inicia sesión nuevamente.']);
}

// ─── DELETE: eliminar usuario (solo admin) ────────────────────────────────────
function eliminarUsuario(array $payload): void {
    requerirRol($payload, 'admin');

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) responderError(400, 'ID de usuario requerido.');

    // No permitir eliminarse a sí mismo
    if ($id === $payload['id']) {
        responderError(403, 'No puedes eliminar tu propio usuario.');
    }

    $db = getDB();

    // Verificar que no tenga créditos activos
    $stmt = $db->prepare("
        SELECT COUNT(*) AS total FROM creditos
        WHERE estudiante_id = ? AND estado NOT IN ('Negado','Cerrado')
    ");
    $stmt->execute([$id]);
    if ($stmt->fetch()['total'] > 0) {
        responderError(409, 'No se puede eliminar un usuario con créditos activos. Cierra o niega sus créditos primero.');
    }

    $stmt = $db->prepare('SELECT nombre, rol FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $usuario = $stmt->fetch();
    if (!$usuario) responderError(404, 'Usuario no encontrado.');

    // Invalidar sesiones antes de eliminar
    $db->prepare('UPDATE tokens_jwt SET activo = 0 WHERE usuario_id = ?')->execute([$id]);

    // Eliminar usuario
    $db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);

    registrarLog(
        $payload['id'],
        'ELIMINAR_USUARIO',
        'usuarios',
        "Usuario '{$usuario['nombre']}' ({$usuario['rol']}) eliminado",
        ['usuario_eliminado_id' => $id]
    );

    responderOk(['message' => 'Usuario eliminado correctamente.']);
}