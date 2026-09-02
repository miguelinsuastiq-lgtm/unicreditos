<?php
// ============================================================
// UniCréditos — Configuración de envío de correo real por SMTP
// ============================================================
// Este es un ARCHIVO DE EJEMPLO — cópialo como "smtp.php" (sin ".example")
// en esta misma carpeta, y completa tus propios datos ahí. El archivo real
// "smtp.php" nunca se sube a GitHub (está en .gitignore) porque contiene
// una contraseña — cada quien pone la suya en su propia copia local.
//
// Si usan Gmail: necesitan una "contraseña de aplicación" (no la
// contraseña normal de la cuenta). Se genera así:
//   1. Entrar a https://myaccount.google.com/security
//   2. Activar la verificación en 2 pasos (si no la tienen activa)
//   3. Buscar "Contraseñas de aplicaciones" (o ir directo a
//      https://myaccount.google.com/apppasswords)
//   4. Crear una nueva, ponerle un nombre como "UniCreditos", y copiar
//      el código de 16 letras que da Google — ESO va en SMTP_PASS,
//      no la contraseña real de la cuenta.

const SMTP_HOST       = 'smtp.gmail.com';   // smtp.office365.com si usan Outlook/institucional Microsoft
const SMTP_PORT       = 587;
const SMTP_USER       = 'tu_correo_de_envio@gmail.com';
const SMTP_PASS       = 'xxxx xxxx xxxx xxxx'; // contraseña de aplicación de 16 caracteres (Gmail) — NO la contraseña normal
const SMTP_FROM_EMAIL = 'tu_correo_de_envio@gmail.com';
const SMTP_FROM_NAME  = 'UniCréditos - Corporación Universitaria Autónoma del Cauca';