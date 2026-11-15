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
    }
    function clearAccount() {
        token = null;
        $('messages').replaceChildren(emptyState.cloneNode(true));
        $('metadata').hidden = true;
        $('history-list').textContent = 'Login untuk melihat riwayat akunmu.';
        $('previous-page').hidden = true;
        $('next-page').hidden = true;
        $('page-label').textContent = '';
        $('chat-status').textContent = 'Siap menerima ide';
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
        // Let readers scroll back through the answer without pulling them down.
        if (following) panel.scrollTop = panel.scrollHeight;
    }
    function showMetadata(payload) {
        const d = payload.data;
        $('metadata').hidden = false;
        $('metadata').textContent = `${d.provider} · ${payload.model_used} · ${d.token_consumed ?? 'tidak dilaporkan'} token · fallback: ${d.fallback_used ? 'ya' : 'tidak'} · ${payload.session_id} · ${payload.timestamp}`;
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
    $('chat-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (!token || busy) return;
        const prompt = $('prompt').value.trim();
        if (!prompt) return;
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
                // Keep draining the word queue after the provider completes.
                await writer.finished;
                showMetadata(finalPayload); completed = true;
            } else {
                const payload = await response.json();
                followAnswer(() => renderMarkdown(answer, payload.data.jawaban_ai));
                showMetadata(payload); completed = true;
            }
            feedback('chat-message', 'Jawaban selesai dan riwayat tersimpan.');
            $('prompt').value = ''; $('prompt').dispatchEvent(new Event('input'));
        } catch (error) {
            writer?.stop();
            if (!answer.textContent) answer.textContent = 'Belum ada jawaban dari AI.';
            feedback('chat-message', error.message, true);
        } finally {
            busy = false; syncAccess();
            $('chat-status').textContent = completed ? 'Selesai & tersimpan' : 'Request gagal';
        }
    });
    async function loadHistory(page = 1) {
        busy = true; syncAccess();
        try {
            const payload = await (await request(`/chat-ai/history?page=${page}`)).json();
            historyPage = payload.meta.current_page; historyLastPage = payload.meta.last_page;
            $('history-list').replaceChildren();
            if (!payload.data.length) $('history-list').textContent = 'Belum ada percakapan yang tersimpan.';
            for (const row of payload.data) {
                const item = document.createElement('details');
                const title = document.createElement('summary'); title.textContent = row.data.prompt;
                const content = document.createElement('div'); content.className = 'markdown-body';
                renderMarkdown(content, row.data.jawaban_ai);
                const meta = document.createElement('p'); meta.className = 'meta';
                meta.textContent = `${row.model_used} · ${row.data.token_consumed ?? 'tidak dilaporkan'} token · ${row.data.provider} · fallback: ${row.data.fallback_used} · ${row.session_id} · ${row.timestamp}`;
                item.append(title, content, meta); $('history-list').append(item);
            }
            $('page-label').textContent = `${historyPage} / ${historyLastPage}`;
            $('previous-page').hidden = historyPage <= 1;
            $('next-page').hidden = historyPage >= historyLastPage;
        } catch (error) { feedback('chat-message', error.message, true); }
        finally { busy = false; syncAccess(); }
    }
    $('history-button').addEventListener('click', () => loadHistory());
    $('previous-page').addEventListener('click', () => loadHistory(historyPage - 1));
    $('next-page').addEventListener('click', () => loadHistory(historyPage + 1));
})();
