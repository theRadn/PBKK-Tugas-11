<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChatRequest;
use App\Http\Resources\ChatResource;
use App\Models\ChatLog;
use App\Services\LlmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ChatController extends Controller
{
    public function store(ChatRequest $request, LlmService $llm): ChatResource|StreamedResponse
    {
        $input = $request->validated();
        // Windows counts blocking network reads toward PHP's execution limit.
        // Leave enough time for Ollama plus a possible Senopati fallback;
        // provider requests retain their own bounded network timeouts.
        $executionSeconds = max(30, 2 * ((int) config('llm.timeout') + (int) config('llm.connect_timeout')) + 15);
        set_time_limit($executionSeconds);
        $sessionId = ! empty($input['session_id']) ? (string) $input['session_id'] : (string) Str::uuid();

        // Build history context if continuing an existing session
        $history = [];
        if (! empty($input['session_id'])) {
            $pastLogs = $request->user()->chatLogs()
                ->where('session_id', $sessionId)
                ->orderBy('id', 'asc')
                ->get();

            foreach ($pastLogs as $pastLog) {
                $history[] = ['role' => 'user', 'content' => $pastLog->prompt];
                $history[] = ['role' => 'assistant', 'content' => $pastLog->jawaban_ai];
            }
        }

        $events = $llm->stream($input['prompt'], $input['provider'] ?? null, $history);

        if (! $request->boolean('stream')) {
            try {
                foreach ($events as $event) {
                    if ($event['type'] === 'result') {
                        return new ChatResource($this->save($request, $sessionId, $input['prompt'], $event));
                    }
                }
            } catch (Throwable $exception) {
                $this->recordFailure($exception);
                abort(503);
            }
            abort(503);
        }

        return response()->stream(function () use ($events, $request, $sessionId, $input): void {
            $emit = static function (string $name, array $data) use ($sessionId): void {
                echo 'event: '.$name."\n";
                echo 'data: '.json_encode($data + ['session_id' => $sessionId, 'timestamp' => now()->toIso8601String()], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            $emit('start', ['status' => 'streaming']);
            try {
                foreach ($events as $event) {
                    if (connection_aborted()) {
                        return;
                    }
                    if ($event['type'] === 'result') {
                        $log = $this->save($request, $sessionId, $input['prompt'], $event);
                        $emit('done', (new ChatResource($log))->resolve($request));
                    } else {
                        $emit($event['type'], ['status' => 'streaming', 'data' => $event]);
                    }
                }
            } catch (Throwable $exception) {
                $this->recordFailure($exception);
                $emit('error', ['status' => 'error', 'data' => null, 'message' => 'Jawaban tidak selesai. Layanan AI atau penyimpanan sedang bermasalah.']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('chat'), 403);
        $logs = $request->user()->chatLogs()->latest('id')->paginate(10);

        return response()->json([
            'status' => 'success',
            'data' => $logs->getCollection()->map(fn (ChatLog $log) => (new ChatResource($log))->resolve($request)),
            'meta' => ['current_page' => $logs->currentPage(), 'last_page' => $logs->lastPage()],
        ]);
    }

    public function sessions(Request $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('chat'), 403);

        $sessions = $request->user()->chatLogs()
            ->selectRaw('session_id, (SELECT cl2.prompt FROM chat_logs cl2 WHERE cl2.session_id = chat_logs.session_id ORDER BY cl2.id ASC LIMIT 1) as title, COUNT(*) as total_messages, MAX(model_used) as model_used, MAX(created_at) as last_activity')
            ->groupBy('session_id')
            ->orderByDesc('last_activity')
            ->paginate(10);

        return response()->json([
            'status' => 'success',
            'data' => $sessions->getCollection()->map(fn ($s) => [
                'session_id' => $s->session_id,
                'title' => Str::limit($s->title, 60),
                'total_messages' => (int) $s->total_messages,
                'model_used' => $s->model_used,
                'last_activity' => $s->last_activity,
            ]),
            'meta' => ['current_page' => $sessions->currentPage(), 'last_page' => $sessions->lastPage()],
        ]);
    }

    public function showSession(Request $request, string $sessionId): JsonResponse
    {
        abort_unless($request->user()->tokenCan('chat'), 403);

        $logs = $request->user()->chatLogs()
            ->where('session_id', $sessionId)
            ->orderBy('id', 'asc')
            ->get();

        abort_if($logs->isEmpty(), 404);

        return response()->json([
            'status' => 'success',
            'data' => [
                'session_id' => $sessionId,
                'messages' => $logs->map(fn (ChatLog $log) => (new ChatResource($log))->resolve($request)),
            ],
        ]);
    }

    public function destroySession(Request $request, string $sessionId): JsonResponse
    {
        abort_unless($request->user()->tokenCan('chat'), 403);

        $request->user()->chatLogs()
            ->where('session_id', $sessionId)
            ->delete();

        return response()->json(['status' => 'success', 'data' => null]);
    }

    /** @param array<string, mixed> $event */
    private function save(ChatRequest $request, string $sessionId, string $prompt, array $event): ChatLog
    {
        return $request->user()->chatLogs()->create([
            'session_id' => $sessionId, 'prompt' => $prompt,
            'jawaban_ai' => $event['jawaban_ai'], 'model_used' => $event['model_used'],
            'provider' => $event['provider'], 'token_consumed' => $event['token_consumed'],
            'fallback_used' => $event['fallback_used'],
        ]);
    }

    private function recordFailure(Throwable $exception): void
    {
        Log::warning('Chat request failed.', ['exception_type' => $exception::class]);
    }
}
