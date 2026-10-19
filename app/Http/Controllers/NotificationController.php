<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NotificationController extends Controller
{
    /**
     * Show the user's notifications, newest first.
     *
     * Title and body are decrypted on read with the diary key from the
     * session, so this route stays behind the `diary.unlocked` middleware.
     */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('diary/notifications', [
            'notifications' => $this->payload($request),
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function markRead(Request $request, Notification $notification): JsonResponse
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
     * Mark every notification of the user as read.
     */
    public function readAll(Request $request): JsonResponse
    {
        // Only the due ones: notifications that have not popped yet must
        // arrive unread when their trigger moment comes.
        $request->user()->notifications()->unread()->due()->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    /**
     * List the user's notifications as JSON (used by the nav popup).
     */
    public function list(Request $request): JsonResponse
    {
        return response()->json($this->payload($request));
    }

    /**
     * List the notifications that are still ahead, for the native shell.
     *
     * The popup only ever shows what is already due, but a reminder has to be
     * registered with Android's scheduler *before* its moment passes: the web
     * view stops polling as soon as the app goes to the background. Title and
     * body follow the same decryption and translation rules as the list, so
     * this route sits behind the same `diary.unlocked` middleware.
     */
    public function upcoming(Request $request): JsonResponse
    {
        return response()->json($this->ahead($request));
    }

    /**
     * Delete a notification.
     *
     * The nav popup deletes in place with a plain fetch and only needs the
     * status code, while the notifications page deletes through Inertia and
     * expects a redirect back to the list with a flash message.
     */
    public function destroy(Request $request, Notification $notification): RedirectResponse|Response
    {
        if ($request->user()->id !== $notification->user_id) {
            abort(404);
        }

        $notification->delete();

        if ($request->expectsJson()) {
            return response()->noContent();
        }

        return redirect()
            ->route('diary.notifications')
            ->with('status', __('messages.notifications.deleted'));
    }

    /**
     * Flatten the user's notifications, newest first, for the page and popup.
     *
     * Title and body come from the model: application notifications are
     * translated in the reader's language there, diary reminders are decrypted.
     *
     * @return array<int, array{id: int, title: string|null, body: string|null, readAt: string|null, createdAt: string}>
     */
    private function payload(Request $request): array
    {
        return $request->user()
            ->notifications()
            ->due()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->displayTitle(),
                'body' => $notification->displayBody(),
                'readAt' => $notification->read_at?->toISOString(),
                'createdAt' => $notification->created_at->toISOString(),
            ])
            ->all();
    }

    /**
     * The user's pending notifications, oldest moment first.
     *
     * @return array<int, array{id: int, title: string|null, body: string|null, dueAt: string}>
     */
    private function ahead(Request $request): array
    {
        return $request->user()
            ->notifications()
            ->upcoming()
            ->orderBy('due_at')
            ->get()
            ->map(fn (Notification $notification): array => [
                'id' => $notification->id,
                'title' => $notification->displayTitle(),
                'body' => $notification->displayBody(),
                'dueAt' => $notification->due_at->toISOString(),
            ])
            ->all();
    }
}
