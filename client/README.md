# ESP-WA (espwa)

Dashboard & backend untuk **monitoring + notifikasi WhatsApp** terintegrasi ESP32 dan WPPConnect.

## Ringkasan

- **Backend:** Node.js + Express + TypeScript, Prisma (PostgreSQL), JWT (cookie), rate-limit login
- **Frontend:** React + Vite + TypeScript, Tailwind, modal ringan
- **Bot WhatsApp:** integrasi **WPPConnect Server**
- **DB:** PostgreSQL (via Docker), dimodel dengan Prisma
- **Containerized:** Docker & Docker Compose

---

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
```

---

## Konfigurasi Environment

Buat file `.env` di root proyek:

.env.example

> Di produksi, pakai HTTPS & set cookie secure (`secure=true`) serta `JWT_SECRET` yang kuat.

---

## Setup Awal

Langkah paling cepat:

```bash
# 1) build dan jalankan semuanya
docker compose up -d --build

# 2) sinkronkan schema Prisma -> DB (diperlukan saat pertama kali)
docker compose exec app npx prisma db push

# 3) (opsional) seed admin pertama kali
docker compose exec app node -e 'const {PrismaClient}=require("@prisma/client");const bcrypt=require("bcryptjs");(async()=>{const p=new PrismaClient();const email=process.env.ADMIN_INIT_EMAIL||"admin@mail.com";const pass=process.env.ADMIN_INIT_PASSWORD||"admin123";const hash=await bcrypt.hash(pass,10);await p.user.upsert({where:{email},update:{role:"ADMIN"},create:{email,password:hash,role:"ADMIN",name:"Admin"}});console.log("[seed] admin:",email,"password:",pass);process.exit(0)})()'
```

Akses aplikasi: **http://localhost:3026** (frontend disajikan oleh backend build).  
Login pakai akun admin yang di-seed di langkah (3). Setelah itu, Anda bisa membuat user lain via halaman **Users** (ADMIN only).

> **Catatan:** Perintah `command` pada service `app` sudah menjalankan `npx prisma generate` sebelum start server, namun **`db push` tetap perlu dijalankan** sekali saat awal untuk membuat tabel.

---

## Endpoint Utama (REST)

Semua path diawali `/api`.

### Auth

- `POST /auth/login` — body `{ email, password }` → set cookie `token` (httpOnly)
- `GET  /auth/me` — `{ ok, user: { id, email, role } }`
- `POST /auth/logout` — hapus cookie

### Logs — (login required)

- `GET /logs` — query: `limit`, `q`, `level`, `category`, `start`, `end`
- `GET /logs/categories` — daftar kategori unik

### Users — (ADMIN)

- `GET    /users?limit=...`
- `POST   /users` — `{ email, name?, password, role? }`
- `PUT    /users/:id` — `{ email?, name?, password?, role? }`
- `DELETE /users/:id`

### Contacts — (ADMIN)

- `GET    /contacts?limit=...&q=...`
- `POST   /contacts` — `{ phone, name?, allowed? }`
- `PUT    /contacts/:id` — `{ phone?, name?, allowed? }`
- `DELETE /contacts/:id`

### Subscribes — (login required)

- `GET /subscribes` — opsional `?topic=ALARM|BRANKAS`  
  (menarik subscriber aktif dari contact `allowed=true`).

### ESP — (opsional pakai API Key)

- `POST /esp` — header **`x-esp-apikey: ${ESP_API_KEY}`** jika diaktifkan; body sesuai payload ESP (log/event).

### WPPConnect — (ADMIN)

- `POST /wpp/...` — utilitas integrasi (generate token, kirim pesan, dsb).

> Guard ringkas: **/users**, **/contacts**, **/wpp** = admin-only; **/logs** & **/subscribes** = cukup login.

---

## Frontend (React + Vite)

Halaman:

- `/` — **Subscribers** (ringkas per phone vs topic)
- `/logs` — tabel log (filter opsional)
- `/contacts` — (ADMIN) CRUD + modal Add/Edit + Delete
- `/users` — (ADMIN) CRUD + **Role** + modal Add/Edit + Delete

Proteksi:

- `ProtectedRoute` — butuh login
- `AdminRoute` — butuh login & role `ADMIN`

---

## Lisensi

MIT.
