<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveNoteRequest;
use App\Mail\ReminderNotification;
use App\Models\Note;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class NoteController extends Controller
{
    /**
     * List the user's notes, most recent first and dated notes before loose ones.
     */
    public function index(Request $request): Response
    {
        $notes = $request->user()
            ->notes()
            ->orderByRaw('date is null')
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('diary/notes', [
            'notes' => $notes->map(fn (Note $note): array => $note->toPayload())->all(),
            'colors' => Note::COLORS,
            'kinds' => Note::KINDS,
        ]);
    }

    /**
     * Create a new note for the user.
     */
    public function store(SaveNoteRequest $request): RedirectResponse
    {
        $note = $request->user()->notes()->create($this->attributes($request));

        if (in_array($note->kind, Note::DATED_KINDS, true)) {
            $notification = $request->user()->notifications()->create([
                'title' => $note->title,
                'body' => $note->body,
            ]);

            if ($request->user()->email_notifications) {
                Mail::to($request->user()->email)
                    ->send(new ReminderNotification($request->user()));
            }
        }

        return redirect()->route('diary.notes');
    }

    /**
     * Update an existing note owned by the user.
     */
    public function update(SaveNoteRequest $request, Note $note): RedirectResponse
    {
        $this->authorizeNote($request, $note);

        $note->update($this->attributes($request));

        return redirect()->route('diary.notes');
    }

    /**
     * Delete a note owned by the user.
     */
    public function destroy(Request $request, Note $note): RedirectResponse
    {
        $this->authorizeNote($request, $note);

        $note->delete();

        return redirect()->route('diary.notes');
    }

    /**
     * Ensure the note belongs to the authenticated user.
     */
    private function authorizeNote(Request $request, Note $note): void
    {
        if ($request->user()?->id !== $note->user_id) {
            abort(404);
        }
    }

    /**
     * Build the attribute array for a note from the validated request.
     *
     * @return array<string, mixed>
     */
    private function attributes(SaveNoteRequest $request): array
    {
        return [
            'title' => $request->input('title'),
            'body' => $request->input('body'),
            'color' => $request->input('color') ?? Note::DEFAULT_COLOR,
            'kind' => $request->input('kind') ?? Note::DEFAULT_KIND,
            'date' => $request->input('date'),
            'background_image' => $request->input('background_image'),
        ];
    }
}
