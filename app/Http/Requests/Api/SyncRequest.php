<?php

namespace App\Http\Requests\Api;

use App\Models\Note;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validates one pull-free push of the offline client's local records.
 *
 * The field rules mirror the web forms (`SaveEntryRequest`, `SaveNoteRequest`
 * and the schedule controller) so a record the Android app writes is held to
 * exactly the same contract as one written through the browser, plus the
 * last-writer-wins timestamp each record must carry. Deletions travel as
 * minimal tombstones, so content rules only apply to records that are not
 * marked deleted.
 */
class SyncRequest extends FormRequest
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
            'entries' => ['nullable', 'array'],
            'entries.*' => ['array'],
            'entries.*.date' => ['required', 'string'],
            'entries.*.updated_ms' => ['required', 'integer', 'min:0'],
            'entries.*.deleted' => ['nullable', 'boolean'],
            'entries.*.title' => ['nullable', 'string', 'max:255'],
            'entries.*.content' => ['nullable', 'string'],
            'entries.*.mood' => ['nullable', 'integer', 'between:1,5'],
            'entries.*.tags' => ['nullable', 'array'],
            'entries.*.tags.*' => ['nullable', 'string', 'max:50'],

            'notes' => ['nullable', 'array'],
            'notes.*' => ['array'],
            'notes.*.local_id' => ['nullable', 'integer'],
            'notes.*.server_id' => ['nullable', 'integer'],
            'notes.*.updated_ms' => ['required', 'integer', 'min:0'],
            'notes.*.deleted' => ['nullable', 'boolean'],
            'notes.*.title' => ['nullable', 'string', 'max:255'],
            'notes.*.body' => ['nullable', 'string'],
            'notes.*.color' => ['nullable', 'string', 'max:255'],
            'notes.*.kind' => ['nullable', 'string', Rule::in(Note::KINDS)],
            'notes.*.date' => ['nullable', 'date_format:Y-m-d'],
            'notes.*.background_image' => ['nullable', 'string'],

            'schedules' => ['nullable', 'array'],
            'schedules.*' => ['array'],
            'schedules.*.local_id' => ['nullable', 'integer'],
            'schedules.*.server_id' => ['nullable', 'integer'],
            'schedules.*.updated_ms' => ['required', 'integer', 'min:0'],
            'schedules.*.deleted' => ['nullable', 'boolean'],
            'schedules.*.name' => ['nullable', 'string', 'max:255'],
            'schedules.*.slots' => ['nullable', 'string'],
            'schedules.*.only_weekdays' => ['nullable', 'boolean'],
            'schedules.*.active' => ['nullable', 'boolean'],
            'schedules.*.position' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach ($this->recordList('entries') as $index => $record) {
                    $date = is_array($record) && is_string($record['date'] ?? null) ? $record['date'] : null;

                    if ($date === null || preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
                        $validator->errors()->add("entries.{$index}.date", __('validation.custom.date.invalid'));

                        continue;
                    }

                    $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, config('app.timezone'));

                    if ($day === null || $day->toDateString() !== $date) {
                        $validator->errors()->add("entries.{$index}.date", __('validation.custom.date.invalid'));

                        continue;
                    }

                    if ($day->isAfter(CarbonImmutable::today())) {
                        $validator->errors()->add("entries.{$index}.date", __('validation.custom.date.future'));
                    }
                }

                foreach ($this->recordList('notes') as $index => $record) {
                    if (! is_array($record) || ($record['deleted'] ?? false)) {
                        continue;
                    }

                    $title = $record['title'] ?? null;
                    $body = $record['body'] ?? null;

                    if (blank(is_string($title) ? $title : null) && blank(is_string($body) ? $body : null)) {
                        $validator->errors()->add("notes.{$index}.body", __('messages.notes.empty'));
                    }

                    $kind = is_string($record['kind'] ?? null) ? $record['kind'] : '';

                    if (in_array($kind, Note::DATED_KINDS, true) && blank($record['date'] ?? null)) {
                        $validator->errors()->add("notes.{$index}.date", __('messages.notes.dated-kind-needs-date'));
                    }
                }

                foreach ($this->recordList('schedules') as $index => $record) {
                    if (! is_array($record) || ($record['deleted'] ?? false)) {
                        continue;
                    }

                    if (blank(is_string($record['name'] ?? null) ? $record['name'] : null)) {
                        $validator->errors()->add("schedules.{$index}.name", __('validation.required'));
                    }
                }
            },
        ];
    }

    /**
     * The raw record list under the given key, before validation.
     *
     * @return array<int, mixed>
     */
    private function recordList(string $key): array
    {
        $records = $this->input($key);

        if (! is_array($records)) {
            return [];
        }

        return array_values($records);
    }
}
