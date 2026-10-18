<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmailRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * A signed-in account always changes its own email; the email of another
     * account can only be edited from the admin routes, which are already
     * behind the `admin` middleware.
     */
    public function authorize(): bool
    {
        if ($this->route('user') === null) {
            return $this->user() instanceof User;
        }

        $user = $this->user();

        return $user instanceof User && $user->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * The target account is ignored by the uniqueness rule so a user can save
     * their current address again without tripping over their own row.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $target = $this->route('user') ?? $this->user();

        return [
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target)],
        ];
    }
}
