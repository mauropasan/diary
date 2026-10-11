<?php

use App\Http\Controllers\Auth\LockController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\RecoveryController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\UnlockController;
use App\Http\Controllers\EntryController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MoodController;
use App\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('login.store');

    Route::get('recuperar', [RecoveryController::class, 'create'])->name('diary.recovery');
    Route::post('recuperar', [RecoveryController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('diary.recovery.store');

    Route::middleware('registration.open')->group(function () {
        Route::get('registro', [RegisterController::class, 'create'])->name('register');
        Route::post('registro', [RegisterController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('register.store');
    });
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

    Route::get('desbloquear', [UnlockController::class, 'create'])->name('diary.unlock');
    Route::post('desbloquear', [UnlockController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('diary.unlock.store');

    Route::post('bloquear', [LockController::class, 'store'])->name('diary.lock');

    Route::middleware('diary.unlocked')->group(function () {
        Route::get('/', fn () => redirect()->route('diary.show', now()->toDateString()))->name('home');

        Route::get('buscar', [SearchController::class, 'index'])->name('diary.search');

        Route::get('animo', [MoodController::class, 'index'])->name('diary.mood');

        Route::get('clave', [PasswordController::class, 'edit'])->name('diary.password');
        Route::put('clave', [PasswordController::class, 'update'])->name('diary.password.update');

        Route::get('exportar', [ExportController::class, 'index'])->name('diary.export');
        Route::get('exportar/markdown', [ExportController::class, 'markdown'])->name('diary.export.markdown');

        Route::get('diario/{date}', [EntryController::class, 'show'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('diary.show');

        Route::put('diario/{date}', [EntryController::class, 'update'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('diary.update');
    });
});
