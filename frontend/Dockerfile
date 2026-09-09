# ============================================================
# UniCréditos — Frontend (React + Vite), compilado y servido con nginx
# ============================================================

# ── Etapa 1: compilar la aplicación ────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# La URL del backend se define al construir la imagen (Vite la incrusta
# en el código compilado — no se puede cambiar después en tiempo real).
# Por defecto asume que el backend está publicado en el puerto 8080
# del mismo servidor donde corre esto — ajústalo con --build-arg si
# tu backend queda en otra dirección.
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: servir los archivos ya compilados ─────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Config de nginx para que las rutas de React (React Router) funcionen
# al recargar la página en una URL como /dashboard, no solo en "/"
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80