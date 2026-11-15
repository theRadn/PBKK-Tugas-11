<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatLog extends Model
{
    protected $fillable = [
        'session_id', 'prompt', 'jawaban_ai', 'provider', 'model_used',
        'token_consumed', 'fallback_used',
    ];

    protected function casts(): array
    {
        return ['token_consumed' => 'integer', 'fallback_used' => 'boolean'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
