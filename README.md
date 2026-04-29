# Demo Router

Plataforma interna para gestionar demos de chatbots usando un único número de WhatsApp/SMS de prueba. Enruta cada mensaje al chatbot correcto (n8n) según una whitelist de teléfonos autorizados.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** — UI
- **PostgreSQL** + **Prisma ORM** — base de datos
- **NextAuth.js** — autenticación con JWT
- **Zod** — validación

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd demo-router
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/demo_router?schema=public"
NEXTAUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
WEBHOOK_SECRET=""
DEFAULT_UNAUTHORIZED_MESSAGE="Hola. Este número está habilitado solo para pruebas autorizadas."
DEFAULT_INACTIVE_DEMO_MESSAGE="Esta demo no está activa en este momento."
DEFAULT_N8N_ERROR_MESSAGE="En este momento la demo no está disponible."
```

Genera `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Crear la base de datos en PostgreSQL

```sql
CREATE DATABASE demo_router;
```

### 4. Ejecutar migraciones de Prisma

```bash
npx prisma migrate dev --name init
```

### 5. Ejecutar seed (datos iniciales)

```bash
npx prisma db seed
```

Esto crea:
- Admin: `admin@demo-router.local` / `admin123`
- Developer: `dev@demo-router.local` / `dev123`
- Cliente de ejemplo: Dra. Sonia
- Demo: Bot Dermatología WhatsApp (activa)
- Tester: David Quiroga — `+57 320 340 6072`

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Cómo conectar n8n

### 1. Crear una demo

Inicia sesión como developer, ve a **Demos** → **Nueva demo** y completa:
- Cliente
- Nombre de la demo y del bot
- Canal (WhatsApp, SMS)
- **n8n Webhook URL**: pega aquí la URL del webhook de tu flujo en n8n
- Estado: Activa

### 2. Agregar teléfonos autorizados

En la demo, agrega los teléfonos desde la sección **Testers**. Solo estos números pueden interactuar con el bot.

### 3. Configurar tu proveedor

Configura el endpoint público en tu proveedor (Twilio, Meta, etc.):

```
POST https://tu-dominio.com/api/webhooks/inbound
```

### 4. Flujo completo

```
Mensaje entrante → /api/webhooks/inbound
   → Normalizar teléfono
   → Buscar tester autorizado y demo activa
   → Crear/abrir conversación
   → Guardar mensaje
   → POST al webhook de n8n
   → Guardar respuesta
   → Devolver respuesta al proveedor
```

---

## Payload que n8n recibe

Tu webhook de n8n recibirá este JSON:

```json
{
  "demo_id": "clx1234abc",
  "client_id": "clx5678def",
  "client_name": "Dra. Sonia",
  "demo_name": "Bot Dermatología WhatsApp",
  "bot_name": "SoniaBot",
  "developer": {
    "id": "clxdev001",
    "name": "David Quiroga",
    "email": "dev@demo-router.local"
  },
  "tester": {
    "id": "clxtester01",
    "name": "David Quiroga",
    "phone": "+57 320 340 6072",
    "role": "tester"
  },
  "conversation": {
    "id": "clxconv001",
    "channel": "whatsapp",
    "status": "open"
  },
  "message": {
    "text": "Hola, quiero información",
    "direction": "inbound",
    "timestamp": "2026-04-28T10:30:00.000Z"
  },
  "metadata": {
    "provider": "twilio",
    "raw_payload": {}
  }
}
```

## Respuesta esperada desde n8n

```json
{
  "reply": "¡Hola! Soy SoniaBot. ¿En qué te puedo ayudar?"
}
```

El campo `reply` es el texto que se devuelve al usuario.

---

## Probar con curl

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+573203406072",
    "text": "Hola, quiero información",
    "channel": "whatsapp",
    "provider": "other"
  }'
```

Con `WEBHOOK_SECRET` configurado:

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound \
  -H "Content-Type: application/json" \
  -H "x-demo-router-secret: tu-secret" \
  -d '{ ... }'
```

## Probar con Postman

- Method: `POST`
- URL: `http://localhost:3000/api/webhooks/inbound`
- Body: `raw / JSON`
- Contenido: ver ejemplo curl arriba

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run db:migrate   # Ejecutar migraciones
npm run db:push      # Push schema sin migración (dev rápido)
npm run db:seed      # Ejecutar seed
npm run db:studio    # Abrir Prisma Studio (GUI de la DB)
```

---

## Despliegue en Vercel

1. Push al repositorio
2. Importar en Vercel
3. Configurar variables de entorno en el dashboard de Vercel
4. Asegúrate de tener una base de datos PostgreSQL accesible (Supabase, Railway, Neon, etc.)
5. Ejecutar migraciones contra la DB de producción:
   ```bash
   DATABASE_URL="..." npx prisma migrate deploy
   ```

## Despliegue en servidor propio

```bash
npm run build
npm run start
```

Usa PM2 o similar para mantener el proceso vivo:
```bash
pm2 start npm --name demo-router -- start
```

---

## Roles

| Acción | Admin | Developer |
|---|---|---|
| Ver todos los developers | ✅ | ❌ |
| Ver todos los clientes | ✅ | Solo los suyos |
| Ver todas las demos | ✅ | Solo las suyas |
| Gestionar usuarios | ✅ | ❌ |
| Ver todos los logs | ✅ | Solo los suyos |
| Activar/desactivar demos | ✅ | Solo las suyas |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/           # Páginas protegidas (sidebar)
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── demos/
│   │   ├── conversations/
│   │   ├── logs/
│   │   ├── integration/
│   │   └── admin/users/
│   ├── api/             # API routes
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── demos/
│   │   ├── conversations/
│   │   ├── testers/
│   │   ├── logs/
│   │   ├── users/
│   │   ├── dashboard/
│   │   └── webhooks/inbound/   # Endpoint público
│   └── login/
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── clients/
│   ├── demos/
│   └── ui/              # Button, Input, Modal, Badge...
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   ├── demo-router.ts   # Motor de enrutamiento
│   ├── normalize.ts     # Normalización de teléfonos
│   └── utils.ts
└── schemas/             # Zod schemas
```
