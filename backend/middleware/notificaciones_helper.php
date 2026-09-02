<?php
// ============================================================
// UniCréditos — Helper de notificaciones
// Crea el registro en BD (para la campanita) y manda el correo
// (mismo patrón @mail() ya usado en auth.php/pagares.php para 2FA).
// ============================================================

/**
 * Crea una notificación para un estudiante específico y le manda correo.
 */
function notificarEstudiante(int $usuarioId, string $tipo, string $titulo, string $mensaje, ?string $enlace = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare('
            INSERT INTO notificaciones (usuario_id, para_admin, tipo, titulo, mensaje, enlace)
            VALUES (?, 0, ?, ?, ?, ?)
        ');
        $stmt->execute([$usuarioId, $tipo, $titulo, $mensaje, $enlace]);

        $stmtU = $db->prepare('SELECT email, nombre FROM usuarios WHERE id = ?');
        $stmtU->execute([$usuarioId]);
        $u = $stmtU->fetch();
        if ($u) {
            enviarCorreoNotificacion($u['email'], $u['nombre'], $titulo, $mensaje);
        }
    } catch (Throwable $e) {
        // No se detiene el flujo principal si falla la notificación
        error_log('Error creando notificación estudiante: ' . $e->getMessage());
    }
}

/**
 * Crea una notificación visible para todos los administradores y les manda correo.
 */
function notificarAdmins(string $tipo, string $titulo, string $mensaje, ?string $enlace = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare('
            INSERT INTO notificaciones (usuario_id, para_admin, tipo, titulo, mensaje, enlace)
            VALUES (NULL, 1, ?, ?, ?, ?)
        ');
        $stmt->execute([$tipo, $titulo, $mensaje, $enlace]);

        $admins = $db->query("SELECT email, nombre FROM usuarios WHERE rol = 'admin' AND estado = 'Activo'")->fetchAll();
        foreach ($admins as $a) {
            enviarCorreoNotificacion($a['email'], $a['nombre'], $titulo, $mensaje);
        }
    } catch (Throwable $e) {
        error_log('Error creando notificación admin: ' . $e->getMessage());
    }
}

function enviarCorreoNotificacion(string $email, string $nombre, string $titulo, string $mensaje): void {
    $asunto = "UniCréditos — $titulo";
    $cuerpo = "
        <html><body style='font-family:Arial,sans-serif;background:#f3ede1;padding:2rem;'>
          <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:2rem;'>
            <p style='color:#1e3a5f;font-weight:700;font-size:1.1rem;margin:0 0 1rem;'>$titulo</p>
            <p style='color:#2c3e50;font-size:0.9rem;line-height:1.5;'>Hola " . htmlspecialchars($nombre) . ",</p>
            <p style='color:#2c3e50;font-size:0.9rem;line-height:1.5;'>" . htmlspecialchars($mensaje) . "</p>
            <p style='color:#6b7a8d;font-size:0.78rem;margin-top:1.5rem;'>Corporación Universitaria Autónoma del Cauca — UniCréditos</p>
          </div>
        </body></html>
    ";
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=utf-8\r\n";
    $headers .= "From: UniCréditos <noreply@uniautonoma.edu.co>\r\n";
    @mail($email, $asunto, $cuerpo, $headers);
}