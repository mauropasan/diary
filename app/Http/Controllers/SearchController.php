<?php

namespace App\Http\Controllers;

use App\Models\Entry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    /**
     * Maximum number of matches returned for a single query.
     */
    private const RESULT_LIMIT = 50;

    /**
     * Maximum length of a result excerpt, in characters.
     */
    private const EXCERPT_LENGTH = 160;

    /**
     * Search the diary by decrypting entries in memory and filtering them.
     *
     * Content is stored encrypted, so a plain SQL query cannot match it. Given the
     * small data volume of a personal diary, every entry is decrypted and tested
     * against the (accent- and case-insensitive) query instead.
     */
    public function index(Request $request): Response
    {
        $query = trim((string) $request->query('q', ''));

        return Inertia::render('diary/search', [
            'query' => $query,
            'results' => $query === '' ? [] : $this->search($request, $query),
        ]);
    }

    /**
     * @return array<int, array{date: string, title: string|null, excerpt: string|null}>
     */
    private function search(Request $request, string $query): array
    {
        $needle = $this->normalize($query);

        if ($needle === '') {
            return [];
        }

        $entries = $request->user()
            ->entries()
            ->with('tags')
            ->orderByDesc('date')
            ->get();

        $results = [];

        foreach ($entries as $entry) {
            if (! $this->matches($entry, $needle)) {
                continue;
            }

            $results[] = [
                'date' => $entry->date->toDateString(),
                'title' => $entry->title,
                'excerpt' => $this->excerpt($entry->content, $needle),
            ];

            if (count($results) >= self::RESULT_LIMIT) {
                break;
            }
        }

        return $results;
    }

    /**
     * Determine whether the entry's title, content or tags contain the needle.
     */
    private function matches(Entry $entry, string $needle): bool
    {
        $haystacks = [
            (string) $entry->title,
            strip_tags((string) $entry->content),
            $entry->tags->map(fn ($tag): string => $tag->name)->implode(' '),
        ];

        foreach ($haystacks as $haystack) {
            if ($haystack !== '' && str_contains($this->normalize($haystack), $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build a short, plain-text window around the first match in the content.
     */
    private function excerpt(?string $content, string $needle): ?string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', strip_tags((string) $content)));

        if ($text === '') {
            return null;
        }

        $haystack = $this->normalize($text);
        $position = mb_strpos($haystack, $needle);

        if ($position === false || mb_strlen($haystack) !== mb_strlen($text)) {
            return Str::limit($text, self::EXCERPT_LENGTH);
        }

        $start = max(0, $position - 60);
        $snippet = mb_substr($text, $start, self::EXCERPT_LENGTH);

        return ($start > 0 ? '… ' : '')
            .$snippet
            .($start + self::EXCERPT_LENGTH < mb_strlen($text) ? ' …' : '');
    }

    /**
     * Normalize text for case- and accent-insensitive matching.
     */
    private function normalize(string $value): string
    {
        return mb_strtolower(Str::ascii($value));
    }
}
