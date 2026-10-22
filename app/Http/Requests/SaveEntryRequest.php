<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;
use Mews\Purifier\Facades\Purifier;

class SaveEntryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'mood' => ['nullable', 'integer', 'between:1,5'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->dateIsValid()) {
                    $validator->errors()->add('date', __('validation.custom.date.invalid'));

                    return;
                }

                if ($this->dateIsInTheFuture()) {
                    $validator->errors()->add('date', __('validation.custom.date.future'));
                }
            },
        ];
    }

    private function dateIsValid(): bool
    {
        $date = $this->route('date');

        if (! is_string($date) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return false;
        }

        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, config('app.timezone'));

        return $day !== null && $day->toDateString() === $date;
    }

    private function dateIsInTheFuture(): bool
    {
        return CarbonImmutable::createFromFormat('!Y-m-d', $this->route('date'), config('app.timezone'))
            ->isAfter(CarbonImmutable::today());
    }

    /**
     * Determine whether the submitted entry is effectively empty.
     *
     * Content that only references media (for example an image with no text)
     * still counts as content, so days with attachments are never deleted.
     */
    public function entryIsEmpty(): bool
    {
        return static::fieldsAreEmpty(
            $this->input('title'),
            $this->input('content'),
            $this->input('mood'),
        );
    }

    /**
     * Sanitize rich text content before persisting.
     */
    public function sanitizedContent(): ?string
    {
        $content = $this->input('content');

        if (! is_string($content) || $content === '') {
            return $content === '' ? null : (is_string($content) ? $content : null);
        }

        $sanitized = Purifier::clean($content);

        return $sanitized === '' ? null : $sanitized;
    }

    public function sanitizedTitle(): ?string
    {
        $title = $this->input('title');

        if ($title === null || $title === '') {
            return null;
        }

        if (! is_string($title)) {
            return null;
        }

        return strip_tags($title);
    }

    /**
     * Whether the given entry fields describe an empty day.
     *
     * Shared with the sync API, which applies the same "nothing written means
     * delete" rule per record instead of per request.
     */
    public static function fieldsAreEmpty(mixed $title, mixed $content, mixed $mood): bool
    {
        $rawContent = is_string($content) ? $content : '';

        $text = html_entity_decode(
            strip_tags($rawContent),
            ENT_QUOTES | ENT_HTML5,
        );

        return blank(is_string($title) ? $title : null)
            && Str::of($text)->replace("\u{00A0}", ' ')->trim()->isEmpty()
            && blank($mood)
            && ! Str::contains($rawContent, 'data-attachment-id');
    }
}
