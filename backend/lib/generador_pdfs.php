<?php
// ============================================================
// UniCréditos — Generador de documentos en PDF (metodología cero papel)
// Usa el formato REAL de la Universidad como imagen de fondo (los PDF
// originales son versión 1.7 — FPDI gratuito solo soporta hasta 1.4,
// así que en vez de "importar" el PDF se usa una imagen de alta
// resolución del formato real y se escriben los datos encima, en las
// mismas coordenadas donde van los espacios en blanco del original).
//
// Genera los 3 documentos que legalmente SÍ se pueden firmar de forma
// digital (sin notaría): Solicitud de Crédito, Pagaré y Autorización
// de Consulta en Centrales de Riesgo. La Carta de Instrucciones NO se
// genera aquí — requiere autenticación notarial por ley (Art. 622 del
// Código de Comercio) y no puede resolverse con firma digital.
// ============================================================

require_once __DIR__ . '/tcpdf/tcpdf.php';

const ASSETS_BG = __DIR__ . '/../assets/formatos_bg';

// Convierte px de una imagen renderizada a 100dpi en mm reales de página
// carta (215.9 x 279.4mm) — funciona sin importar a qué dpi se haya
// exportado la imagen de fondo, porque 1px@100dpi = 0.254mm siempre.
function px(float $v): float { return $v * 0.254; }

function guardarFirmaTemporal(string $firmaBase64): string {
    $datos = preg_replace('#^data:image/\w+;base64,#i', '', $firmaBase64);
    $bin   = base64_decode($datos);
    $ruta  = sys_get_temp_dir() . '/firma_' . uniqid() . '.jpg';
    file_put_contents($ruta, $bin);
    return $ruta;
}

// Guarda la firma junto a los documentos generados (no en /tmp) para poder
// regenerar los 3 PDFs más adelante cuando el codeudor también firme, sin
// tener que pedirle al deudor que vuelva a firmar.
function guardarFirmaPersistente(string $firmaBase64, string $dirSalida, string $quien): string {
    $datos = preg_replace('#^data:image/\w+;base64,#i', '', $firmaBase64);
    $bin   = base64_decode($datos);
    $ruta  = "$dirSalida/firma_$quien.jpg";
    file_put_contents($ruta, $bin);
    return $ruta;
}

function crearPdfConFondo(string $titulo, string $rutaFondo): TCPDF {
    $pdf = new TCPDF('P', 'mm', 'LETTER', true, 'UTF-8', false);
    $pdf->SetCreator('UniCréditos - Corporación Universitaria Autónoma del Cauca');
    $pdf->SetTitle($titulo);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false);
    $pdf->AddPage();
    // Imagen de fondo a página completa (215.9 x 279.4mm = carta)
    $pdf->Image($rutaFondo, 0, 0, 215.9, 279.4, '', '', '', false, 300);
    return $pdf;
}

function escribir(TCPDF $pdf, float $xPx, float $yPx, string $texto, float $size = 9): void {
    $pdf->SetFont('helvetica', '', $size);
    $pdf->SetTextColor(20, 30, 70);
    $pdf->SetXY(px($xPx), px($yPx));
    $pdf->Cell(px(300), 4, $texto, 0, 0, 'L');
}

function insertarFirmaPx(TCPDF $pdf, string $rutaFirma, float $xPx, float $yPx, float $anchoPx): void {
    if (!file_exists($rutaFirma)) return;
    $datosImagen = file_get_contents($rutaFirma);
    $anchoMm = px($anchoPx);
    // Proporción real del canvas de firma (600x180px = 0.3) — antes usaba 0.36
    // con un ancho grande, lo que hacía la firma demasiado alta y se montaba
    // sobre la fila de arriba en los espacios más angostos (p. ej. el segundo
    // firmante de la Solicitud de Crédito, justo debajo del ingreso mensual).
    $altoMm = $anchoMm * 0.3;
    $pdf->Image('@' . $datosImagen, px($xPx), px($yPx) - $altoMm, $anchoMm, $altoMm, 'JPG');
}

// ─── 1. Solicitud de Crédito para Matrícula ───────────────────────────────────
function generarSolicitudCredito(array $d, string $rutaFirma, ?string $rutaFirmaCodeudor, string $rutaSalida): void {
    $pdf = crearPdfConFondo('Solicitud de Crédito para Matrícula', ASSETS_BG . '/solicitud_credito_p1.jpg');
    $hoy = explode('/', date('d/m/Y'));

    escribir($pdf, 200, 253, $hoy[0]);
    escribir($pdf, 300, 253, $hoy[1]);
    escribir($pdf, 405, 253, $hoy[2]);

    escribir($pdf, 330, 402, $d['deudor_nombre']);
    escribir($pdf, 175, 430, $d['deudor_cc']); escribir($pdf, 385, 430, 'Popayán');
    escribir($pdf, 270, 459, $d['deudor_direccion']); escribir($pdf, 625, 459, $d['deudor_telefono'], 8);
    escribir($pdf, 175, 527, $d['deudor_programa'], 8); escribir($pdf, 410, 527, (string)$d['deudor_semestre']); escribir($pdf, 590, 527, $d['deudor_jornada']);
    insertarFirmaPx($pdf, $rutaFirma, 145, 580, 85); escribir($pdf, 500, 583, $d['deudor_cc'], 8);

    escribir($pdf, 315, 612, $d['codeudor_nombre']);
    escribir($pdf, 175, 640, $d['codeudor_cc']); escribir($pdf, 385, 640, 'Popayán');
    escribir($pdf, 270, 669, $d['codeudor_direccion']); escribir($pdf, 625, 669, $d['codeudor_telefono'], 8);
    escribir($pdf, 465, 730, number_format((float)$d['codeudor_ingreso'], 0, ',', '.'));
    if ($rutaFirmaCodeudor) insertarFirmaPx($pdf, $rutaFirmaCodeudor, 145, 756, 70);
    escribir($pdf, 500, 758, $d['codeudor_cc'], 8);

    $pdf->Output($rutaSalida, 'F');
}

// ─── 2. Pagaré (no autenticar) ─────────────────────────────────────────────────
function generarPagare(array $d, string $rutaFirma, ?string $rutaFirmaCodeudor, string $rutaSalida): void {
    $pdf = crearPdfConFondo('Pagaré', ASSETS_BG . '/pagare_p1.jpg');

    escribir($pdf, 180, 233, $d['deudor_nombre'], 8);
    escribir($pdf, 190, 256, $d['deudor_cc'], 8);
    escribir($pdf, 140, 279, $d['codeudor_nombre'], 8);
    escribir($pdf, 140, 302, $d['codeudor_cc'], 8);
    escribir($pdf, 200, 372, $d['deudor_nombre'], 8);
    escribir($pdf, 140, 395, $d['codeudor_nombre'], 8);

    $pdf->AddPage();
    $pdf->Image(ASSETS_BG . '/pagare_p2.jpg', 0, 0, 215.9, 279.4, '', '', '', false, 300);
    escribir($pdf, 345, 214, 'Popayán', 8);
    insertarFirmaPx($pdf, $rutaFirma, 100, 303, 85);
    if ($rutaFirmaCodeudor) insertarFirmaPx($pdf, $rutaFirmaCodeudor, 590, 303, 85);
    escribir($pdf, 175, 326, $d['deudor_nombre'], 8);
    escribir($pdf, 590, 326, $d['codeudor_nombre'], 8);
    escribir($pdf, 200, 343, $d['deudor_cc'], 8);
    escribir($pdf, 610, 343, $d['codeudor_cc'], 8);
    escribir($pdf, 195, 359, $d['deudor_direccion'], 7);
    escribir($pdf, 585, 359, $d['codeudor_direccion'], 7);

    $pdf->Output($rutaSalida, 'F');
}

// ─── 3. Autorización Consulta Centrales de Riesgo ─────────────────────────────
function generarAutorizacionDatacredito(array $d, string $rutaFirma, ?string $rutaFirmaCodeudor, string $rutaSalida): void {
    $pdf = crearPdfConFondo('Autorización Centrales de Riesgo', ASSETS_BG . '/autorizacion_datacredito_p1.jpg');
    $hoy = explode('/', date('d/m/Y'));

    escribir($pdf, 515, 288, 'Popayán', 8);
    escribir($pdf, 615, 288, $hoy[0]); escribir($pdf, 650, 288, $hoy[1]); escribir($pdf, 683, 288, $hoy[2]);

    insertarFirmaPx($pdf, $rutaFirma, 100, 775, 100);
    if ($rutaFirmaCodeudor) insertarFirmaPx($pdf, $rutaFirmaCodeudor, 450, 775, 100);

    escribir($pdf, 200, 864, $d['deudor_nombre'], 8);
    escribir($pdf, 565, 864, $d['codeudor_nombre'], 8);
    escribir($pdf, 185, 906, $d['deudor_cc'], 8);
    escribir($pdf, 555, 906, $d['codeudor_cc'], 8);
    escribir($pdf, 200, 928, $d['deudor_email'], 7);
    escribir($pdf, 205, 951, $d['deudor_telefono'], 8);
    escribir($pdf, 565, 951, $d['codeudor_telefono'], 8);

    $pdf->Output($rutaSalida, 'F');
}

// ─── Orquestador: genera los 3 documentos de una solicitud ────────────────────
// Se puede llamar dos veces: la 1.ª cuando el deudor firma (sin firma de
// codeudor todavía), y la 2.ª cuando el codeudor firma (regenera los 3 PDFs
// ya con ambas firmas, reutilizando la firma del deudor que quedó guardada).
function generarDocumentosSolicitud(array $datos, string $firmaDeudorBase64, int $solicitudId, ?string $firmaCodeudorBase64 = null): array {
    $dirSalida = __DIR__ . "/../uploads/solicitudes_publicas/$solicitudId";
    if (!is_dir($dirSalida)) mkdir($dirSalida, 0755, true);

    $rutaFirmaDeudor = guardarFirmaPersistente($firmaDeudorBase64, $dirSalida, 'deudor');
    $rutaFirmaCodeudor = $firmaCodeudorBase64 ? guardarFirmaPersistente($firmaCodeudorBase64, $dirSalida, 'codeudor') : null;

    $generados = [];

    generarSolicitudCredito($datos, $rutaFirmaDeudor, $rutaFirmaCodeudor, "$dirSalida/solicitud_credito.pdf");
    $generados['solicitud_credito'] = ['nombre' => 'Solicitud de Crédito.pdf', 'ruta' => "uploads/solicitudes_publicas/$solicitudId/solicitud_credito.pdf"];

    generarPagare($datos, $rutaFirmaDeudor, $rutaFirmaCodeudor, "$dirSalida/pagare.pdf");
    $generados['pagare'] = ['nombre' => 'Pagaré.pdf', 'ruta' => "uploads/solicitudes_publicas/$solicitudId/pagare.pdf"];

    generarAutorizacionDatacredito($datos, $rutaFirmaDeudor, $rutaFirmaCodeudor, "$dirSalida/autorizacion_datacredito.pdf");
    $generados['autorizacion_datacredito'] = ['nombre' => 'Autorización Centrales de Riesgo.pdf', 'ruta' => "uploads/solicitudes_publicas/$solicitudId/autorizacion_datacredito.pdf"];

    return $generados;
}

// ─── Regenerar solo cuando el codeudor firma (reutiliza la firma del deudor
// que ya quedó guardada en disco desde el envío original) ─────────────────────
function regenerarConFirmaCodeudor(array $datos, int $solicitudId, string $firmaCodeudorBase64): array {
    $dirSalida = __DIR__ . "/../uploads/solicitudes_publicas/$solicitudId";
    $rutaFirmaDeudor = "$dirSalida/firma_deudor.jpg";
    if (!file_exists($rutaFirmaDeudor)) {
        throw new RuntimeException('No se encontró la firma del deudor para regenerar los documentos.');
    }
    $firmaDeudorBase64 = 'data:image/jpeg;base64,' . base64_encode(file_get_contents($rutaFirmaDeudor));
    return generarDocumentosSolicitud($datos, $firmaDeudorBase64, $solicitudId, $firmaCodeudorBase64);
}