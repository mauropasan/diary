<?php

namespace App\Http\Controllers;

use App\Mail\ReminderNotification;
use App\Models\Notification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NotificationController extends Controller
{
    /**
     * Show the user's notifications and the form to create a new reminder.
     *
     * Only the current user's notifications are listed, newest first. Title
     * and body are decrypted on read with the diary key from the session.
     */
    public function index(Request $request): InertiaResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->title,
                'body' => $notification->body,
                'readAt' => $notification->read_at?->toISOString(),
                'createdAt' => $notification->created_at->toISOString(),
            ])
            ->all();

        return Inertia::render('diary/notifications', [
            'notifications' => $notifications,
        ]);
    }

    /**
     * Create a new reminder notification.
     *
     * An email is sent to the user's registered address. It deliberately
     * contains no diary content, only an invitation to open the app.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
        ]);

        $notification = $request->user()->notifications()->create([
            'title' => $validated['title'],
            'body' => $validated['body'] ?? null,
        ]);

        Mail::to($request->user()->email)
            ->send(new ReminderNotification($request->user()));

        return redirect()
            ->route('diary.notifications')
            ->with('status', __('messages.notification.created'));
    }

    /**
     * Mark a notification as read.
     */
    public function markRead(Request $request, Notification $notification)
    {
        if ($request->user()->id !== $notification->user_id) {
            abort(404);
        }

        $notification->markAsRead();

        return response()->json([
            'id' => $notification->id,
            'readAt' => $notification->read_at->toISOString(),
        ]);
    }

    /**
     * List the user's notifications as JSON (used by the nav popup).
     */
    public function list(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->title,
                'body' => $notification->body,
                'readAt' => $notification->read_at?->toISOString(),
                'createdAt' => $notification->created_at->toISOString(),
            ])
            ->all();

        return response()->json($notifications);
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, Notification $notification): RedirectResponse
    {
        if ($request->user()->id !== $notification->user_id) {
            abort(404);
        }

        $notification->delete();

        return redirect()
            ->route('diary.notifications')
            ->with('status', __('messages.notification.deleted'));
    }
}
