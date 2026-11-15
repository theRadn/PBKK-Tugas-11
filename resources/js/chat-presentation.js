import createDOMPurify from 'dompurify';
import { Marked } from 'marked';

const escapeHtml = text => text.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

// AI output and saved history are both untrusted. Never insert raw model HTML.
export function createMarkdownRenderer(window) {
    const purifier = createDOMPurify(window);
    const markdown = new Marked({
        gfm: true,
        breaks: true,
        renderer: {
            html: ({ text }) => escapeHtml(text),
            image: ({ text }) => escapeHtml(text),
        },
    });

    return (element, source) => {
        element.innerHTML = purifier.sanitize(markdown.parse(source), {
            ALLOWED_TAGS: ['p', 'br', 'hr', 'strong', 'em', 'del', 'h1', 'h2', 'h3',
                'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
                'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
            ALLOWED_ATTR: ['href', 'title', 'class', 'start', 'align'],
            ALLOW_DATA_ATTR: false,
        });
        for (const link of element.querySelectorAll('a[href]')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    };
}

// Receiving the SSE stream never waits for animation. Only presentation is paced.
// Keep an incomplete trailing word until another chunk (or the final event) arrives.
export function createWordStream({ render, onState = () => {}, reducedMotion = false,
    clock = {
        setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
        clearTimeout: timer => globalThis.clearTimeout(timer),
        now: () => Date.now(),
    } }) {
    let source = '';
    let position = 0;
    let ended = false;
    let settled = false;
    let timer = null;
    let idleTimer = null;
    let lastPaint = clock.now();
    let lastArrival = null;
    let arrivalGap = 0;
    let currentState;
    let resolveFinished;
    const finished = new Promise(resolve => { resolveFinished = resolve; });
    const state = value => {
        if (currentState !== value) {
            currentState = value;
            onState(value);
        }
    };
    const settle = () => {
        if (timer !== null) clock.clearTimeout(timer);
        if (idleTimer !== null) clock.clearTimeout(idleTimer);
        timer = null;
        idleTimer = null;
        settled = true;
        state('done');
        resolveFinished(source);
    };
    const schedule = delay => {
        if (timer === null && !settled) timer = clock.setTimeout(tick, delay);
    };
    function tick() {
        timer = null;
        if (settled) return;
        if (reducedMotion) {
            position = source.length;
            render(source);
            lastPaint = clock.now();
            state('typing');
        } else {
            const remaining = source.slice(position);
            const word = remaining.match(/^\s*\S+\s*/u)?.[0];
            const incomplete = word && position + word.length === source.length
                && !ended && !/\s$/u.test(word);
            if (word && !incomplete) {
                position += word.length;
                render(source.slice(0, position));
                lastPaint = clock.now();
                state('typing');
                // Catch up gently on large bursts; punctuation gets a small pause.
                const backlog = source.length - position;
                const baseDelay = backlog > 900 ? 25 : backlog > 300 ? 45 : 75;
                // Slower upstream bursts get a little more runway between words.
                // Once done arrives, catch up without waiting for further packets.
                const delay = ended ? baseDelay : Math.max(baseDelay,
                    Math.min(130, arrivalGap / Math.max(1, backlog / 6)));
                const punctuation = /[.!?:;]["')\]]?\s*$/u.test(word) ? 65 : /,\s*$/u.test(word) ? 25 : 0;
                if (ended && position === source.length) settle();
                else schedule(delay + punctuation);
                return;
            }
            if (ended && remaining !== '') {
                position = source.length;
                render(source);
            }
        }
        if (ended && position === source.length) settle();
        else {
            if (clock.now() - lastPaint > 800) state('waiting');
            else if (idleTimer === null) idleTimer = clock.setTimeout(() => {
                idleTimer = null;
                state('waiting');
            }, 801 - (clock.now() - lastPaint));
            // One idle notification, then sleep until new data; no polling loop.
        }
    }
    state('waiting');

    return {
        finished,
        push(text) {
            if (ended || settled || !text) return;
            if (idleTimer !== null) clock.clearTimeout(idleTimer);
            idleTimer = null;
            const now = clock.now();
            const gap = lastArrival === null ? 0 : now - lastArrival;
            if (gap > 150) arrivalGap = Math.min(6000, arrivalGap ? .5 * arrivalGap + .5 * gap : gap);
            lastArrival = now;
            source += text;
            schedule(reducedMotion ? 0 : position === 0 ? 220 : 30);
        },
        finish(canonical = source) {
            if (settled) return finished;
            ended = true;
            // A final resource may contain a suffix not sent in delta frames.
            // If it corrects already visible text, reconcile once without duplication.
            if (!canonical.startsWith(source.slice(0, position))) {
                source = canonical;
                position = source.length;
                render(source);
                settle();
            } else {
                source = canonical;
                schedule(0);
            }
            return finished;
        },
        stop() {
            if (settled) return;
            // Preserve received partial output, but stop the typing indicator on error.
            render(source);
            position = source.length;
            settle();
        },
    };
}
