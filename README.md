# Polla Mundial 2026

App de predicciones del Mundial 2026 para Andersen Ecuador. Autenticación y datos vía Supabase.

## Requisitos

- Node.js 18+
- Acceso al proyecto de Supabase (pedir credenciales al administrador)

## Instalación local

```bash
cd frontend
npm install
```

Copia el archivo de variables de entorno y completa las credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores reales de Supabase:

```
VITE_STANDALONE=false
VITE_SUPABASE_URL=https://sumnuonoaysauakylokf.supabase.co
VITE_SUPABASE_ANON_KEY=<pedirle al admin>
```

## Correr en desarrollo

```bash
cd frontend
npm run dev
```

Abre http://localhost:5173

## Build para producción

```bash
cd frontend
npm run build
```

## Notas

- `.env.local` está en `.gitignore` — nunca se sube al repositorio
- La base de datos vive en Supabase, no hay backend local que levantar
- Para acceso de administrador, el usuario debe tener `is_admin = true` en la tabla `users`
