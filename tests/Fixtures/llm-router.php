<?php

// Loopback-only fixture for scripts/verify-stream.php. Never use as an AI provider.
$input = json_decode(file_get_contents('php://input'), true);
if (($input['messages'][0]['role'] ?? null) !== 'system') {
    http_response_code(400);
    exit;
}
$ollama = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/api/chat';
header('Content-Type: '.($ollama ? 'application/x-ndjson' : 'text/event-stream'));
header('X-Accel-Buffering: no');
$emit = static function (array $frame) use ($ollama): void {
    echo ($ollama ? '' : 'data: ').json_encode($frame).($ollama ? "\n" : "\n\n");
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
};
foreach (['Fixture ', 'stream'] as $text) {
    $emit($ollama
        ? ['model' => 'fixture-ollama', 'message' => ['content' => $text], 'done' => false]
        : ['model' => 'fixture-senopati', 'choices' => [['delta' => ['content' => $text]]]]);
    usleep(400000);
}
if ($ollama) {
    $emit(['model' => 'fixture-ollama', 'done' => true, 'prompt_eval_count' => 4, 'eval_count' => 2]);
} else {
    $emit(['choices' => [], 'usage' => ['total_tokens' => 6]]);
    echo "data: [DONE]\n\n";
    flush();
}
