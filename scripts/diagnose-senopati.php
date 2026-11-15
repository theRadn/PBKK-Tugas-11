<?php

use App\Services\LlmService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Client\ConnectionException;

// Run locally: php scripts/diagnose-senopati.php. Never prints the API key.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

set_time_limit(max(30, 2 * ((int) config('llm.timeout') + (int) config('llm.connect_timeout')) + 15));
echo json_encode([
    'api_key_present' => filled(config('llm.senopati.key')),
    'endpoint_matches_its' => config('llm.senopati.url') === 'https://senopati.its.ac.id/llm-gateway/v1/chat/completions',
    'model' => config('llm.senopati.model'),
    'llm_timeout_seconds' => config('llm.timeout'),
    'php_execution_limit_seconds' => ini_get('max_execution_time'),
]).PHP_EOL;

$start = microtime(true);
$chunks = 0;
try {
    foreach (app(LlmService::class)->stream('Balas singkat dalam satu kalimat: halo.', 'senopati') as $event) {
        if ($event['type'] === 'delta') {
            $chunks++;
            if ($chunks === 1) {
                echo json_encode(['first_answer_seconds' => round(microtime(true) - $start, 2)]).PHP_EOL;
            }
        }
        if ($event['type'] === 'result') {
            echo json_encode(['result' => 'success', 'duration_seconds' => round(microtime(true) - $start, 2),
                'answer_chunks' => $chunks, 'answer_characters' => mb_strlen($event['jawaban_ai']),
                'model_used' => $event['model_used'], 'token_consumed' => $event['token_consumed']]).PHP_EOL;
        }
    }
} catch (Throwable $exception) {
    // Raw connection/request exceptions may contain secrets; print a category only.
    $reason = match (true) {
        $exception instanceof ConnectionException => 'Koneksi atau timeout. Periksa jaringan/VPN kampus dan ketersediaan Senopati.',
        $exception instanceof JsonException => 'Format respons stream tidak sesuai JSON yang diharapkan.',
        default => 'Konfigurasi/provider/format respons gagal. Perlu diagnosis status HTTP lebih lanjut.',
    };
    echo json_encode(['result' => 'failed', 'duration_seconds' => round(microtime(true) - $start, 2),
        'exception_type' => $exception::class, 'reason' => $reason]).PHP_EOL;
    exit(1);
}
