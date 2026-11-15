<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('session_id')->unique();
            $table->text('prompt');
            $table->longText('jawaban_ai');
            $table->string('provider', 30);
            $table->string('model_used');
            $table->unsignedBigInteger('token_consumed')->nullable();
            $table->boolean('fallback_used')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_logs');
    }
};
