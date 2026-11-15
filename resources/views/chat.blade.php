<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="same-origin">
    <title>Secure LLM Chat Hub · PBKK ITS</title>
    <link rel="stylesheet" href="{{ asset('chat-hub.css') }}">
    @vite('resources/js/chat-hub.js')
</head>
<body data-api="{{ url('/api') }}">
<header><a class="brand" href="{{ route('chat') }}"><span class="brand-icon">✳</span> Chat Hub <span class="badge">PBKK / ITS</span></a><a href="{{ route('dashboard') }}">Dashboard ↗</a></header>
<main>
    <section class="intro"><p class="eyebrow">SECURE LLM WORKSPACE</p><h1>Dari pertanyaan,<br>jadi ide yang bisa dibangun.</h1><p>Teman diskusi proyek PBKK. Mulai dari ide aplikasi, arsitektur Laravel, sampai keamanan API.</p></section>
    <div class="workspace">
        <aside>
            <section class="panel"><div class="panel-heading"><h2>01 / Akses akun</h2><span id="auth-status" class="badge">Belum terhubung</span></div>
                <form id="login-form"><label for="email">Email</label><input id="email" type="email" autocomplete="username" placeholder="nama@its.ac.id" required>
                <label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required>
                <button id="login-button" type="submit">Masuk & buat token <span>↗</span></button><button type="button" id="demo-login-button" class="secondary" style="margin-top: 8px; width: 100%;" onclick="document.getElementById('email').value='mahasiswa@its.ac.id'; document.getElementById('password').value='password';">Isi Akun Demo</button></form>
                <button id="logout-button" class="secondary" hidden>Keluar & cabut token</button>
                <p class="hint">Token berlaku 24 jam dan hanya disimpan dalam memori halaman. Muat ulang untuk login kembali.</p>
                <p id="login-message" role="status" class="feedback"></p>
            </section>
            <section class="panel"><h2>02 / Pengaturan AI</h2><label for="provider">Provider utama</label><select id="provider"><option value="">Default server</option><option value="ollama">Ollama lokal</option><option value="senopati">Senopati ITS</option></select>
                <label class="checkbox"><input type="checkbox" id="stream" checked> Streaming jawaban (SSE)</label>
                <p class="hint">Ollama → Senopati otomatis saat provider lokal gagal sebelum jawaban mulai terkirim, jika fallback diaktifkan server.</p>
                <div class="theme-note"><span class="eyebrow">TEMA ASISTEN</span><p>Ide proyek & rekayasa perangkat lunak PBKK</p></div>
            </section>
        </aside>
        <section class="panel conversation"><div class="panel-heading"><h2>Ruang diskusi</h2><span class="live"><i></i> <span id="chat-status">Siap menerima ide</span></span></div>
            <div id="messages" class="messages" aria-label="Percakapan"><div id="empty-state" class="empty-state"><span class="spark">✳</span><h3>Apa yang ingin kamu bangun?</h3><p>Pilih pemantik ide atau tulis pertanyaanmu sendiri.</p><div class="suggestions"><button type="button" data-prompt="Berikan ide proyek PBKK untuk membantu kegiatan mahasiswa ITS.">Cari ide proyek ↗</button><button type="button" data-prompt="Jelaskan arsitektur Laravel untuk aplikasi peminjaman ruang kampus.">Rancang arsitektur ↗</button><button type="button" data-prompt="Bagaimana mengamankan API Laravel menggunakan Sanctum?">Diskusi keamanan ↗</button></div></div></div>
            <div id="metadata" class="metadata" hidden></div>
            <form id="chat-form"><label for="prompt">Pertanyaanmu</label><textarea id="prompt" rows="3" maxlength="1000" placeholder="Misalnya: bantu rancang aplikasi mentoring mahasiswa…" required></textarea><div class="composer-footer"><span id="counter" class="hint">0 / 1000 karakter</span><button id="send-button" disabled>Kirim prompt <span>↑</span></button></div></form>
            <p id="chat-message" role="status" class="feedback">Login untuk mulai berdiskusi.</p>
        </section>
    </div>
    <section class="panel history"><div class="panel-heading"><div><p class="eyebrow">TERSIMPAN UNTUK AKUNMU</p><h2>Riwayat percakapan</h2></div><button id="history-button" class="secondary" disabled>Muat riwayat ↻</button></div><div id="history-list" class="hint">Jawaban yang selesai akan tersimpan bersama model dan pemakaian token.</div><div class="pagination"><button id="previous-page" class="secondary" hidden>← Sebelumnya</button><span id="page-label"></span><button id="next-page" class="secondary" hidden>Berikutnya →</button></div></section>
    <footer><span>Secure LLM Chat API Hub</span><span>Sanctum auth · System prompt · Live streaming</span></footer>
</main>
</body>
</html>
