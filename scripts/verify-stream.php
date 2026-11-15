<?php

use App\Services\LlmService;
use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\Process\Process;

// Real HTTP transport test against a local fixture, NOT an integration with real AI.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$listener = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
if ($listener === false) {
    throw new RuntimeException('Could not reserve loopback port.');
}
$address = stream_socket_get_name($listener, false);
fclose($listener);
$server = new Process([
    PHP_BINARY, '-S', $address, __DIR__.'/../tests/Fixtures/llm-router.php',
], dirname(__DIR__));
$server->start();
try {
    $ready = false;
    for ($attempt = 0; $attempt < 40; $attempt++) {
        $connection = @stream_socket_client('tcp://'.$address, $errorCode, $errorMessage, 0.1);
        if ($connection) {
            fclose($connection);
            $ready = true;
            break;
        }
        usleep(50000);
    }
    if (! $ready) {
        throw new RuntimeException('Fixture server did not start.');
    }
    config([
        'llm.ollama.url' => 'http://'.$address, 'llm.ollama.model' => 'fixture-ollama',
        'llm.senopati.url' => 'http://'.$address.'/v1/chat/completions',
        'llm.senopati.model' => 'fixture-senopati', 'llm.senopati.key' => 'fixture-only',
        'llm.fallback_enabled' => false,
    ]);
    foreach (['ollama', 'senopati'] as $provider) {
        $start = microtime(true);
        $deltaTimes = [];
        $result = null;
        foreach (app(LlmService::class)->stream('Transport test only.', $provider) as $event) {
            if ($event['type'] === 'delta') {
                $deltaTimes[] = round(microtime(true) - $start, 3);
            }
            if ($event['type'] === 'result') {
                $result = $event;
            }
        }
        $elapsed = round(microtime(true) - $start, 3);
        if (count($deltaTimes) !== 2 || $result === null
            || $result['jawaban_ai'] !== 'Fixture stream' || $result['token_consumed'] !== 6
            || $deltaTimes[1] - $deltaTimes[0] < 0.2 || $elapsed - $deltaTimes[0] < 0.5) {
            throw new RuntimeException('Stream was incomplete or buffered: '.json_encode($deltaTimes));
        }
        echo json_encode(['provider_fixture' => $provider, 'delta_seconds' => $deltaTimes,
            'completed_seconds' => $elapsed, 'result' => 'passed']).PHP_EOL;
    }
} finally {
    $server->stop();
}
