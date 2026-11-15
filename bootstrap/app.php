<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API clients use Sanctum bearer tokens; web login keeps its CSRF protection.

        // $middleware->alias([
        //     'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
        // ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = match (true) {
                $exception instanceof AuthenticationException => 401,
                $exception instanceof ValidationException => 422,
                $exception instanceof AuthorizationException => 403,
                $exception instanceof HttpExceptionInterface => $exception->getStatusCode(),
                default => 500,
            };

            $message = match ($status) {
                401 => 'Token tidak valid atau belum diberikan.',
                403 => 'Token tidak memiliki izin chat.',
                422 => 'Input tidak valid.',
                429 => 'Terlalu banyak request. Coba lagi nanti.',
                503 => 'Layanan AI tidak tersedia. Periksa konfigurasi provider atau coba lagi.',
                default => $status >= 500 ? 'Terjadi kesalahan pada server.' : 'Request tidak dapat diproses.',
            };

            $body = ['status' => 'error', 'data' => null, 'message' => $message];
            if ($exception instanceof ValidationException) {
                $body['errors'] = $exception->errors();
            }

            $headers = $exception instanceof HttpExceptionInterface
                ? $exception->getHeaders() : [];

            return response()->json($body, $status, $headers);
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
