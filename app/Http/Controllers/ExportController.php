<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Entry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use League\HTMLToMarkdown\HtmlConverter;

class ExportController extends Controller
{
    /**
     * Show a print-friendly page with every entry, ready to save as PDF.
     */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('diary/export', [
            'entries' => $this->entries($request->user()),
        ]);
    }

    /**
     * Download the whole diary as a single Markdown document.
     */
    public function markdown(Request $request): Response
    {
        $markdown = $this->toMarkdown($this->entries($request->user()));

        return response($markdown, 200, [
            'Content-Type' => 'text/markdown; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="diary.md"',
        ]);
    }

    /**
     * Decrypt every entry for the export, oldest first.
     *
     * Unlike the rest of the app, an export legitimately needs every entry, so
     * all of them are decrypted here on the user's explicit request.
     *
     * @return array<int, array{date: string, title: string|null, content: string|null, mood: int|null, tags: array<int, string>, attachments: array<int, array{name: string, src: string}>}>
     */
    private function entries(User $user): array
    {
        return $user->entries()
            ->with(['tags', 'attachments'])
            ->orderBy('date')
            ->get()
            ->map(fn (Entry $entry): array => [
                'date' => $entry->date->toDateString(),
                'title' => $entry->title,
                'content' => $entry->content,
                'mood' => $entry->mood,
                'tags' => $entry->tags->map(fn ($tag): string => $tag->name)->values()->all(),
                'attachments' => $entry->attachments
                    ->map(fn (Attachment $attachment): array => [
                        'name' => $attachment->original_name,
                        'src' => route('diary.attachments.show', $attachment),
                    ])
                    ->values()
                    ->all(),
            ])
            ->all();
    }

    /**
     * Render the given entries as a single Markdown document.
     *
     * @param  array<int, array{date: string, title: string|null, content: string|null, mood: int|null, tags: array<int, string>, attachments: array<int, array{name: string, src: string}>}>  $entries
     */
    private function toMarkdown(array $entries): string
    {
        $converter = new HtmlConverter(['strip_tags' => true, 'hard_break' => true]);

        $sections = [];

        foreach ($entries as $entry) {
            $heading = $entry['title'] !== null && $entry['title'] !== ''
                ? $entry['title']
                : $entry['date'];

            $meta = [$entry['date']];

            if ($entry['mood'] !== null) {
                $meta[] = __('messages.export.mood', ['mood' => __('messages.moods.'.$entry['mood'])]);
            }

            if ($entry['tags'] !== []) {
                $meta[] = __('messages.export.tags', ['tags' => implode(', ', $entry['tags'])]);
            }

            $body = trim($converter->convert((string) $entry['content']));

            if ($entry['attachments'] !== []) {
                $media = implode("\n", array_map(
                    fn (array $attachment): string => "- [{$attachment['name']}]({$attachment['src']})",
                    $entry['attachments'],
                ));

                $body = $body !== '' ? $body."\n\n{$media}" : $media;
            }

            $sections[] = "## {$heading}\n\n_".implode(' · ', $meta).'_'
                .($body !== '' ? "\n\n{$body}" : '');
        }

        return '# '.__('messages.export.title')."\n\n".implode("\n\n---\n\n", $sections)."\n";
    }
}
