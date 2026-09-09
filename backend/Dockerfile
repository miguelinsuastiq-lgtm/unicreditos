# ============================================================
# UniCréditos — Backend (PHP + Apache)
# ============================================================
FROM php:8.3-apache

# Extensiones de PHP que usa el backend:
# - pdo_mysql: conexión a la base de datos MariaDB
# - fileinfo: detectar el tipo real de los archivos subidos (documentos, comprobantes)
RUN docker-php-ext-install pdo_mysql \
    && apt-get update \
    && apt-get install -y libzip-dev unzip \
    && docker-php-ext-install zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# mod_rewrite, por si algún .htaccess lo necesita
RUN a2enmod rewrite

# La imagen oficial de PHP+Apache ignora los archivos .htaccess por defecto
# (AllowOverride None) — como el backend sí trae uno, hay que habilitarlo
# explícitamente, o cualquier regla que dependa de él fallará en silencio.
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Apunta el DocumentRoot de Apache directo a la carpeta del backend
ENV APACHE_DOCUMENT_ROOT=/var/www/html

WORKDIR /var/www/html

# Copia todo el backend
COPY . /var/www/html/

# Si no existe smtp.php (no se sube a git), usa la plantilla de ejemplo
# para que el contenedor no se caiga por un require_once faltante —
# el correo simplemente no se enviará hasta que pongan credenciales reales.
RUN if [ ! -f /var/www/html/config/smtp.php ] && [ -f /var/www/html/config/smtp.example.php ]; then \
      cp /var/www/html/config/smtp.example.php /var/www/html/config/smtp.php; \
    fi

# Carpeta de uploads debe poder escribirse (documentos, comprobantes, PDFs generados)
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads

EXPOSE 80