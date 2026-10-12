<?php

use App\Http\Controllers\AdminUsersController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\LockController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\RecoveryController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\UnlockController;
use App\Http\Controllers\EntryController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MoodController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('login.store');

    Route::get('recover', [RecoveryController::class, 'create'])->name('diary.recovery');
    Route::post('recover', [RecoveryController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('diary.recovery.store');

    Route::middleware('registration.open')->group(function () {
        Route::get('register', [RegisterController::class, 'create'])->name('register');
        Route::post('register', [RegisterController::class, 'store'])
            ->middleware('throttle:6,1')
            ->name('register.store');
    });
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

    Route::middleware('admin')->group(function () {
        Route::get('admin/users', [AdminUsersController::class, 'index'])->name('admin.users.index');
        Route::post('admin/users', [AdminUsersController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('admin.users.store');
        Route::delete('admin/users/{user}', [AdminUsersController::class, 'destroy'])
            ->name('admin.users.destroy');
    });

    Route::get('unlock', [UnlockController::class, 'create'])->name('diary.unlock');
    Route::post('unlock', [UnlockController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('diary.unlock.store');

    Route::post('lock', [LockController::class, 'store'])->name('diary.lock');

    Route::middleware('diary.unlocked')->group(function () {
        Route::get('/', fn () => redirect()->route('diary.show', now()->toDateString()))->name('home');

        Route::get('search', [SearchController::class, 'index'])->name('diary.search');

        Route::get('mood', [MoodController::class, 'index'])->name('diary.mood');

        Route::get('diary/notes', [NoteController::class, 'index'])->name('diary.notes');
        Route::post('diary/notes', [NoteController::class, 'store'])->name('diary.notes.store');
        Route::put('diary/notes/{note}', [NoteController::class, 'update'])->name('diary.notes.update');
        Route::delete('diary/notes/{note}', [NoteController::class, 'destroy'])->name('diary.notes.destroy');

        Route::get('password', [PasswordController::class, 'edit'])->name('diary.password');
        Route::put('password', [PasswordController::class, 'update'])->name('diary.password.update');

        Route::get('export', [ExportController::class, 'index'])->name('diary.export');
        Route::get('export/markdown', [ExportController::class, 'markdown'])->name('diary.export.markdown');

        Route::get('diary/schedule', [ScheduleController::class, 'index'])->name('diary.schedule');
        Route::post('diary/schedule', [ScheduleController::class, 'store'])->name('diary.schedule.store');
        Route::put('diary/schedule/{schedule}', [ScheduleController::class, 'update'])->name('diary.schedule.update');
        Route::delete('diary/schedule/{schedule}', [ScheduleController::class, 'destroy'])->name('diary.schedule.destroy');

        Route::get('diary/attachments/{attachment}', [AttachmentController::class, 'show'])
            ->name('diary.attachments.show');

        Route::post('diary/{date}/attachments', [AttachmentController::class, 'store'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('diary.attachments.store');

        Route::get('diary/{date}', [EntryController::class, 'show'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('diary.show');

        Route::put('diary/{date}', [EntryController::class, 'update'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('diary.update');
    });
});
