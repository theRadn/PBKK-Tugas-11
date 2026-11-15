<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class TokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $input = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['sometimes', 'string', 'max:100'],
        ]);
        $user = User::where('email', $input['email'])->first();
        abort_unless($user && Hash::check($input['password'], $user->password), 401);

        $expiresAt = now()->addDay();
        $token = $user->createToken($input['device_name'] ?? 'chat-client', ['chat'], $expiresAt);

        return response()->json([
            'status' => 'success',
            'data' => ['token' => $token->plainTextToken, 'token_type' => 'Bearer', 'expires_at' => $expiresAt->toIso8601String()],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        $token->delete();

        return response()->json(['status' => 'success', 'data' => null]);
    }
}
