# Secure LLM Chat API Hub — Panduan Instalasi, Pengujian, dan Screenshot

## Tangkapan Layar Rubrik Penilaian

- nanti masukin disini gaes biar nanti diperiksa lebih cepet

Panduan ini memakai **PowerShell + browser Chrome/Edge**. Tidak perlu Postman atau aplikasi database tambahan. Jalankan langkah sesuai urutan dari atas.

Aplikasi menggunakan Laravel, Sanctum, Ollama/Senopati ITS, database relasional, serta frontend chat dengan Markdown dan streaming per kata. Tema asisten: **ide proyek PBKK ITS**.

## Peta rubrik penilaian

| Komponen | Bobot | Bukti yang disiapkan |
| --- | --- | --- |
| Fungsionalitas & koneksi API LLM | 40% | Chat ke AI nyata berhasil, HTTP 200, JSON valid dan metadata |
| Autentikasi & validasi Sanctum | 20% | Route auth:sanctum, tanpa token 401, FormRequest menolak input 422 |
| Logging & riwayat DB | 20% | Baris database cocok dengan session_id respons, relasi dengan users |
| Keberhasilan challenge A+ | 10% | SSE, system prompt sesuai tema, dan fallback Ollama → Senopati |
| Kerapian kode & demo pitching | 10% | Struktur modular, pemeriksaan PSR-12, presentasi tim 5 menit |

**Penting:** alamat seperti `http://127.0.0.1:8000/chat` dimasukkan ke kolom alamat browser. Kode JavaScript `fetch(...)` dimasukkan ke tab **Console** browser. Perintah seperti `php artisan serve` dimasukkan ke **terminal PowerShell**, bukan browser.

## Bagian A — Instalasi sampai server berjalan

### 1. Buka terminal di folder proyek

Di VS Code, buka folder proyek lalu pilih **Terminal → New Terminal**. Pastikan terminal menggunakan PowerShell. Sesuaikan alamat folder tersebut

```powershell
cd [path-folder-proyek-laravel-di-laptop-mu]
```

Komputer perlu memiliki PHP, Composer, Node.js, dan npm. Lingkungan yang digunakan untuk pengembangan memakai PHP 8.5. Dependency harus memenuhi persyaratan pada lockfile.

### 2. Install dependency Laravel dan frontend

Jalankan satu per satu, tunggu tiap perintah selesai:

```powershell
composer install
```

```powershell
npm ci
```

`composer install` memasang dependency PHP, termasuk Sanctum. `npm ci` memasang dependency frontend sesuai `package-lock.json`.

### 3. Buat file .env hanya jika belum ada

```powershell
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    php artisan key:generate
}
```

Jika `.env` sudah ada dan aplikasi sudah pernah dipakai, **jangan menimpa file tersebut**. Jika `.env` ada tetapi nilai `APP_KEY` masih kosong, jalankan `php artisan key:generate` sekali.

### 4. Isi konfigurasi Senopati

Buka `.env` di editor. Pastikan nilai berikut tersedia; ubah baris yang sudah ada, jangan membuat nama variabel yang sama berulang:

```dotenv
DB_CONNECTION=sqlite

LLM_PROVIDER=ollama
LLM_FALLBACK_ENABLED=true
LLM_CONNECT_TIMEOUT=3
LLM_TIMEOUT=120

OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b

SENOPATI_CHAT_URL=https://senopati.its.ac.id/llm-gateway/v1/chat/completions
SENOPATI_MODEL=qwen3:14b
SENOPATI_API_KEY=GANTI_DENGAN_KEY_SENOPATI_ASLI
```

Contoh ini memakai database SQLite baru. Jika sebelumnya sudah menggunakan database lain, pertahankan konfigurasi database yang benar untuk instalasimu.

Isi API key asli di `.env` milikmu saja. **Jangan screenshot, commit, atau membagikan API key.**

Ada dua jenis token berbeda:

- **Key Senopati:** disimpan di `.env`, digunakan Laravel untuk menghubungi AI ITS.
- **Token Sanctum:** dihasilkan saat login, digunakan browser untuk mengakses API Laravel.

### 5. Buat database dan jalankan migration

Untuk konfigurasi SQLite di atas:

```powershell
if (!(Test-Path database/database.sqlite)) {
    New-Item database/database.sqlite -ItemType File | Out-Null
}
php artisan config:clear
php artisan migrate
```

Migration membuat tabel users, personal_access_tokens, chat_logs, dan tabel pendukung proyek.

### 6. Buat akun demo jika belum tersedia

**Instalasi baru:** jalankan:

```powershell
php artisan db:seed
```

**Jika akun demo sudah tersedia, lewati perintah seed.** Seeder mahasiswa lama menambah data acak jika dijalankan kembali. Tidak perlu menghapus database atau menjalankan `migrate:fresh` untuk mengikuti panduan ini.

| Akun demo lokal | Password |
| --- | --- |
| `mahasiswa@its.ac.id` | `password` |
| `dosenpbkk@its.ac.id` | `password` |

Akun demo ini untuk pengujian lokal, bukan akun production.

### 7. Build frontend

```powershell
npm run build
```

Tunggu sampai build selesai. Ini membundel halaman chat, renderer Markdown, sanitizer, serta aset frontend lainnya.

Setelah build, tidak perlu menjalankan `npm run dev` untuk demo ini. Jalankan build lagi jika source frontend berubah.

### 8. Jalankan Laravel

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

**Biarkan terminal ini tetap terbuka.** Kita menyebutnya **Terminal A**. Buka terminal kedua di folder yang sama untuk perintah lain, disebut **Terminal B**.

Jika port 8000 sudah digunakan server Laravel proyek ini, gunakan server yang sudah berjalan. Jika ingin memulai ulang, tekan **Ctrl + C** pada terminal server tersebut lalu jalankan perintah di atas lagi.

📸 **01-server.png:** terminal menampilkan server berjalan di `http://127.0.0.1:8000`.

### 9. Buka aplikasi dan cek koneksi Senopati

Di kolom alamat Chrome/Edge, masukkan **hanya alamat ini**:

```text
http://127.0.0.1:8000/chat
```

Jangan menambahkan kata `POST` atau `Content-Type` pada kolom alamat.

Di Terminal B, koneksi Senopati dapat diperiksa dengan:

```powershell
php scripts/diagnose-senopati.php
```

Hasil yang diharapkan: `api_key_present: true` dan akhirnya `result: success`. Script tidak menampilkan key. Script ini memeriksa koneksi AI; pembuktian logging dilakukan melalui endpoint chat pada langkah berikutnya.

## Bagian B — Siapkan pengujian API melalui browser

### 10. Buka Console dan pasang alat bantu

Tetap berada di halaman `http://127.0.0.1:8000/chat`:

1. Tekan **F12**, lalu pilih tab **Console**. Bisa juga memakai **Ctrl + Shift + J**.
2. Masukkan kode berikut ke Console, bukan kolom alamat browser.
3. Tekan **Enter** untuk menjalankan.

Jika browser memblokir penempelan kode, baca kodenya terlebih dahulu atau ketik langsung. Jangan menjalankan kode Console dari sumber yang tidak kamu pahami.

Kode ini membuat fungsi pembantu untuk mengirim request. Token login disimpan di memori Console dan disamarkan pada output:

```javascript
var hubToken = null;
var hubLastChat = null;

async function hubRequest(path, method = 'GET', body = null, pakaiToken = true) {
    var headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (pakaiToken && hubToken) {
        headers.Authorization = 'Bearer ' + hubToken;
    }

    var response = await fetch('/api' + path, {
        method: method,
        headers: headers,
        ...(body === null ? {} : { body: JSON.stringify(body) })
    });
    var payload = await response.json();
    var tampilan = JSON.parse(JSON.stringify(payload));

    if (path === '/login' && response.ok) {
        hubToken = payload.data.token;
        tampilan.data.token = '[TOKEN DISEMBUNYIKAN]';
    }
    if (path === '/chat-ai' && response.ok) {
        hubLastChat = payload;
    }

    console.log(method + ' /api' + path + ' — HTTP ' + response.status);
    console.log(JSON.stringify(tampilan, null, 2));
}
```

Fungsi ini hanya membantu pengujian dan tidak mengubah source aplikasi. Setelah halaman di-refresh, fungsi dan token Console hilang: ulangi langkah 10 lalu login pada langkah 12.

**Login Console dan login formulir halaman terpisah.** Untuk request Console gunakan langkah 12. Untuk tombol Kirim prompt di halaman, gunakan formulir login pada langkah 11/18.

## Bagian C — Fungsionalitas & koneksi API LLM (40%)

### 11. Uji frontend dengan AI nyata

Pada halaman `/chat`:

1. Isi email `mahasiswa@its.ac.id` dan password `password`.
2. Klik **Masuk & buat token**.
3. Pilih **Senopati ITS** pada Provider utama.
4. Untuk pengujian awal ini, **hapus centang Streaming jawaban (SSE)**.
5. Masukkan pertanyaan:

```text
Berikan satu ide aplikasi mentoring mahasiswa untuk proyek PBKK. Jelaskan judul, masalah, fitur, dan arsitektur Laravel.
```

6. Klik **Kirim prompt**, lalu tunggu sampai status **Selesai & tersimpan**.

📸 **02-frontend-ai.png:** pertanyaan, jawaban AI, dan metadata model/token. Ini bukti provider nyata bekerja, bukan hasil mock.

### 12. Login API melalui Console

Setelah alat bantu langkah 10 tersedia, jalankan di Console:

```javascript
await hubRequest('/login', 'POST', {
    email: 'mahasiswa@its.ac.id',
    password: 'password',
    device_name: 'browser-demo'
}, false);
```

Hasil yang diharapkan:

- **HTTP 200**.
- `status: success`.
- `token_type: Bearer` dan `expires_at`.
- Token sudah tersimpan di `hubToken`; output menampilkannya sebagai `[TOKEN DISEMBUNYIKAN]`.

📸 **03-login-token.png:** status 200 dan respons login yang sudah disamarkan. Potong area screenshot agar baris kode password tidak terlihat, atau samarkan password sebelum dibagikan.

### 13. Uji endpoint chat dan ambil JSON murni

Masih di Console yang sama:

```javascript
await hubRequest('/chat-ai', 'POST', {
    prompt: 'Berikan ide proyek PBKK untuk aplikasi peminjaman ruang kampus. Jelaskan singkat fitur dan arsitekturnya.',
    provider: 'senopati',
    stream: false
});
```

Hasil yang diharapkan: **HTTP 200** dan JSON dengan struktur berikut. Isi jawaban, ID, timestamp, dan jumlah token mengikuti respons nyata:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "prompt": "...",
    "jawaban_ai": "...",
    "token_consumed": 123,
    "provider": "senopati",
    "fallback_used": false
  },
  "session_id": "UUID-interaksi",
  "model_used": "qwen3:14b",
  "timestamp": "waktu-respons"
}
```

📸 **04-api-json-200.png:** Console memperlihatkan request, HTTP 200, jawaban, dan field standar. Jawaban AI pada API tetap berupa string Markdown; frontend yang merendernya menjadi heading/tabel/kode.

Catat ID interaksi untuk bukti database:

```javascript
console.log('SESSION UNTUK DICOCOKKAN:', hubLastChat.session_id);
```

Salin **session_id**, bukan token. Jangan melakukan chat baru sebelum mengambil bukti database langkah 17 agar mudah dicocokkan.

## Bagian D — Autentikasi & validasi Sanctum (20%)

### 14. Buktikan akses tanpa token ditolak

Jalankan di Console:

```javascript
await hubRequest('/chat-ai', 'POST', {
    prompt: 'Berikan ide proyek PBKK.'
}, false);
```

Argumen terakhir `false` sengaja tidak mengirim token, walaupun sebelumnya sudah login.

Hasil yang diharapkan: **HTTP 401**, `status: error`. Pesan Console berwarna merah untuk request 401 dapat muncul; pada uji ini **401 adalah hasil yang benar karena pengamanan bekerja**.

📸 **05-tanpa-token-401.png:** perintah tanpa token, HTTP 401, dan JSON penolakan.

Di Terminal B:

```powershell
php artisan route:list --path=api -v
```

📸 **06-route-sanctum.png:** baris `POST api/chat-ai` dengan middleware `Authenticate:sanctum`.

### 15. Buktikan input tidak valid ditolak

Pastikan token Console dari langkah 12 masih aktif. Jalankan satu per satu:

Prompt tidak dikirim:

```javascript
await hubRequest('/chat-ai', 'POST', {});
```

Prompt berupa angka:

```javascript
await hubRequest('/chat-ai', 'POST', { prompt: 123 });
```

Prompt lebih dari 1000 karakter:

```javascript
await hubRequest('/chat-ai', 'POST', { prompt: 'a'.repeat(1001) });
```

Hasil masing-masing: **HTTP 422** dan `errors.prompt`. Uji ini tidak memanggil AI karena input sudah ditolak lebih dahulu.

📸 **07-validasi-422.png:** minimal kasus kosong dan panjang 1001 karakter, lengkap dengan status dan errors.prompt. Bisa dibuat dua gambar jika tidak muat.

Buka [ChatRequest.php](app/Http/Requests/ChatRequest.php) di editor.

📸 **08-formrequest.png:** kelas `ChatRequest` dan rules `required`, `string`, `max:1000`.

### 16. Tunjukkan API Resource dan struktur kode

Buka file berikut di editor:

- [ChatController.php](app/Http/Controllers/Api/ChatController.php): menerima request dan menyimpan hasil.
- [ChatResource.php](app/Http/Resources/ChatResource.php): format output `status`, `data`, `session_id`, `model_used`, `timestamp`.
- [LlmService.php](app/Services/LlmService.php): koneksi provider, metadata, dan fallback.

📸 **09-api-resource.png:** mapping field JSON pada Resource. Cocokkan dengan screenshot 04.

## Bagian E — Logging & riwayat database (20%)

### 17. Cocokkan respons AI dengan data yang tersimpan

Gunakan **session_id dari langkah 13**. Di Terminal B:

```powershell
php artisan tinker
```

Setelah muncul prompt Tinker, ketik perintah PHP berikut satu per satu. Ganti `TEMPEL_SESSION_ID_DARI_LANGKAH_13` dengan UUID asli yang kamu salin:

```php
$log = App\Models\ChatLog::where('session_id', 'TEMPEL_SESSION_ID_DARI_LANGKAH_13')->firstOrFail();
```

```php
dump($log->only(['id', 'user_id', 'session_id', 'prompt', 'jawaban_ai', 'provider', 'model_used', 'token_consumed', 'fallback_used', 'created_at']));
```

📸 **10-log-database.png:** hasil dump berisi user_id, prompt, jawaban_ai, model_used, token_consumed, dan session_id yang sama dengan screenshot 04.

Periksa relasi ke user:

```php
dump($log->user->only(['id', 'name']));
dump($log->user->chatLogs()->where('session_id', $log->session_id)->count());
```

Hasil count seharusnya **1**.

📸 **11-relasi-user.png:** user pemilik log dan hasil count 1. Jangan dump seluruh tabel users atau personal_access_tokens.

Keluar dari Tinker:

```php
exit
```

Buka [migration chat_logs](database/migrations/2026_11_15_000001_create_chat_logs_table.php), [ChatLog.php](app/Models/ChatLog.php), dan [User.php](app/Models/User.php).

📸 **12-skema-relasi.png:** foreign key `user_id` ke users dan relasi `ChatLog::user()` / `User::chatLogs()`. Hubungannya **users 1 → N chat_logs**. `session_id` adalah ID satu interaksi, bukan konteks percakapan multi-turn.

Untuk history API, di Console browser:

```javascript
await hubRequest('/chat-ai/history?page=1');
```

Hasil: **HTTP 200**, daftar riwayat user aktif, dan metadata pagination. Data user lain tidak semestinya muncul.

📸 **13-history-api.png:** respons history yang memuat interaksi tadi.

## Bagian F — Challenge A+ (10%)

Rubrik menyebut streaming, custom system prompt, atau fallback otomatis. Proyek menyediakan ketiganya; ambil bukti masing-masing agar jelas.

### 18. Uji streaming dan render Markdown

Pada halaman `/chat` (gunakan formulir login halaman jika belum terhubung):

1. Pilih provider **Senopati ITS**.
2. Centang **Streaming jawaban (SSE)**.
3. Buka DevTools **Network**, pilih filter **Fetch/XHR**, lalu hapus isi daftar request lama jika perlu.
4. Kirim prompt:

```text
Buat dokumentasi ide proyek PBKK mentoring mahasiswa. Maksimal 150 kata. Gunakan heading, daftar fitur dengan bold, tabel komponen dan fungsi, serta contoh kode PHP singkat.
```

5. Perhatikan teks muncul per kata dan berubah menjadi heading, daftar, tabel, serta blok kode.
6. Di Network, pilih request `chat-ai` terbaru. Buka tab **EventStream** jika tersedia. Jika browser tidak menampilkan EventStream, periksa tab **Response** setelah request selesai.

Event yang diharapkan:

```text
event: start
event: delta
event: delta
...
event: done
```

📸 **14-sse-events.png:** beberapa delta dan done. Jangan screenshot header Authorization yang memuat token.

📸 **15-markdown-frontend.png:** hasil heading, daftar, tabel, blok kode, dan metadata. Tambahkan **rekaman singkat** atau dua screenshot pada waktu berbeda untuk menunjukkan perubahan bertahap.

Antrean kata memperhalus tampilan delta yang datang sekaligus. Bukti SSE berasal dari event jaringan; animasi mengetik saja bukan bukti bahwa backend streaming. Saat provider belum mengirim teks, indikator menunggu tetap dapat muncul.

Klik **Muat riwayat**, lalu buka interaksi tadi.

📸 **16-history-markdown.png:** jawaban tersimpan tetap dirender sebagai Markdown.

### 19. Uji custom system prompt

Buka [config/llm.php](config/llm.php), tunjukkan nilai `system_prompt` dengan tema asisten ide proyek PBKK.

Buka [LlmService.php](app/Services/LlmService.php), tunjukkan urutan pesan:

```php
['role' => 'system', 'content' => ...],
['role' => 'user', 'content' => $prompt],
```

Kirim pertanyaan bertema PBKK dan cocokkan jawabannya dengan tema yang diatur.

📸 **17-system-prompt.png:** tema di konfigurasi dan penerapannya sebagai role system. Pasangkan dengan jawaban relevan pada screenshot 02/15. Perilaku jawaban saja tidak membuktikan role system; kode dan test payload memberi bukti teknisnya.

### 20. Uji fallback otomatis Ollama → Senopati

Pastikan chat **provider Senopati langsung sudah berhasil** sebelum langkah ini.

Jika Ollama tersedia, bisa jalankan terlebih dahulu:

```powershell
ollama pull llama3.2:3b
ollama serve
```

Jika Ollama desktop sudah aktif, tidak perlu menjalankan server kedua. Uji provider Ollama lewat dropdown untuk membuktikan provider lokal bekerja.

Untuk menguji fallback, ada dua pilihan:

- **Server benar-benar mati:** hentikan Ollama, gunakan OLLAMA_URL semula.
- **Simulasi tidak terjangkau:** jika tidak memiliki Ollama, catat OLLAMA_URL semula lalu ubah sementara ke port yang tidak dipakai:

```dotenv
OLLAMA_URL=http://127.0.0.1:11435
LLM_FALLBACK_ENABLED=true
```

Sebutkan bahwa pilihan kedua adalah simulasi koneksi lokal tidak tersedia.

Di Terminal B:

```powershell
php artisan config:clear
```

Agar konfigurasi server terbaca ulang dengan pasti, pada Terminal A tekan Ctrl + C lalu jalankan server lagi:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Jangan refresh browser selama masih memakai token Console; jika terlanjur refresh, ulangi langkah 10 dan 12.

Di Console:

```javascript
await hubRequest('/chat-ai', 'POST', {
    prompt: 'Berikan satu ide proyek PBKK untuk mahasiswa ITS.',
    provider: 'ollama',
    stream: false
});
```

Hasil yang diharapkan:

- HTTP **200**.
- Request tetap memilih `ollama`.
- Respons `data.provider` menjadi **senopati**.
- `data.fallback_used` menjadi **true**.
- Nama model aktual Senopati terlihat pada `model_used`.

📸 **18-fallback.png:** request provider Ollama dan respons sukses Senopati dalam satu gambar.

Ulangi query database langkah 17 dengan session_id fallback ini.

📸 **19-fallback-log.png:** row log dengan `provider: senopati` dan `fallback_used: true`.

Untuk versi SSE, pada halaman chat pilih **Ollama lokal**, centang streaming, lalu kirim prompt. Network seharusnya memperlihatkan `fallback → delta → done`.

**Setelah selesai, kembalikan OLLAMA_URL ke nilai semula, clear config, dan restart server.** Fallback tidak menggabungkan jawaban dua model jika Ollama sudah sempat mengirim teks lalu terputus; dalam kondisi itu stream ditandai error.

## Bagian G — Kerapian kode & demo pitching (10%)

### 21. Tunjukkan pembagian kode yang modular

| Bagian | File |
| --- | --- |
| Login/token | `app/Http/Controllers/Api/TokenController.php` |
| Endpoint chat | `app/Http/Controllers/Api/ChatController.php` |
| Validasi | `app/Http/Requests/ChatRequest.php` |
| Format JSON | `app/Http/Resources/ChatResource.php` |
| Integrasi AI/fallback | `app/Services/LlmService.php` |
| Database/relasi | `app/Models/ChatLog.php`, `app/Models/User.php`, migration chat |
| Konfigurasi tema/provider | `config/llm.php` |
| Frontend | `resources/js/chat-hub.js` |
| Markdown/antrean kata | `resources/js/chat-presentation.js` |

📸 **20-struktur-kode.png:** struktur folder dan pemisahan tanggung jawab di editor.

### 22. Jalankan test fitur dan pemeriksaan format

Di Terminal B:

```powershell
php artisan test --filter=ChatApiTest
```

```powershell
npm run test:chat-ui
```

```powershell
npm run types:check
```

📸 **21-tests.png:** hasil test yang benar-benar lulus. Test chat menggunakan AI tiruan dan SQLite in-memory; bukti koneksi AI nyata tetap berasal dari langkah 11/13/18.

Pemeriksaan PSR-12, sesuai istilah pada rubrik:

```powershell
php vendor/bin/pint --preset=psr12 --test app/Http/Controllers/Api app/Http/Requests/ChatRequest.php app/Http/Resources/ChatResource.php app/Services/LlmService.php app/Models/ChatLog.php
```

Perintah `--test` hanya memeriksa dan tidak menulis perubahan. Proyek memiliki preset default **Laravel** pada `pint.json`; hasil preset Laravel tidak otomatis berarti PSR-12 lulus. Jika pemeriksaan PSR-12 melaporkan file perlu diperbaiki, jangan mengklaim sudah lulus. Untuk menerapkan format PSR-12 pada file yang sama, jalankan perintah di atas **tanpa `--test`**, review diff, lalu ulangi test fitur dan pemeriksaan PSR-12.

📸 **22-format-psr12.png:** hasil pemeriksaan PSR-12 setelah benar-benar lulus.

Opsional, periksa audit dependency frontend:

```powershell
npm audit
```

### 23. Siapkan presentasi tim selama 5 menit

| Waktu | Materi dan bukti |
| --- | --- |
| 0:00–0:30 | Masalah yang diselesaikan, tema, arsitektur aplikasi |
| 0:30–1:45 | Login, chat AI nyata, JSON 200 dan metadata |
| 1:45–2:30 | Tanpa token 401, input invalid 422, FormRequest |
| 2:30–3:15 | session_id respons cocok dengan database dan relasi users |
| 3:15–4:30 | SSE, Markdown, system prompt, fallback |
| 4:30–5:00 | Struktur kode, hasil test/format, penutup demo |

Bagi peran agar perpindahan pembicara dan layar lancar. Siapkan screenshot sebagai cadangan jika koneksi AI tidak stabil saat presentasi; jelaskan apakah bukti diambil dari pengujian sebelumnya atau demo langsung.

## Bagian H — Setelah pengujian

### 24. Cabut token pengujian

Token Console dapat dicabut dengan:

```javascript
await hubRequest('/logout', 'DELETE');
await hubRequest('/chat-ai/history');
```

Hasil pertama HTTP **200**, lalu history dengan token yang sama menghasilkan **401**. Jangan menjalankan login lagi di antara dua perintah tersebut.

📸 **23-logout.png:** token dicabut dan request berikutnya ditolak.

Klik **Keluar & cabut token** pada halaman chat untuk mencabut token formulir halaman juga. Kedua login menggunakan token berbeda.

### 25. Simpan bukti dengan aman

Tekan **Windows + Shift + S** untuk mengambil screenshot. Simpan file sesuai nomor di panduan ini. Samarkan password/token/key; jangan screenshot seluruh `.env` atau tabel kredensial.

Bukti yang paling kuat untuk tiga komponen utama adalah:

1. **04-api-json-200.png**: koneksi AI nyata dan JSON standar.
2. **05-tanpa-token-401.png + 07-validasi-422.png**: proteksi dan validasi.
3. **10-log-database.png**: session_id cocok dengan respons API.

## Bantuan jika terhenti

| Gejala | Langkah berikutnya |
| --- | --- |
| Alamat API menjadi Google Search | Kolom alamat hanya diisi URL; kode pengujian dimasukkan ke Console |
| `hubRequest is not defined` | Ulangi langkah 10 setelah refresh halaman |
| Console mendapat 401 saat seharusnya login | Ulangi login Console langkah 12; login formulir halaman tidak mengisi hubToken |
| Mendapat 429 | Tunggu sesuai Retry-After; login dibatasi 5 request/menit per IP, chat 20/menit per user |
| Belum ada jawaban / 503 | Periksa pilihan provider, key Senopati, lalu `php scripts/diagnose-senopati.php` |
| Tampilan frontend masih versi lama | Jalankan `npm run build`, tekan Ctrl + F5, lalu login kembali |
| Vite manifest tidak ditemukan | Jalankan `npm ci`, kemudian `npm run build` |
| Mengubah .env tetapi efeknya belum terlihat | Clear config lalu restart server |
| Token usage null | Provider belum melaporkan usage; jangan mengisi angka buatan |
| Uji database tidak menemukan session_id | Pastikan UUID dari respons sukses, database yang dibuka sesuai .env, dan request benar-benar selesai |

## Referensi tambahan

- [Panduan screenshot sebelumnya / contoh Postman](docs/PENGUJIAN-DAN-SCREENSHOT.md) — opsional; panduan utama di atas tidak membutuhkan Postman.
- [Catatan hasil pemeriksaan dan batas verifikasi](docs/VERIFIKASI.md).
- [Dokumentasi dashboard dan RBAC sebelumnya](docs/PROYEK-SEBELUMNYA.md).
- [Collection Postman](docs/Secure-LLM-Hub.postman_collection.json) — opsional.

File dokumentasi lain tetap disimpan. Respons 401/422 yang memang diminta pada pengujian adalah bukti penolakan akses/input yang benar, berbeda dari kegagalan implementasi atau advisory kerentanan dependency.
