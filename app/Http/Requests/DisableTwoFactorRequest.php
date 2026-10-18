<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Confirms the password of the account performing the change before two-factor
 * authentication is switched off, from the settings page or the admin list.
 *
 * Signing in again is what protects the account, so turning the second factor
 * off is the one action that must not be possible from an unlocked browser
 * alone.
 */
class DisableTwoFactorRequest extends FormRequest
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
            'current_password' => $this->passwordIsRequired()
                ? ['required', 'string', 'current_password']
                : ['nullable', 'string'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * The framework message is English only; the app ships seven languages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => __('messages.two_factor.password-required'),
            'current_password.current_password' => __('messages.two_factor.invalid-password'),
        ];
    }

    /**
     * Whether the acting account has to confirm its password.
     *
     * Always true when an administrator acts on somebody else's account. On
     * the settings page it is only needed when there is a confirmed second
     * factor to remove: cancelling an enrolment that was never confirmed
     * changes nothing about how the owner signs in.
     */
    private function passwordIsRequired(): bool
    {
        if ($this->route('user') !== null) {
            return true;
        }

        $user = $this->user();

        return $user instanceof User && $user->twoFactorEnabled();
    }
}
