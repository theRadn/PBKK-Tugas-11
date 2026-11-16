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
| **Respons di Interface dan API Chat JSON (HTTP 200)** | ![01 - Chat API 200](https://github.com/user-attachments/assets/fc62a51b-ba05-4d37-884a-b05773eea913) |
| **Metadata Model & Token Consumption** | ![02 - Metadata Model dan Token](https://github.com/user-attachments/assets/66c08874-6e2b-447f-bdb0-d223da0e5612) |

---

### 2. Autentikasi & Validasi Sanctum (Bobot 20%)
*Bukti rute terproteksi token Sanctum, penolakan akses tanpa token (401), dan validasi FormRequest (422).*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Rute API Terproteksi `auth:sanctum` (`route:list`)** | ![03 - Route List Sanctum](https://github.com/user-attachments/assets/2c8b3af8-acd5-46f0-8ade-5da8a183a6f1) |
| **Endpoint Login & Penerbitan Bearer Token** | ![04 - Login Token](https://github.com/user-attachments/assets/2ed79734-aca6-4e48-b352-cd94c6d353ce) |
| **Penolakan Akses Tanpa Token (HTTP 405)** | ![05 - Error 405 Tanpa Token](https://github.com/user-attachments/assets/2c2a9515-1cee-4bae-964c-a192bbf83060) |
---

### 3. Database Architecture & Chat Logging (Bobot 20%)
*Bukti skema relasional, logging lengkap interaksi, dan relasi Eloquent dengan tabel users.*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Skema Migrasi Tabel `chat_logs`** | ![06 - Skema Database](https://github.com/user-attachments/assets/fd93460b-7a6d-4fba-964b-c22e8e363801) |
| **Pencatatan Baris Database (`user_id`, `prompt`, `jawaban_ai`, `model`, `token`)** | <img width="717" height="290" alt="image" src="https://github.com/user-attachments/assets/ec22931c-f0e3-45b2-b8aa-cf850ba1753f" />
 |
| **Relasi Eloquent `User -> chatLogs` dan `ChatLog -> user`** | ![08 - Relasi Eloquent](https://github.com/user-attachments/assets/7e2c17b5-5a1d-48bf-aaa4-51c734b7b05c) |

---

### 4. Keberhasilan Challenge A+ (Bobot 10%)
*Bukti implementasi Challenge 1 (SSE Streaming), Challenge 2 (System Prompt Injection), dan Challenge 3 (Auto-fallback).*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **[Challenge 1] Streaming SSE (`text/event-stream`, event `delta` & `done`)** | [Screencast From 2026-11-16 10-51-13.webm](https://github.com/user-attachments/assets/8f13ba10-af8a-4baf-b524-cc4b1518a393) |
| **[Challenge 2] System Prompt Injection (Tema Asisten Ide Proyek PBKK)** | ![10 - System Prompt Injection](https://github.com/user-attachments/assets/2401993f-17fd-4061-896e-99564ad31ba9) |
| **[Challenge 3] Auto-fallback Otomatis Ollama ke Senopati ITS (`fallback_used: true`)** | ![11 - Auto Fallback](https://github.com/user-attachments/assets/d749909c-a3ea-41a9-ab76-eae0a46bd3f7) |

---

### 5. Antarmuka Web & Kerapian Kode (Bobot 10%)
*Bukti implementasi frontend interaktif (yang sudah tampil di atas), perenderan Markdown, multi-turn sesi, dan hasil test suite.*

| Bukti | Tangkapan Layar |
| :--- | :--- |
| **Manajemen Riwayat Percakapan per Sesi & Tombol Muat Ulang** | ![12 - Riwayat per Sesi](https://github.com/user-attachments/assets/cab9d5fd-3691-4821-9d37-91bd9acfe3eb) |

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
   SENOPATI_API_KEY=ada lah 

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
