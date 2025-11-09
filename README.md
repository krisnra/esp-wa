# ESP‑WA — ESP32 ↔ WhatsApp Integration

A production‑ready starter for building an ESP32 monitoring & notification system that talks to WhatsApp via **WPPConnect Server**. The stack is:

- **Backend:** Node.js + Express + Prisma (PostgreSQL)
- **Frontend:** React + Vite + TypeScript
- **Database:** PostgreSQL (via Docker)
- **WhatsApp Bot:** WPPConnect Server
- **Containerization:** Docker & Docker Compose

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Development (Local)](#development-local)
- [Environment Variables](#environment-variables)
- [Database Schema (Prisma)](#database-schema-prisma)
- [WhatsApp Integration (WPPConnect)](#whatsapp-integration-wppconnect)
- [ESP32 → API Example](#esp32--api-example)
- [API Endpoints](#api-endpoints)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ESP‑WA** is a containerized system that receives events from ESP32 devices and relays actionable notifications to WhatsApp subscribers. Users can opt in/out of alerts directly from WhatsApp (e.g., sending **“Alarm On”** to subscribe and **“Alarm Off”** to unsubscribe).

Typical use cases include security alerts, sensor status changes, and environment monitoring. The project is set up for rapid local development and reproducible deployment with Docker.

---

## Features

- 🔐 **Auth**: JWT‑based login/logout for the web app.
- 🗃️ **Logs**: Store ESP32 events (e.g., `ALARM`, `SAFE`) in Postgres.
- 🔔 **WhatsApp notifications**: Broadcast events to active subscribers.
- 🔄 **Subscriptions**: Subscribe/unsubscribe via WhatsApp messages.
- 🧰 **Dev‑friendly**: Docker Compose, Prisma, TypeScript, Vite.
- 🧪 **Extensible**: Clean API and modular services for future features.

---

## Architecture

## Arsitektur

```
┌──────────┐    logs/telemetry     ┌─────────────┐
│  ESP32   ├──────────────────────►│   Backend   │──┐  Prisma
└──────────┘  (HTTP /api/esp)      │ (Express)   │  │  PostgreSQL
                                   └──┬─────┬────┘  ▼
                  WhatsApp send/recv  │     │    ┌─────────┐
               ┌──────────────────────┘     │    │ Postgres│
               ▼                            │    └─────────┘
         ┌──────────────┐                   │
         │ WPPConnect   │                   └───┐
         │  Server      │                       │ REST /api/*
         └──────────────┘                       │
                                                ▼
                                           ┌───────────┐
                                           │ Frontend  │ (React + Vite)
                                           └───────────┘
---

## Tech Stack

- **Server:** Node 20+, Express, Prisma, Zod/Validator (optional)
- **Client:** React 18, Vite, TypeScript, Tailwind/shadcn (optional)
- **DB:** PostgreSQL 14+
- **Bot:** WPPConnect Server
- **Infra:** Docker, Docker Compose

---

## Monorepo Structure

```

esp-wa/
├─ client/ # React + Vite + TypeScript (web dashboard)
├─ server/ # Node.js + Express + Prisma (REST API)
├─ docker-compose.yml
├─ .env.example
└─ README.md

````

---

## Quick Start (Docker)

> Prerequisites: Docker + Docker Compose installed.

1. **Clone & configure env**

```bash
git clone <your-repo-url> esp-wa
cd esp-wa
cp .env.example .env
````

2. **Boot everything**

```bash
docker compose up -d --build
```

3. **Generate Prisma client & sync schema**

```bash
docker compose exec app npx prisma generate
docker compose exec app npx prisma db push
```

4. **Open the app**

- API server: http://localhost:8080 (default)
- Web client: http://localhost:5173 (default)
- WPPConnect Server: http://localhost:21465 (default)

> Ports are configurable via environment variables.

---

## Development (Local)

If you prefer running without Docker:

```bash
# Server
cd server
npm install
cp .env.example .env
npm run dev

# Client
cd ../client
npm install
npm run dev
```

Make sure Postgres is running locally and your `DATABASE_URL` is set accordingly.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

```bash
# --- Server ---
APP_PORT=8080
JWT_SECRET=change-me
ESP_API_KEY=change-me

# --- Database (Docker service name: db) ---
DATABASE_URL=postgresql://espwa:espwa@db:5432/espwa?schema=public

# --- WPPConnect ---
WPP_URL=http://wppconnect:21465
WPP_SESSION=mySession
# Obtain the token via the generate-token step; store it here or inject at runtime
WPP_TOKEN=
# Optional: webhook signature secret for inbound events
WPP_WEBHOOK_SECRET=change-me
```

> **Security note:** Never commit real secrets. Use environment variables or a secret manager in production.

---

## Database Schema (Prisma)

> Minimal example (simplified). Adjust to your needs.

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
}

model Log {
  id        Int      @id @default(autoincrement())
  deviceId  String
  category  String   // e.g. "ALARM" | "SAFE"
  message   String?
  createdAt DateTime @default(now())
}
```

Common commands:

```bash
# Generate Prisma Client (type-safe DB client)
npx prisma generate

# Sync schema to the database (non-destructive in dev)
npx prisma db push

# Apply migrations (for prod workflows)
npx prisma migrate deploy
```

---

## WhatsApp Integration (WPPConnect)

1. **Generate a token** (example):

```bash
curl -X POST --location "http://localhost:21465/api/mySession/eUsouSeCreTo/generate-token"
```

2. **Start the session** (scan the QR in the WPPConnect UI or payload):

```bash
curl -X POST --location "http://localhost:21465/api/mySession/start-session"   -H "Accept: application/json"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WPP_TOKEN"
```

3. **Send a test message:**

```bash
curl -X POST --location "http://localhost:21465/api/mySession/send-message"   -H "Authorization: Bearer $WPP_TOKEN"   -H "Content-Type: application/json"   -d '{"phone":"6285XXXXXXX","message":"Hello from ESP‑WA 👋"}'
```

4. **Inbound messages & subscriptions**

Configure WPPConnect to POST incoming messages to your API webhook, e.g.:

```
POST /api/wpp/webhook  (secured via a shared secret header)
```

Your server can parse text commands:

- `Alarm On` → add sender’s phone to the **subscribers** table
- `Alarm Off` → remove the sender’s phone from subscribers

> WPPConnect does not provide a `GET /messages` REST endpoint by default; use webhooks/events or the official APIs it exposes for message retrieval.

---

## ESP32 → API Example

Send device events to the backend. Example HTTP request:

```
POST /api/esp
Headers:
  Content-Type: application/json
  x-esp-apikey: <ESP_API_KEY>

Body:
{
  "deviceId": "esp32-01",
  "category": "ALARM",
  "message": "Door opened"
}
```

The server persists the log and (if `category` is `ALARM`) broadcasts a WhatsApp notification to all active subscribers.

---

## API Endpoints

> Paths may vary depending on your `server/` implementation; below is a common baseline.

- `POST /api/esp` — ingest ESP32 events (requires `x-esp-apikey`).
- `POST /api/auth/login` — obtain JWT for the dashboard.
- `GET  /api/logs` — list recent logs (JWT required).
- `POST /api/wpp/webhook` — inbound WhatsApp events (secured).

---

## Scripts

Common `package.json` scripts you might find/use:

**Server**

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push"
  }
}
```

**Client**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## Troubleshooting

- **WPPConnect token/session**

  - Ensure your `Authorization: Bearer <token>` header matches the one returned by `generate-token`.
  - If QR login fails, restart the session and clear old caches/containers.

- **“Cannot GET /api/mySession/messages”**

  - That path isn’t a standard WPPConnect REST endpoint. Use webhooks or provided APIs to read incoming messages.

- **Prisma: `generate` vs `db push`**

  - `prisma generate` produces the type‑safe client.
  - `prisma db push` syncs your Prisma models to the database (useful in dev). For production with migrations, prefer `prisma migrate` flows.

- **Tailwind CLI not found**
  - Ensure Node 18/20+ is installed. You can initialize Tailwind with:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```

---

## Roadmap

- Role‑based access control (RBAC) for the dashboard
- Granular notification rules & schedules
- Device provisioning & health monitoring
- Observability (metrics, tracing) and CI/CD
- Optional multi‑tenant support

---

## Contributing

Pull requests are welcome! Please open an issue to discuss major changes first. Make sure to add tests where reasonable and keep the README up to date.

---

## License

MIT © krisn
