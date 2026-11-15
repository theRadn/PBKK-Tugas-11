# Secure LLM Chat API Hub — PBKK ITS

Aplikasi web dan API hub LLM aman berbasis **Laravel 11**, **Laravel Sanctum**, **Senopati AI ITS / Ollama**, dan **SQLite Relasional**. Memenuhi seluruh ketentuan tugas mata kuliah Pemrograman Berbasis Kerangka Kerja (PBKK) ITS.

---

## Daftar Isi
1. [Bukti Tangkapan Layar (Rubrik Penilaian)](#bukti-tangkapan-layar-rubrik-penilaian)
2. [Fitur Utama & Ketentuan Tugas](#fitur-utama--ketentuan-tugas)
3. [Panduan Instalasi & Menjalankan](#panduan-instalasi--menjalankan)
4. [Dokumentasi Endpoint API](#dokumentasi-endpoint-api)
5. [Spesifikasi Error Handling](#spesifikasi-error-handling)
6. [Pengujian Otomatis](#pengujian-otomatis)

---

## Bukti Tangkapan Layar (Rubrik Penilaian)

> **Catatan:** Masukkan file gambar hasil tangkapan layar ke dalam folder `docs/screenshots/` sesuai penamaan di bawah ini.

### 1. Fungsionalitas & Koneksi API LLM (Bobot 40%)
*Bukti request chat ke AI nyata berhasil, HTTP 200, format JSON terstandar, serta metadata model dan token.*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Respons API Chat JSON (HTTP 200)** | ![01 - Chat API 200](docs/screenshots/01-chat-api-200.png) |
| **Metadata Model & Token Consumption** | ![02 - Metadata Model dan Token](docs/screenshots/02-metadata-token.png) |
| **Respons AI Nyata pada Antarmuka Web** | ![03 - Chat Web AI Nyata](docs/screenshots/03-chat-web-ai.png) |

---

### 2. Autentikasi & Validasi Sanctum (Bobot 20%)
*Bukti rute terproteksi token Sanctum, penolakan akses tanpa token (401), dan validasi FormRequest (422).*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Rute API Terproteksi `auth:sanctum` (`route:list`)** | ![04 - Route List Sanctum](docs/screenshots/04-route-sanctum.png) |
| **Endpoint Login & Penerbitan Bearer Token** | ![05 - Login Token](docs/screenshots/05-login-token.png) |
| **Penolakan Akses Tanpa Token (HTTP 401)** | ![06 - Error 401 Tanpa Token](docs/screenshots/06-unauthorized-401.png) |
| **Penolakan Input Tidak Valid (HTTP 422 - Kosong / >1000 Karakter)** | ![07 - Validasi FormRequest 422](docs/screenshots/07-validasi-422.png) |

---

### 3. Database Architecture & Chat Logging (Bobot 20%)
*Bukti skema relasional, logging lengkap interaksi, dan relasi Eloquent dengan tabel users.*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Skema Migrasi Tabel `chat_logs`** | ![08 - Skema Database](docs/screenshots/08-skema-database.png) |
| **Pencatatan Baris Database (`user_id`, `prompt`, `jawaban_ai`, `model`, `token`)** | ![09 - Log Database](docs/screenshots/09-log-database.png) |
| **Kesesuaian `session_id` Respons API dengan Baris Database** | ![10 - Pencocokan Session ID](docs/screenshots/10-session-match.png) |
| **Relasi Eloquent `User -> chatLogs` dan `ChatLog -> user`** | ![11 - Relasi Eloquent](docs/screenshots/11-relasi-user.png) |

---

### 4. Keberhasilan Challenge A+ (Bobot 10%)
*Bukti implementasi Challenge 1 (SSE Streaming), Challenge 2 (System Prompt Injection), dan Challenge 3 (Auto-fallback).*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **[Challenge 1] Streaming SSE (`text/event-stream`, event `delta` & `done`)** | ![12 - SSE Streaming](docs/screenshots/12-sse-streaming.png) |
| **[Challenge 2] System Prompt Injection (Tema Asisten Ide Proyek PBKK)** | ![13 - System Prompt Injection](docs/screenshots/13-system-prompt.png) |
| **[Challenge 3] Auto-fallback Otomatis Ollama ke Senopati ITS (`fallback_used: true`)** | ![14 - Auto Fallback](docs/screenshots/14-auto-fallback.png) |

---

### 5. Antarmuka Web & Kerapian Kode (Bobot 10%)
*Bukti implementasi frontend interaktif, perenderan Markdown, multi-turn sesi, dan hasil test suite.*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Halaman Chat Interaktif (`/chat`) dengan Perenderan Markdown** | ![15 - Halaman Web Chat](docs/screenshots/15-frontend-chat.png) |
| **Manajemen Riwayat Percakapan per Sesi & Tombol Muat Ulang** | ![16 - Riwayat per Sesi](docs/screenshots/16-history-session.png) |
| **Hasil Eksekusi Automated Tests (`php artisan test`)** | ![17 - Unit dan Feature Test](docs/screenshots/17-tests-passed.png) |

---

## Fitur Utama & Ketentuan Tugas

1. **Autentikasi & Otorisasi API (Sanctum):**
   * Endpoint `POST /api/chat-ai` dikunci di bawah middleware `auth:sanctum`.
   * Endpoint `POST /api/login` menerbitkan token Bearer dengan masa berlaku 24 jam dan ability `['chat']`.
   * Endpoint `DELETE /api/logout` mencabut token akses aktif.
2. **Database Logging Relasional:**
   * Skema database menyimpan log lengkap setiap prompt dan respons: `user_id`, `session_id`, `prompt`, `jawaban_ai`, `provider`, `model_used`, `token_consumed`, dan `fallback_used`.
   * Relasi `User` (HasMany) ke `ChatLog` (BelongsTo) dengan `cascadeOnDelete`.
3. **Core LLM Service:**
   * Mendukung koneksi ke **Senopati AI ITS** (OpenAI-compatible gateway) dan **Ollama lokal**.
   * Menangkap teks jawaban, nama model aktif, serta total token yang dikonsumsi.
4. **[Challenge 1] Response Streaming (SSE):**
   * Mendukung Server-Sent Events (`text/event-stream`) via parameter `stream: true`.
   * Mengalirkan potongan teks secara live (`event: delta`) dan mengirimkan metadata akhir (`event: done`).
5. **[Challenge 2] System Prompt Injection:**
   * Diinjeksikan di level server: `Anda adalah asisten ide proyek PBKK ITS. Jawab dalam Bahasa Indonesia...`.
   * Aturan sistem tidak dapat ditimpa atau dimanipulasi oleh input pengguna.
6. **[Challenge 3] Auto-fallback:**
   * Apabila provider lokal (Ollama) terdeteksi tidak aktif sebelum respon terkirim, sistem otomatis mengalihkan request ke **Senopati AI ITS** dengan prompt yang sama dan mencatat `fallback_used: true`.
7. **Multi-turn Session Memory:**
   * Mendukung kelanjutan percakapan bersesi (`session_id`). AI mengingat konteks tanya-jawab terdahulu dalam sesi yang sama.
   * Frontend mendukung pemuatan ulang (*resume session*) dan pembuatan sesi baru (`+ Sesi Baru`).

---

## Panduan Instalasi & Menjalankan

### Prasyarat
* PHP >= 8.3 (ekstensi curl, sqlite3, mbstring aktif)
* Composer
* Node.js & npm

### Langkah Menjalankan Aplikasi

1. **Clone repository dan masuk ke direktori proyek:**
   ```powershell
   cd PBKK-Tugas-11
   ```

2. **Install dependency backend & frontend:**
   ```powershell
   composer install
   npm ci
   ```

3. **Salin konfigurasi environment & generate key:**
   ```powershell
   Copy-Item .env.example .env
   php artisan key:generate
   ```

4. **Konfigurasi `.env`:**
   Sesuaikan provider AI dan API key di file `.env`:
   ```dotenv
   DB_CONNECTION=sqlite

   LLM_PROVIDER=senopati
   LLM_FALLBACK_ENABLED=true
   LLM_CONNECT_TIMEOUT=3
   LLM_TIMEOUT=120

   # Konfigurasi Senopati AI ITS
   SENOPATI_CHAT_URL=https://senopati.its.ac.id/llm-gateway/v1/chat/completions
   SENOPATI_MODEL=qwen3:14b
   SENOPATI_API_KEY=masukkan_api_key_senopati_disini

   # Konfigurasi Ollama Lokal (jika digunakan)
   OLLAMA_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2:3b
   ```

5. **Inisialisasi database SQLite dan seeder akun demo:**
   ```powershell
   if (!(Test-Path database/database.sqlite)) {
       New-Item database/database.sqlite -ItemType File | Out-Null
   }
   php artisan migrate --seed
   ```

   *Akun Demo Bawaan:*
   | Email | Password | Role |
   | :--- | :--- | :--- |
   | `mahasiswa@its.ac.id` | `password` | Mahasiswa |
   | `dosenpbkk@its.ac.id` | `password` | Dosen |

6. **Jalankan server aplikasi (Backend, Queue, dan Vite):**
   ```powershell
   composer run dev
   ```
   Aplikasi dapat diakses melalui browser di: **`http://127.0.0.1:8000/chat`**

---

## Dokumentasi Endpoint API

Semua request API menerima header standar:
* `Accept: application/json`
* `Content-Type: application/json`
* `Authorization: Bearer <token>` *(untuk endpoint terproteksi)*

---

### 1. Autentikasi — Login & Generate Token
Menerbitkan Sanctum personal access token untuk klien API.

* **URL:** `POST /api/login`
* **Auth:** Tidak perlu token

**Request Body:**
```json
{
  "email": "mahasiswa@its.ac.id",
  "password": "password",
  "device_name": "api-client"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "token": "1|eWFrYd0VfndvkpFkyAf...",
    "token_type": "Bearer",
    "expires_at": "2026-11-16T15:00:00.000000Z"
  }
}
```

---

### 2. Chat AI — Kirim Prompt
Mengirimkan prompt ke model AI, menyimpan log interaksi, dan mengembalikan output terstandar.

* **URL:** `POST /api/chat-ai`
* **Auth:** `Bearer <token>` (Wajib)

**Parameter Request:**
| Field | Tipe | Wajib? | Keterangan |
| :--- | :---: | :---: | :--- |
| `prompt` | `string` | Ya | Pertanyaan pengguna (Maks. 1000 karakter). |
| `stream` | `boolean` | Tidak | `false` untuk JSON biasa (default), `true` untuk SSE. |
| `provider` | `string` | Tidak | `'senopati'` atau `'ollama'` (opsional, default mengikuti `.env`). |
| `session_id` | `uuid` | Tidak | ID sesi lama untuk melanjutkan percakapan bertingkat. |

#### A. Mode Standar (JSON — `stream: false`)
**Request Body:**
```json
{
  "prompt": "Berikan 1 ide proyek PBKK untuk monitoring lab kampus.",
  "stream": false,
  "provider": "senopati"
}
```

**Response (200 OK — API Resource Terstandar):**
```json
{
  "status": "success",
  "data": {
    "id": 14,
    "prompt": "Berikan 1 ide proyek PBKK untuk monitoring lab kampus.",
    "jawaban_ai": "Berikut adalah rancangan ide proyek:\n1. Judul: LabTrack ITS...",
    "token_consumed": 328,
    "provider": "senopati",
    "fallback_used": false
  },
  "session_id": "f09db914-0943-43bc-8c91-7a75ef2bfbd6",
  "model_used": "qwen3:14b",
  "timestamp": "2026-11-15T15:10:00.000000Z"
}
```

#### B. Mode Streaming (SSE — `stream: true`)
Header: `Accept: text/event-stream`

**Format EventStream:**
```text
event: start
data: {"status":"streaming","session_id":"f09db914...","timestamp":"..."}

event: delta
data: {"status":"streaming","data":{"type":"delta","text":"Berikut ","provider":"senopati","model_used":"qwen3:14b"},"session_id":"...","timestamp":"..."}

event: delta
data: {"status":"streaming","data":{"type":"delta","text":"rancangan ","provider":"senopati","model_used":"qwen3:14b"},"session_id":"...","timestamp":"..."}

event: done
data: {"status":"success","data":{"id":14,"prompt":"...","jawaban_ai":"...","token_consumed":328,"provider":"senopati","fallback_used":false},"session_id":"...","model_used":"qwen3:14b","timestamp":"..."}
```

---

### 3. Sesi Percakapan — Daftar Sesi
Mengambil daftar sesi percakapan milik pengguna yang dikelompokkan per topik.

* **URL:** `GET /api/chat-ai/sessions`
* **Auth:** `Bearer <token>` (Wajib)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "session_id": "f09db914-0943-43bc-8c91-7a75ef2bfbd6",
      "title": "Berikan 1 ide proyek PBKK untuk monitoring lab kampus.",
      "total_messages": 3,
      "model_used": "qwen3:14b",
      "last_activity": "2026-11-15 15:10:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1
  }
}
```

---

### 4. Sesi Percakapan — Ambil Riwayat Sesi Tertentu
Mengambil seluruh pesan tanya-jawab dalam satu sesi percakapan untuk dimuat ulang.

* **URL:** `GET /api/chat-ai/sessions/{sessionId}`
* **Auth:** `Bearer <token>` (Wajib)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "session_id": "f09db914-0943-43bc-8c91-7a75ef2bfbd6",
    "messages": [
      {
        "status": "success",
        "data": {
          "id": 14,
          "prompt": "Berikan 1 ide proyek...",
          "jawaban_ai": "Berikut...",
          "token_consumed": 328,
          "provider": "senopati",
          "fallback_used": false
        },
        "session_id": "f09db914...",
        "model_used": "qwen3:14b",
        "timestamp": "2026-11-15T15:10:00.000000Z"
      }
    ]
  }
}
```

---

### 5. Riwayat Log Global
Mengambil riwayat log interaksi pengguna dengan pagination standar.

* **URL:** `GET /api/chat-ai/history?page=1`
* **Auth:** `Bearer <token>` (Wajib)

---

### 6. Logout — Pencabutan Token
* **URL:** `DELETE /api/logout`
* **Auth:** `Bearer <token>` (Wajib)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": null
}
```

---

## Spesifikasi Error Handling

Seluruh endpoint API mengembalikan format penanganan error JSON terstandar:

### A. Tanpa Token / Token Tidak Valid (HTTP 401)
```json
{
  "status": "error",
  "data": null,
  "message": "Token tidak valid atau belum diberikan."
}
```

### B. Validasi Input Gagal (HTTP 422)
Terjadi jika prompt kosong, bukan string, atau melebihi 1000 karakter:
```json
{
  "status": "error",
  "data": null,
  "message": "Input tidak valid.",
  "errors": {
    "prompt": [
      "The prompt field is required."
    ]
  }
}
```

### C. Layanan AI Tidak Tersedia (HTTP 503)
Terjadi jika koneksi ke provider AI gagal atau mengalami timeout:
```json
{
  "status": "error",
  "data": null,
  "message": "Layanan AI tidak tersedia. Periksa konfigurasi provider atau coba lagi."
}
```

---

## Pengujian Otomatis

Proyek dilengkapi dengan test suite lengkap berbasis Pest/PHPUnit yang menguji seluruh fungsionalitas:
* Autentikasi Sanctum & proteksi route.
* Validasi input FormRequest.
* Format output API Resource.
* Logging database & relasi Eloquent.
* Streaming SSE & kelengkapan frame event.
* System prompt injection.
* Mekanisme auto-fallback provider.
* Multi-turn session context.

Jalankan pengujian dengan perintah:
```powershell
php artisan test --filter=ChatApiTest
```
Semua skenario pengujian dijamin lulus (*passing*).
