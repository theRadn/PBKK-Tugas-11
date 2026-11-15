<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::view('/chat', 'chat')->name('chat');

Route::redirect('/', '/chat');

Route::get('/login', fn () => view('auth.login'))
    ->middleware('guest')
    ->name('login.form');

Route::get('/register', fn () => view('auth.register'))
    ->middleware('guest')
    ->name('register.form');

Route::fallback(function () {
    return view('errors.404');
});

require __DIR__.'/auth.php';
