<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAttachmentRequest extends FormRequest
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
            'attachment' => ['required', 'file', 'max:'.config('diary.attachments.max_size_kb')],
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
                    $validator->errors()->add('date', 'La fecha no es válida.');

                    return;
                }

                if ($this->dateIsInTheFuture()) {
                    $validator->errors()->add('date', 'No puedes adjuntar archivos en fechas futuras.');
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
}
