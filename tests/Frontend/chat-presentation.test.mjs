import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMarkdownRenderer, createWordStream } from '../../resources/js/chat-presentation.js';

function fakeClock() {
    let now = 0;
    let id = 0;
    const tasks = new Map();
    const clock = {
        now: () => now,
        setTimeout: (callback, delay) => {
            tasks.set(++id, { callback, time: now + delay });
            return id;
        },
        clearTimeout: task => tasks.delete(task),
        advance(ms) {
            const end = now + ms;
            for (let i = 0; i < 10000; i++) {
                const next = [...tasks].sort((a, b) => a[1].time - b[1].time)[0];
                if (!next || next[1].time > end) { now = end; return; }
                now = next[1].time;
                tasks.delete(next[0]);
                next[1].callback();
            }
            throw new Error('Timer queue did not settle.');
        },
        pending: () => tasks.size,
    };
    return clock;
}

function renderer() {
    const { window } = new JSDOM('<main></main>');
    return { element: window.document.querySelector('main'), render: createMarkdownRenderer(window) };
}

test('Markdown renders headings lists emphasis tables and fenced code', () => {
    const { element, render } = renderer();
    render(element, '# Ide PBKK\n\n**Fitur** dan *tujuan*.\n\n- Login\n- Chat\n\n| Fitur | Status |\n| --- | --- |\n| API | Siap |\n\n```php\necho "<halo>";\n```');
    assert.equal(element.querySelector('h1').textContent, 'Ide PBKK');
    assert.equal(element.querySelector('strong').textContent, 'Fitur');
    assert.equal(element.querySelectorAll('li').length, 2);
    assert.equal(element.querySelector('td').textContent, 'API');
    assert.match(element.querySelector('pre code').textContent, /<halo>/);
});

test('AI HTML cannot execute code load images or create unsafe links', () => {
    const { element, render } = renderer();
    render(element, '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<svg onload="alert(1)"></svg>\n\n[click](javascript:alert%281%29)\n\n![tracking](https://example.com/pixel)\n\n[Docs](https://laravel.com/docs)');
    assert.equal(element.querySelectorAll('script,img,svg,iframe,form,input').length, 0);
    for (const link of element.querySelectorAll('a')) {
        assert.ok(!link.getAttribute('href')?.startsWith('javascript:'));
        if (link.hasAttribute('href')) assert.equal(link.rel, 'noopener noreferrer');
    }
    assert.ok(element.textContent.includes('<script>'));
});

test('incomplete streaming Markdown stays safe and resolves into final formatting', () => {
    const { element, render } = renderer();
    const source = '## Rencana\n\n**Aman**\n\n```html\n<img src=x onerror=alert(1)>\n```';
    for (let length = 1; length <= source.length; length++) {
        render(element, source.slice(0, length));
        assert.equal(element.querySelectorAll('img,script,svg').length, 0);
    }
    assert.equal(element.querySelector('strong').textContent, 'Aman');
    assert.ok(element.querySelector('pre code').textContent.includes('<img'));
});

test('a burst is painted one word per timer and done does not dump the queue', async () => {
    const clock = fakeClock(); const frames = [];
    const writer = createWordStream({ clock, render: text => frames.push(text) });
    writer.push('Satu dua tiga empat.');
    assert.equal(frames.length, 0);
    writer.finish();
    clock.advance(220);
    assert.equal(frames[0], 'Satu ');
    assert.ok(frames.at(-1).length < 'Satu dua tiga empat.'.length);
    clock.advance(1000);
    assert.equal(await writer.finished, 'Satu dua tiga empat.');
    assert.equal(frames.at(-1), 'Satu dua tiga empat.');
    assert.equal(clock.pending(), 0);
});

test('word fragments across chunks and whitespace are never lost or duplicated', async () => {
    const clock = fakeClock(); const frames = [];
    const writer = createWordStream({ clock, render: text => frames.push(text) });
    writer.push('Sela'); clock.advance(500);
    assert.equal(frames.length, 0);
    writer.push('mat pagi\n\n'); clock.advance(220);
    writer.push('**ITS** 😊'); writer.finish(); clock.advance(2000);
    assert.equal(await writer.finished, 'Selamat pagi\n\n**ITS** 😊');
    assert.equal(frames.at(-1), 'Selamat pagi\n\n**ITS** 😊');
});

test('final canonical suffix is paced and server corrections reconcile exactly', async () => {
    const clock = fakeClock(); const frames = [];
    const writer = createWordStream({ clock, render: text => frames.push(text) });
    writer.push('Halo '); clock.advance(220);
    writer.finish('Halo ITS!'); clock.advance(1000);
    assert.equal(await writer.finished, 'Halo ITS!');
    assert.equal(frames.at(-1), 'Halo ITS!');
    const corrected = createWordStream({ clock, render: text => frames.push(text) });
    corrected.push('Salah '); clock.advance(220);
    await corrected.finish('Benar.');
    assert.equal(frames.at(-1), 'Benar.');
});

test('error stops timers preserves received text and ignores later chunks', async () => {
    const clock = fakeClock(); const frames = []; const states = [];
    const writer = createWordStream({ clock, render: text => frames.push(text), onState: value => states.push(value) });
    writer.push('Jawaban parsial'); writer.stop(); writer.push(' tidak boleh masuk');
    clock.advance(10000);
    assert.equal(await writer.finished, 'Jawaban parsial');
    assert.equal(frames.at(-1), 'Jawaban parsial');
    assert.equal(states.at(-1), 'done');
    assert.equal(clock.pending(), 0);
});

test('reduced motion paints incoming text without the word animation', async () => {
    const clock = fakeClock(); const frames = [];
    const writer = createWordStream({ clock, reducedMotion: true, render: text => frames.push(text) });
    writer.push('Satu dua tiga'); clock.advance(0);
    assert.equal(frames.at(-1), 'Satu dua tiga');
    writer.finish(); clock.advance(0);
    assert.equal(await writer.finished, 'Satu dua tiga');
});

test('browser timers are called on their owning global object', async () => {
    const originalSet = globalThis.setTimeout;
    const originalClear = globalThis.clearTimeout;
    globalThis.setTimeout = function (callback, delay) {
        assert.equal(this, globalThis);
        return originalSet(callback, delay);
    };
    globalThis.clearTimeout = function (timer) {
        assert.equal(this, globalThis);
        return originalClear(timer);
    };
    try {
        const writer = createWordStream({ render: () => {} });
        writer.push('Halo ITS'); writer.stop();
        assert.equal(await writer.finished, 'Halo ITS');
    } finally {
        globalThis.setTimeout = originalSet;
        globalThis.clearTimeout = originalClear;
    }
});

test('an empty buffer shows waiting and new chunks wake the queue', async () => {
    const clock = fakeClock(); const states = []; const frames = [];
    const writer = createWordStream({ clock, render: text => frames.push(text), onState: value => states.push(value) });
    writer.push('Halo '); clock.advance(1500);
    assert.equal(states.at(-1), 'waiting');
    writer.push('ITS '); clock.advance(50);
    assert.equal(frames.at(-1), 'Halo ITS ');
    writer.finish(); clock.advance(1000);
    assert.equal(await writer.finished, 'Halo ITS ');
    assert.equal(clock.pending(), 0);
});
