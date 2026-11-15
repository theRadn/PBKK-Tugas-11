<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->tokenCan('chat') ?? false;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'max:1000'],
            'stream' => ['sometimes', 'boolean'],
            'provider' => ['sometimes', Rule::in(['ollama', 'senopati'])],
        ];
    }
}
