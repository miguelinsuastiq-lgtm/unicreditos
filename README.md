# UniCréditos

Plataforma web de créditos de matrícula — Corporación Universitaria Autónoma del Cauca.

Permite a los estudiantes solicitar, firmar digitalmente y hacer seguimiento a su crédito de matrícula (interno, Brilla o ICETEX), y al Departamento Financiero gestionar todo el proceso (evaluación, documentos, facturación, pagarés) desde un solo panel.

**Stack:** React 19 + Vite (frontend) · PHP 8 sin framework (backend) · MariaDB/MySQL.

---

## 1. Requisitos

- [XAMPP](https://www.apachefriends.org/) (Apache + PHP 8+ + MariaDB) — o Apache/PHP/MySQL por separado
- [Node.js](https://nodejs.org/) 18 o superior (incluye `npm`)
- Un editor de código (VS Code recomendado)

---

## 2. Clonar el proyecto

```bash
git clone https://github.com/miguelinsuastiq-lgtm/unicreditos.git
cd unicreditos
```

---

## 3. Base de datos

1. Abre **phpMyAdmin** (con XAMPP corriendo) y crea una base de datos nueva llamada `unicreditos`, con codificación **`utf8mb4`**.
2. Importa, **en este orden**, los dos archivos que están en la carpeta `database/`:
   - `database/schema.sql` (crea las tablas)
   - `database/seed.sql` (datos de prueba: usuarios, créditos, documentos de ejemplo)

**Credenciales de prueba ya incluidas en el seed:**
| Código | Contraseña | Rol |
|---|---|---|
| `admin01` | `Password123!` | Administrador |
| `2024-1002` | `Password123!` | Estudiante |

> El código de verificación en 2 pasos (2FA) no llega a un correo real en local — revísalo en phpMyAdmin: tabla `usuarios`, columna `codigo_2fa`, en la fila del usuario con el que inicias sesión.

---

## 4. Backend (PHP)

1. Copia toda la carpeta `backend/` dentro de tu carpeta de XAMPP:
   - Windows: `C:\xampp\htdocs\unicreditos\backend\`
   - Mac/Linux: `/Applications/XAMPP/htdocs/unicreditos/backend/` (o la ruta equivalente)
2. Configura el envío de correo:
   - Dentro de `backend/config/`, copia `smtp.example.php` y renombra la copia a `smtp.php`
   - Abre `smtp.php` y completa `SMTP_USER` y `SMTP_PASS` con un correo real (ver instrucciones dentro del mismo archivo para generar una "contraseña de aplicación" de Gmail)
   - Si no configuras esto, el sistema sigue funcionando — simplemente los correos no se enviarán de verdad (revisa el código 2FA directo en la base de datos, como se explica arriba)
3. Confirma que Apache y MySQL estén corriendo en el panel de XAMPP
4. Prueba que el backend responda entrando a: `http://localhost/unicreditos/backend/api/creditos.php?accion=todos` (debería devolver un JSON, aunque sea un error de "token no proporcionado" — eso confirma que el servidor sí está respondiendo)

---

## 5. Frontend (React)

Desde la carpeta `frontend/` del proyecto:

```bash
cd frontend
npm install
npm run dev
```

Esto va a instalar todas las dependencias (puede tardar un par de minutos la primera vez) y levantar el servidor de desarrollo.

Abre en el navegador: **http://localhost:5173**

### Variable de entorno (opcional)

Por defecto, el frontend busca el backend en `http://localhost/unicreditos/backend/api`. Si tu backend está en otra URL o puerto, crea un archivo `.env` dentro de `frontend/` con:

```
VITE_API_URL=http://localhost/unicreditos/backend/api
```

(ajusta la URL según donde tengas corriendo tu backend).

---

## 6. Estructura del proyecto

```
unicreditos/
├── backend/
│   ├── api/            → endpoints (auth, creditos, documentos, facturacion, etc.)
│   ├── config/         → conexión a BD, JWT, CORS, SMTP
│   ├── lib/             → TCPDF (generación de PDF), PHPMailer (correo)
│   ├── middleware/      → autenticación, notificaciones
│   └── uploads/         → archivos subidos por usuarios (no se sube a git)
├── frontend/
│   └── src/
│       ├── pages/       → una página por vista (Dashboard, Creditos, Documentos, etc.)
│       ├── components/  → piezas reutilizables (Navbar, Sidebar, modales, etc.)
│       └── services/    → llamadas a la API, un archivo por módulo
└── database/
    ├── schema.sql       → estructura de las tablas
    └── seed.sql         → datos de prueba
```

---

## 7. Notas importantes

- **`backend/config/smtp.php` nunca se sube a GitHub** (está en `.gitignore`) porque contiene una contraseña real. Cada quien crea su propia copia local a partir de `smtp.example.php`.
- **`backend/uploads/`** tampoco se sube — ahí quedan documentos reales que suben los estudiantes (cédulas, comprobantes de pago, etc.), son datos sensibles.
- Si haces cambios y los subes con `git push`, revisa antes con `git status` que no se te haya colado por accidente `smtp.php` (el real) o algo de `uploads/`.