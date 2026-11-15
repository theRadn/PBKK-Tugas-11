<?php

namespace App\Services;

use Generator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class LlmService
{
    /**
     * Both modes consume the real upstream stream. Never simulate streaming by
     * splitting a completed answer. Fall back only before any answer is emitted.
     *
     * @param array<int, array{role: string, content: string}> $history
     * @return Generator<int, array<string, mixed>>
     */
    public function stream(string $prompt, ?string $provider = null, array $history = []): Generator
    {
        $provider ??= (string) config('llm.provider');
        $emitted = false;
        try {
            foreach ($this->readProvider($provider, $prompt, $history) as $event) {
                if ($event['type'] === 'delta' && $event['text'] !== '') {
                    $emitted = true;
                }
                yield $event + ['fallback_used' => false];
            }
        } catch (Throwable $exception) {
            if ($provider !== 'ollama' || ! config('llm.fallback_enabled') || $emitted) {
                throw $exception;
            }

            // Do not log prompts, credentials, URLs, or upstream error bodies.
            Log::warning('Ollama unavailable; switching to Senopati.', ['exception_type' => $exception::class]);
            yield ['type' => 'fallback', 'provider' => 'senopati', 'fallback_used' => true];
            foreach ($this->readProvider('senopati', $prompt, $history) as $event) {
                yield $event + ['fallback_used' => true];
            }
        }
    }

    /**
     * @param array<int, array{role: string, content: string}> $history
     * @return Generator<int, array<string, mixed>>
     */
    private function readProvider(string $provider, string $prompt, array $history = []): Generator
    {
        if (! in_array($provider, ['ollama', 'senopati'], true)) {
            throw new RuntimeException('Unsupported provider.');
        }

        $ollama = $provider === 'ollama';
        $model = (string) config("llm.$provider.model");
        $url = $ollama ? rtrim((string) config('llm.ollama.url'), '/').'/api/chat'
            : (string) config('llm.senopati.url');

        if ($url === '' || $model === '' || (! $ollama && ! config('llm.senopati.key'))) {
            throw new RuntimeException('Provider configuration is incomplete.');
        }

        $client = Http::accept($ollama ? 'application/x-ndjson' : 'text/event-stream')
            ->connectTimeout((int) config('llm.connect_timeout'))
            ->timeout((int) config('llm.timeout'))
            ->withOptions(['stream' => true, 'read_timeout' => (int) config('llm.timeout')]);
        if (! $ollama) {
            $client = $client->withToken((string) config('llm.senopati.key'));
        }

        $messages = [
            ['role' => 'system', 'content' => (string) config('llm.system_prompt')],
        ];
        foreach ($history as $item) {
            if (isset($item['role'], $item['content']) && in_array($item['role'], ['user', 'assistant'], true)) {
                $messages[] = [
                    'role' => $item['role'],
                    'content' => (string) $item['content'],
                ];
            }
        }
        $messages[] = ['role' => 'user', 'content' => $prompt];

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'stream' => true,
        ];
        if (! $ollama) {
            $payload['stream_options'] = ['include_usage' => true];
        }

        $response = $client->post($url, $payload);
        $body = $response->toPsrResponse()->getBody();
        $answer = '';
        $tokens = null;
        $finished = false;
        $buffer = '';
        $sseData = [];
        $startedAt = microtime(true);

        try {
            // Do not buffer an upstream failure body (which may itself be a stream).
            if (! $response->successful()) {
                throw new RuntimeException('Upstream rejected request.');
            }
            while (true) {
                if (microtime(true) - $startedAt > (int) config('llm.timeout')) {
                    throw new RuntimeException('Upstream stream timed out.');
                }
                $chunk = $body->read(4096);
                $atEnd = $body->eof();
                if ($chunk === '' && ! $atEnd) {
                    throw new RuntimeException('Upstream stream stalled.');
                }
                $buffer .= $chunk;
                if (strlen($buffer) > 1048576) {
                    throw new RuntimeException('Upstream frame too large.');
                }

                // Process a final line even when the provider omits its last newline.
                if ($atEnd && $buffer !== '') {
                    $buffer .= "\n\n";
                }
                while (($position = strpos($buffer, "\n")) !== false) {
                    $line = rtrim(substr($buffer, 0, $position), "\r");
                    $buffer = substr($buffer, $position + 1);
                    if (! $ollama) {
                        if (str_starts_with($line, 'data:')) {
                            $sseData[] = ltrim(substr($line, 5), ' ');

                            continue;
                        }
                        if ($line !== '' || $sseData === []) {
                            continue;
                        }
                        $line = implode("\n", $sseData);
                        $sseData = [];
                        if ($line === '[DONE]') {
                            $finished = true;
                            break 2;
                        }
                    }
                    if (trim($line) === '') {
                        continue;
                    }

                    $frame = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                    if (! is_array($frame) || isset($frame['error'])) {
                        throw new RuntimeException('Invalid upstream frame.');
                    }
                    $model = $frame['model'] ?? $model;
                    $text = $ollama ? ($frame['message']['content'] ?? '') : ($frame['choices'][0]['delta']['content'] ?? '');
                    if (! is_string($text)) {
                        throw new RuntimeException('Invalid upstream content.');
                    }
                    if ($text !== '') {
                        $answer .= $text;
                        yield ['type' => 'delta', 'text' => $text, 'provider' => $provider, 'model_used' => $model];
                    }
                    if (! $ollama && isset($frame['usage']['total_tokens'])) {
                        $tokens = max(0, (int) $frame['usage']['total_tokens']);
                    }
                    if ($ollama && ($frame['done'] ?? false)) {
                        $tokens = isset($frame['prompt_eval_count'], $frame['eval_count'])
                            ? max(0, (int) $frame['prompt_eval_count'] + (int) $frame['eval_count']) : null;
                        $finished = true;
                        break 2;
                    }
                }
                if ($atEnd) {
                    break;
                }
            }
            if (! $finished || $answer === '') {
                throw new RuntimeException('Upstream did not complete an answer.');
            }
            yield ['type' => 'result', 'jawaban_ai' => $answer, 'model_used' => $model,
                'token_consumed' => $tokens, 'provider' => $provider];
        } finally {
            $body->close();
        }
    }
}
