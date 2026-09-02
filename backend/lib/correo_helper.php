<?php
// ============================================================
// UniCréditos — Envío real de correo por SMTP (reemplaza mail())
// ============================================================
// mail() de PHP depende de un servidor de correo (sendmail/postfix)
// instalado en la misma máquina — XAMPP no trae eso configurado, por
// eso nunca llegaban los correos en local. Esta función usa PHPMailer
// para conectarse de verdad a un servidor SMTP (Gmail, Outlook, etc.)
// y sí entregar el correo a la bandeja de entrada real.

require_once __DIR__ . '/phpmailer/Exception.php';
require_once __DIR__ . '/phpmailer/PHPMailer.php';
require_once __DIR__ . '/phpmailer/SMTP.php';
require_once __DIR__ . '/../config/smtp.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Envía un correo real por SMTP.
 * Devuelve true si se envió, false si falló (nunca lanza excepción hacia
 * afuera — un correo que no llega no debe tumbar el resto de la petición).
 */
function enviarCorreoSMTP(string $destinatarioEmail, string $destinatarioNombre, string $asunto, string $cuerpoHtml): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 10; // si el SMTP no responde en 10s, falla rápido en vez de colgar la petición

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($destinatarioEmail, $destinatarioNombre);

        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body    = $cuerpoHtml;
        $mail->AltBody  = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $cuerpoHtml));

        $mail->send();
        return true;
    } catch (PHPMailerException $e) {
        error_log('Error enviando correo a ' . $destinatarioEmail . ': ' . $mail->ErrorInfo);
        return false;
    }
}