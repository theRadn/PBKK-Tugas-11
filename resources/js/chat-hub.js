import { createMarkdownRenderer, createWordStream } from './chat-presentation.js';
import '../css/chat-markdown.css';

(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const api = document.body.dataset.api;
    const renderMarkdown = createMarkdownRenderer(window);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let token = null;
    let busy = false;
    let currentSessionId = null;
    let historyPage = 1;
    let historyLastPage = 1;
    const emptyState = $('empty-state').cloneNode(true);
    const feedback = (id, text, error = false) => {
        $(id).textContent = text;
        $(id).classList.toggle('error', error);
    };
    function syncAccess() {
        $('send-button').disabled = !token || busy;
        $('history-button').disabled = !token || busy;
        $('logout-button').disabled = busy;
        $('login-button').disabled = !!token || busy;
        $('auth-status').textContent = token ? 'Terhubung' : 'Belum terhubung';
        $('login-form').hidden = !!token;
        $('logout-button').hidden = !token;
        $('provider').disabled = busy;
        $('stream').disabled = busy;
        $('previous-page').disabled = !token || busy;
        $('next-page').disabled = !token || busy;
        if ($('new-session-button')) $('new-session-button').disabled = !token || busy;
    }
    function startNewSession() {
        currentSessionId = null;
        $('messages').replaceChildren(emptyState.cloneNode(true));
        $('metadata').hidden = true;
        if ($('active-session-badge')) $('active-session-badge').style.display = 'none';
        if ($('new-session-button')) $('new-session-button').hidden = true;
        $('chat-status').textContent = 'Siap menerima ide';
        feedback('chat-message', 'Sesi baru dimulai. Kirim pertanyaanmu.');
    }
    function clearAccount() {
        token = null;
        startNewSession();
        $('history-list').textContent = 'Login untuk melihat riwayat sesi akunmu.';
        $('previous-page').hidden = true;
        $('next-page').hidden = true;
        $('page-label').textContent = '';
        feedback('chat-message', 'Login untuk mulai berdiskusi.');
        syncAccess();
    }
    async function request(path, options = {}) {
        const response = await fetch(api + path, {
            ...options,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            if (response.status === 401 && token) clearAccount();
            const errors = Object.values(payload.errors || {}).flat().join(' ');
            throw new Error(`${response.status} · ${errors || payload.message || 'Request gagal.'}`);
        }
        return response;
    }
    $('login-form').addEventListener('submit', async event => {
        event.preventDefault();
        busy = true; syncAccess();
        feedback('login-message', 'Menghubungkan akun…');
        try {
            const response = await request('/login', { method: 'POST', body: JSON.stringify({
                email: $('email').value, password: $('password').value, device_name: 'web-chat-hub',
            }) });
            const payload = await response.json();
            token = payload.data.token;
            $('password').value = '';
            feedback('login-message', 'Akun terhubung. Token aktif selama 24 jam.');
            feedback('chat-message', 'Siap. Kirim pertanyaan pertama kamu.');
            loadHistory(1);
        } catch (error) { feedback('login-message', error.message, true); }
        finally { busy = false; syncAccess(); }
    });
    $('logout-button').addEventListener('click', async () => {
        busy = true; syncAccess();
        try {
            await request('/logout', { method: 'DELETE' });
            clearAccount();
            feedback('login-message', 'Token dicabut. Kamu sudah keluar.');
        } catch (error) { feedback('login-message', error.message, true); }
        finally { busy = false; syncAccess(); }
    });
    if ($('new-session-button')) {
        $('new-session-button').addEventListener('click', () => {
            if (busy) return;
            startNewSession();
        });
    }
    $('messages').addEventListener('click', event => {
        const button = event.target.closest('[data-prompt]');
        if (!button) return;
        $('prompt').value = button.dataset.prompt;
        $('prompt').dispatchEvent(new Event('input'));
        $('prompt').focus();
    });
    $('prompt').addEventListener('input', () => {
        $('counter').textContent = `${Array.from($('prompt').value).length} / 1000 karakter`;
    });
    function message(role, text) {
        $('empty-state')?.remove();
        const node = document.createElement('div'); node.className = `message ${role}`;
        const label = document.createElement('span'); label.className = 'message-label';
        label.textContent = role === 'user' ? 'Kamu' : 'Asisten PBKK';
        const content = document.createElement('div');
        content.className = role === 'assistant' ? 'markdown-body' : 'message-text';
        if (role === 'assistant') renderMarkdown(content, text);
        else content.textContent = text;
        node.append(label, content); $('messages').append(node);
        return content;
    }
    function followAnswer(paint) {
        const panel = $('messages');
        const following = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 100;
        paint();
        if (following) panel.scrollTop = panel.scrollHeight;
    }
    function showMetadata(payload) {
        const d = payload.data;
        $('metadata').hidden = false;
        $('metadata').textContent = `${d.provider} · ${payload.model_used} · ${d.token_consumed ?? 'tidak dilaporkan'} token · fallback: ${d.fallback_used ? 'ya' : 'tidak'} · sesi: ${payload.session_id} · ${payload.timestamp}`;
    }
    function updateSessionBadge(sessionId) {
        currentSessionId = sessionId;
        if ($('active-session-badge')) {
            $('active-session-badge').style.display = 'inline-block';
            $('active-session-badge').textContent = `Sesi: ${sessionId.slice(0, 8)}…`;
        }
        if ($('new-session-button')) $('new-session-button').hidden = false;
    }
    async function readEvents(response, onEvent) {
        if (!response.body) throw new Error('Browser tidak mendukung response streaming.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { value, done } = await reader.read();
                buffer += decoder.decode(value, { stream: !done });
                buffer = buffer.replace(/\r\n/g, '\n');
                let boundary;
                while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                    const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
                    let name = 'message'; const data = [];
                    for (const line of block.split('\n')) {
                        if (line.startsWith('event:')) name = line.slice(6).trim();
                        if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
                    }
                    if (data.length) onEvent(name, JSON.parse(data.join('\n')));
                }
                if (done) break;
            }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
    $('prompt').addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            $('chat-form').requestSubmit();
        }
    });
    $('chat-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (!token || busy) return;
        const prompt = $('prompt').value.trim();
        if (!prompt) return;

        // Kosongkan textarea seketika saat tombol kirim ditekan
        $('prompt').value = '';
        $('prompt').dispatchEvent(new Event('input'));

        busy = true; syncAccess();
        $('metadata').hidden = true;
        message('user', prompt);
        const answer = message('assistant', '');
        $('messages').scrollTop = $('messages').scrollHeight;
        const streaming = $('stream').checked;
        const writer = streaming ? createWordStream({
            reducedMotion,
            render: text => followAnswer(() => renderMarkdown(answer, text)),
            onState: state => {
                answer.parentElement.classList.toggle('is-typing', state !== 'done');
                answer.parentElement.classList.toggle('is-waiting', state === 'waiting');
                answer.parentElement.setAttribute('aria-busy', state === 'done' ? 'false' : 'true');
                if (state === 'typing') $('chat-status').textContent = 'Sedang menulis…';
                if (state === 'waiting') $('chat-status').textContent = 'Menunggu respons AI…';
            },
        }) : null;
        $('chat-status').textContent = 'Sedang berpikir…';
        feedback('chat-message', 'Menghubungi provider AI…');
        let completed = false;
        try {
            const body = { prompt, stream: streaming };
            if (currentSessionId) body.session_id = currentSessionId;
            if ($('provider').value) body.provider = $('provider').value;
            const response = await request('/chat-ai', { method: 'POST', body: JSON.stringify(body),
                headers: { Accept: streaming ? 'text/event-stream' : 'application/json' } });
            if (streaming) {
                let finalPayload = null;
                await readEvents(response, (name, payload) => {
                    if (name === 'delta') {
                        writer.push(payload.data.text);
                        feedback('chat-message', 'Jawaban sedang ditulis…');
                    }
                    if (name === 'fallback') feedback('chat-message', 'Ollama tidak tersedia. Beralih ke Senopati ITS…');
                    if (name === 'done') {
                        finalPayload = payload;
                        writer.finish(payload.data.jawaban_ai);
                    }
                    if (name === 'error') throw new Error(payload.message);
                });
                if (!finalPayload) throw new Error('Stream terputus sebelum selesai. Jawaban belum tersimpan.');
                await writer.finished;
                showMetadata(finalPayload);
                updateSessionBadge(finalPayload.session_id);
                completed = true;
            } else {
                const payload = await response.json();
                followAnswer(() => renderMarkdown(answer, payload.data.jawaban_ai));
                showMetadata(payload);
                updateSessionBadge(payload.session_id);
                completed = true;
            }
            feedback('chat-message', 'Jawaban selesai dan riwayat tersimpan.');
            loadHistory(historyPage);
        } catch (error) {
            writer?.stop();
            if (!answer.textContent) answer.textContent = 'Belum ada jawaban dari AI.';
            feedback('chat-message', error.message, true);
            if (!$('prompt').value) {
                $('prompt').value = prompt;
                $('prompt').dispatchEvent(new Event('input'));
            }
        } finally {
            busy = false; syncAccess();
            $('chat-status').textContent = completed ? 'Selesai & tersimpan' : 'Request gagal';
        }
    });

    async function openSession(sessionId) {
        if (busy) return;
        busy = true; syncAccess();
        feedback('chat-message', 'Memuat percakapan sesi…');
        try {
            const payload = await (await request(`/chat-ai/sessions/${sessionId}`)).json();
            const msgs = payload.data.messages;
            $('messages').replaceChildren();
            for (const item of msgs) {
                message('user', item.data.prompt);
                const ans = message('assistant', '');
                renderMarkdown(ans, item.data.jawaban_ai);
            }
            $('messages').scrollTop = $('messages').scrollHeight;
            updateSessionBadge(sessionId);
            const last = msgs[msgs.length - 1];
            if (last) showMetadata(last);
            feedback('chat-message', `Sesi dimuat (${msgs.length} pesan). Kamu bisa melanjutkan percakapan.`);
        } catch (error) {
            feedback('chat-message', error.message, true);
        } finally {
            busy = false; syncAccess();
        }
    }

    async function deleteSession(sessionId, event) {
        event?.stopPropagation();
        if (!confirm('Hapus sesi percakapan ini beserta seluruh pesannya?')) return;
        busy = true; syncAccess();
        feedback('chat-message', 'Menghapus sesi…');
        try {
            await request(`/chat-ai/sessions/${sessionId}`, { method: 'DELETE' });
            if (currentSessionId === sessionId) startNewSession();
            feedback('chat-message', 'Sesi berhasil dihapus.');
            await loadHistory(historyPage);
        } catch (error) {
            feedback('chat-message', error.message, true);
        } finally {
            busy = false; syncAccess();
        }
    }

    async function loadHistory(page = 1) {
        if (!token) return;
        busy = true; syncAccess();
        try {
            const payload = await (await request(`/chat-ai/sessions?page=${page}`)).json();
            historyPage = payload.meta.current_page;
            historyLastPage = payload.meta.last_page || 1;
            $('history-list').replaceChildren();
            if (!payload.data.length) {
                $('history-list').textContent = 'Belum ada riwayat percakapan yang tersimpan.';
            }
            for (const row of payload.data) {
                const item = document.createElement('div');
                item.className = 'session-card';
                item.style.cssText = 'border-top: 1px solid var(--line); padding: 12px 0; display: flex; justify-content: space-between; align-items: center; gap: 12px;';

                const info = document.createElement('div');
                info.style.cssText = 'flex: 1; min-width: 0; cursor: pointer;';
                info.addEventListener('click', () => openSession(row.session_id));

                const title = document.createElement('div');
                title.style.cssText = 'font-weight: 600; font-size: 13px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                title.textContent = row.title || 'Percakapan tanpa judul';
                title.title = row.title;

                const meta = document.createElement('div');
                meta.className = 'meta';
                meta.style.cssText = 'font-size: 11px; color: var(--muted); margin-top: 3px;';
                meta.textContent = `${row.total_messages} pesan · ${row.model_used} · sesi: ${row.session_id.slice(0, 8)}…`;

                info.append(title, meta);

                const actions = document.createElement('div');
                actions.style.cssText = 'display: flex; align-items: center; gap: 6px; flex-shrink: 0;';

                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.className = 'secondary';
                openBtn.style.cssText = 'padding: 5px 11px; font-size: 11px;';
                openBtn.textContent = 'Buka ↗';
                openBtn.addEventListener('click', () => openSession(row.session_id));

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'secondary';
                delBtn.style.cssText = 'padding: 5px 9px; font-size: 11px; color: #b53636; border-color: #ecc;';
                delBtn.textContent = '✕';
                delBtn.title = 'Hapus sesi';
                delBtn.addEventListener('click', e => deleteSession(row.session_id, e));

                actions.append(openBtn, delBtn);
                item.append(info, actions);
                $('history-list').append(item);
            }
            $('page-label').textContent = `${historyPage} / ${historyLastPage}`;
            $('previous-page').hidden = historyPage <= 1;
            $('next-page').hidden = historyPage >= historyLastPage;
        } catch (error) {
            feedback('chat-message', error.message, true);
        } finally {
            busy = false; syncAccess();
        }
    }

    $('history-button').addEventListener('click', () => loadHistory(1));
    $('previous-page').addEventListener('click', () => loadHistory(historyPage - 1));
    $('next-page').addEventListener('click', () => loadHistory(historyPage + 1));
})();
