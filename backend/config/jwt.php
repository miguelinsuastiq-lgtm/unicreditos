<?php
// ============================================================
// UniCréditos — Corporación Universitaria Autónoma del Cauca
// JWT — Generación y validación de tokens
// Cumple Ley 527/1999 — firma electrónica y autenticación
// ============================================================

// Clave secreta — en producción cambiar por una cadena larga y aleatoria
// y guardarla en variable de entorno, nunca en el código
define('JWT_SECRET',     'unicreditos_uniautonoma_cauca_2026_secret_key_cambiar_en_produccion');
define('JWT_EXPIRACION', 3600 * 8); // 8 horas en segundos

/**
 * Genera un token JWT firmado con HS256
 */
function generarJWT(array $payload): string {
    // Header
    $header = base64url_encode(json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT',
    ]));

    // Payload — agrega tiempos de emisión y expiración
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRACION;

    $payload_encoded = base64url_encode(json_encode($payload));

    // Firma
    $firma = hash_hmac(
        'sha256',
        "$header.$payload_encoded",
        JWT_SECRET,
        true
    );
    $firma_encoded = base64url_encode($firma);

    return "$header.$payload_encoded.$firma_encoded";
}

/**
 * Valida un token JWT y retorna el payload si es válido
 * Retorna false si el token es inválido o expiró
 */
function validarJWT(string $token): array|false {
    $partes = explode('.', $token);

    if (count($partes) !== 3) {
        return false;
    }

    [$header, $payload_encoded, $firma_recibida] = $partes;

    // Verificar firma
    $firma_esperada = base64url_encode(
        hash_hmac('sha256', "$header.$payload_encoded", JWT_SECRET, true)
    );

    if (!hash_equals($firma_esperada, $firma_recibida)) {
        return false;
    }

    // Decodificar payload
    $payload = json_decode(base64url_decode($payload_encoded), true);

    if (!$payload) {
        return false;
    }

    // Verificar expiración
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false; // Token expirado — el interceptor de React redirige al login
    }

    return $payload;
}

/**
 * Extrae el token JWT del header Authorization: Bearer <token>
 */
function obtenerTokenDelHeader(): string|false {
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (str_starts_with($auth, 'Bearer ')) {
        return substr($auth, 7);
    }

    // Para enlaces que se abren directo en una pestaña nueva (botón "Ver" de
    // documentos), el navegador no puede mandar un header Authorization —
    // solo se puede mandar como parámetro de la URL en ese caso.
    if (!empty($_GET['token'])) {
        return $_GET['token'];
    }

    return false;
}

/**
 * Helpers de codificación Base64 URL-safe
 */
function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}