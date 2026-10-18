<?php

use App\Http\Controllers\AdminUsersController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\LockController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\RecoveryController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Auth\UnlockController;
use App\Http\Controllers\EntryController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\MoodController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('login.store');

    // Second step of the sign-in for accounts with two-factor authentication:
    // the password is already checked and parked in the session, so the guest
    // here only has to prove possession of the authenticator device.
    Route::get('two-factor', [TwoFactorChallengeController::class, 'create'])
        ->name('two-factor');
    Route::post('two-factor', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('two-factor.store');

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
        Route::get('admin/users', function () {
            return redirect()->route('diary.settings');
        })->name('admin.users.index');
        Route::post('admin/users', [AdminUsersController::class, 'store'])
            ->middleware('throttle:10,1')
            ->name('admin.users.store');
        Route::patch('admin/users/{user}/email', [AdminUsersController::class, 'updateEmail'])
            ->name('admin.users.email');
        Route::delete('admin/users/{user}/two-factor', [AdminUsersController::class, 'disableTwoFactor'])
            ->name('admin.users.two-factor');
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

        // The background image is encrypted with the diary key, so it is only
        // served once the diary is unlocked.
        Route::get('diary/background', [SettingsController::class, 'image'])
            ->name('diary.background');

        Route::get('mood', [MoodController::class, 'index'])->name('diary.mood');

        Route::get('diary/notes', [NoteController::class, 'index'])->name('diary.notes');
        Route::post('diary/notes', [NoteController::class, 'store'])->name('diary.notes.store');
        Route::put('diary/notes/{note}', [NoteController::class, 'update'])->name('diary.notes.update');
        Route::delete('diary/notes/{note}', [NoteController::class, 'destroy'])->name('diary.notes.destroy');

        Route::get('password', function () {
            return redirect()->route('diary.settings');
        })->name('diary.password');
        Route::put('password', [PasswordController::class, 'update'])->name('diary.password.update');

        Route::get('settings', [SettingsController::class, 'index'])->name('diary.settings');
        Route::put('settings', [SettingsController::class, 'update'])->name('diary.settings.update');
        Route::patch('settings/email', [SettingsController::class, 'updateEmail'])
            ->name('diary.settings.email');

        Route::post('settings/two-factor', [TwoFactorController::class, 'enable'])
            ->name('diary.settings.two-factor.enable');
        Route::post('settings/two-factor/confirm', [TwoFactorController::class, 'confirm'])
            ->name('diary.settings.two-factor.confirm');
        Route::post('settings/two-factor/recovery-codes', [TwoFactorController::class, 'recoveryCodes'])
            ->name('diary.settings.two-factor.recovery-codes');
        Route::delete('settings/two-factor', [TwoFactorController::class, 'disable'])
            ->name('diary.settings.two-factor.disable');

        Route::get('export', [ExportController::class, 'index'])->name('diary.export');
        Route::get('export/markdown', [ExportController::class, 'markdown'])->name('diary.export.markdown');

        Route::get('diary/notifications', [NotificationController::class, 'index'])->name('diary.notifications');
        Route::patch('diary/notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('diary.notifications.read');
        Route::delete('diary/notifications/{notification}', [NotificationController::class, 'destroy'])->name('diary.notifications.destroy');
        Route::get('diary/notifications/list', [NotificationController::class, 'list'])->name('diary.notifications.list');
        Route::patch('diary/notifications/read-all', [NotificationController::class, 'readAll'])->name('diary.notifications.read-all');

        Route::get('diary/schedule', [ScheduleController::class, 'index'])->name('diary.schedule');
        Route::post('diary/schedule', [ScheduleController::class, 'store'])->name('diary.schedule.store');
        Route::patch('diary/schedule/reorder', [ScheduleController::class, 'reorder'])->name('diary.schedule.reorder');
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
