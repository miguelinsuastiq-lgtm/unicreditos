<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// API: Autenticación — Login, 2FA, Logout
// Cumple Ley 527/1999 — autenticación electrónica
// ============================================================

ob_start(); // Captura cualquier output no deseado (warnings de PHP)
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';

aplicarCORS();

$body   = obtenerBody();
$accion = $body['action'] ?? '';

match ($accion) {
    'login'      => login($body),
    'verify_2fa' => verify2FA($body),
    'logout'     => logout(),
    default      => responderError(400, 'Acción no válida.'),
};

// ─── Login ────────────────────────────────────────────────────────────────────
function login(array $body): void {
    $codigo   = trim($body['codigo']   ?? '');
    $password = trim($body['password'] ?? '');

    if (!$codigo || !$password) {
        responderError(400, 'Código y contraseña son requeridos.');
    }

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT id, nombre, codigo, email, password_hash, rol, estado
        FROM usuarios
        WHERE codigo = ? OR email = ?
        LIMIT 1
    ');
    $stmt->execute([$codigo, $codigo]);
    $usuario = $stmt->fetch();

    if (!$usuario || !password_verify($password, $usuario['password_hash'])) {
        registrarLog(null, 'LOGIN_FALLIDO', 'auth', "Intento fallido para código: $codigo");
        responderError(401, 'Código o contraseña incorrectos.');
    }

    if ($usuario['estado'] !== 'Activo') {
        responderError(403, 'Tu cuenta está inactiva. Contacta al área de sistemas.');
    }

    // Generar código 2FA de 6 dígitos
    $codigo2fa  = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiracion = date('Y-m-d H:i:s', time() + 600);

    $stmt = $db->prepare('UPDATE usuarios SET codigo_2fa = ?, codigo_2fa_exp = ? WHERE id = ?');
    $stmt->execute([$codigo2fa, $expiracion, $usuario['id']]);

    // Enviar código por correo — @ suprime el warning de mail() en local
    @enviarCorreo2FA($usuario['email'], $usuario['nombre'], $codigo2fa);

    // Token temporal solo para el paso 2FA
    $tempToken = generarJWT([
        'id'    => $usuario['id'],
        'paso'  => '2fa',
        'email' => $usuario['email'],
    ]);

    registrarLog($usuario['id'], 'LOGIN_PASO1', 'auth', "Paso 1 completado para {$usuario['email']}");

    responderOk([
        'requires_2fa' => true,
        'temp_token'   => $tempToken,
        'message'      => "Código de verificación enviado a {$usuario['email']}",
    ]);
}

// ─── Verificar 2FA ────────────────────────────────────────────────────────────
function verify2FA(array $body): void {
    $codigo2fa = trim($body['codigo_2fa'] ?? '');
    $tempToken = trim($body['temp_token'] ?? '');

    if (!$codigo2fa || !$tempToken) {
        responderError(400, 'Código y token temporal son requeridos.');
    }

    $payload = validarJWT($tempToken);
    if (!$payload || ($payload['paso'] ?? '') !== '2fa') {
        responderError(401, 'Token temporal inválido o expirado.');
    }

    $db   = getDB();
    $stmt = $db->prepare('
        SELECT id, nombre, codigo, email, rol, codigo_2fa, codigo_2fa_exp
        FROM usuarios WHERE id = ? LIMIT 1
    ');
    $stmt->execute([$payload['id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        responderError(401, 'Usuario no encontrado.');
    }

    if ($usuario['codigo_2fa'] !== $codigo2fa) {
        registrarLog($usuario['id'], 'LOGIN_2FA_FALLIDO', 'auth', 'Código 2FA incorrecto');
        responderError(401, 'Código de verificación incorrecto.');
    }

    if (strtotime($usuario['codigo_2fa_exp']) < time()) {
        responderError(401, 'El código de verificación expiró. Inicia sesión nuevamente.');
    }

    // Limpiar código 2FA
    $db->prepare('UPDATE usuarios SET codigo_2fa = NULL, codigo_2fa_exp = NULL, ultimo_login = NOW() WHERE id = ?')
       ->execute([$usuario['id']]);

    // Generar token JWT definitivo
    $token = generarJWT([
        'id'     => $usuario['id'],
        'nombre' => $usuario['nombre'],
        'codigo' => $usuario['codigo'],
        'email'  => $usuario['email'],
        'rol'    => $usuario['rol'],
    ]);

    // Guardar token en BD
    $db->prepare('
        INSERT INTO tokens_jwt (usuario_id, token_hash, ip, fecha_exp)
        VALUES (?, ?, ?, ?)
    ')->execute([
        $usuario['id'],
        hash('sha256', $token),
        $_SERVER['REMOTE_ADDR'] ?? null,
        date('Y-m-d H:i:s', time() + JWT_EXPIRACION),
    ]);

    registrarLog($usuario['id'], 'LOGIN_EXITOSO', 'auth', "Login exitoso para {$usuario['email']}");

    responderOk([
        'token' => $token,
        'user'  => [
            'id'     => $usuario['id'],
            'nombre' => $usuario['nombre'],
            'codigo' => $usuario['codigo'],
            'email'  => $usuario['email'],
            'rol'    => $usuario['rol'],
        ],
    ]);
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout(): void {
    $payload = requerirAuth();
    $token   = obtenerTokenDelHeader();

    $db = getDB();
    $db->prepare('UPDATE tokens_jwt SET activo = 0 WHERE token_hash = ?')
       ->execute([hash('sha256', $token)]);

    registrarLog($payload['id'], 'LOGOUT', 'auth', "Cierre de sesión para {$payload['email']}");

    responderOk(['message' => 'Sesión cerrada correctamente.']);
}

// ─── Envío de correo 2FA ──────────────────────────────────────────────────────
function enviarCorreo2FA(string $email, string $nombre, string $codigo): void {
    $asunto  = 'UniCréditos — Código de verificación';
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
                    <p>Tu código de verificación para iniciar sesión es:</p>
                    <div style='background:#1e3a5f;color:#fff;font-size:2rem;font-weight:700;letter-spacing:0.5rem;text-align:center;padding:1rem;border-radius:8px;margin:1rem 0;'>
                        $codigo
                    </div>
                    <p style='font-size:0.82rem;color:#6b7a8d;'>
                        Este código expira en <strong>10 minutos</strong>.<br>
                        Si no intentaste iniciar sesión, ignora este correo.
                    </p>
                </div>
            </div>
        </body>
        </html>
    ";

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=utf-8\r\n";
    $headers .= "From: UniCréditos <noreply@uniautonoma.edu.co>\r\n";

    // @ suprime el warning de mail() en local (sin servidor SMTP)
    @mail($email, $asunto, $mensaje, $headers);
}