<?php

namespace App\Http\Requests;

use App\Models\Note;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveNoteRequest extends FormRequest
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
            'body' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:255'],
            'kind' => ['nullable', 'string', Rule::in(Note::KINDS)],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'background_image' => ['nullable', 'string'],
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
                if ($this->isEmpty()) {
                    $validator->errors()->add('body', __('messages.notes.empty'));
                }

                if ($this->kindNeedsDate() && blank($this->input('date'))) {
                    $validator->errors()->add('date', __('messages.notes.dated-kind-needs-date'));
                }
            },
        ];
    }

    /**
     * Determine whether the submitted note has neither a title nor a body.
     */
    private function isEmpty(): bool
    {
        return blank($this->string('title')->toString())
            && blank($this->string('body')->toString());
    }

    /**
     * Determine whether the chosen kind requires a date.
     */
    private function kindNeedsDate(): bool
    {
        $kind = $this->string('kind')->toString();

        return in_array($kind, Note::DATED_KINDS, true);
    }
}
