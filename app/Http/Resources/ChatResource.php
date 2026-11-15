<?php

namespace App\Http\Resources;

use App\Models\ChatLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChatLog */
class ChatResource extends JsonResource
{
    public static $wrap = null;

    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->setStatusCode(200);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'status' => 'success',
            'data' => [
                'id' => $this->id,
                'prompt' => $this->prompt,
                'jawaban_ai' => $this->jawaban_ai,
                'token_consumed' => $this->token_consumed,
                'provider' => $this->provider,
                'fallback_used' => $this->fallback_used,
            ],
            'session_id' => $this->session_id,
            'model_used' => $this->model_used,
            'timestamp' => $this->created_at?->toIso8601String(),
        ];
    }
}
