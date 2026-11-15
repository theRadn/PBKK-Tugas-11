<?php

use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\TokenController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [TokenController::class, 'store'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::delete('/logout', [TokenController::class, 'destroy']);
    Route::post('/chat-ai', [ChatController::class, 'store'])->middleware('throttle:20,1');
    Route::get('/chat-ai/history', [ChatController::class, 'index'])->middleware('throttle:60,1');
    Route::get('/chat-ai/sessions', [ChatController::class, 'sessions'])->middleware('throttle:60,1');
    Route::get('/chat-ai/sessions/{sessionId}', [ChatController::class, 'showSession'])->middleware('throttle:60,1');
    Route::delete('/chat-ai/sessions/{sessionId}', [ChatController::class, 'destroySession'])->middleware('throttle:60,1');
});

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});
