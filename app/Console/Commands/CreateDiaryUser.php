<?php

namespace App\Console\Commands;

use App\Crypto\DiaryKeyManager;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

#[Signature('diary:create-user')]
#[Description('Create a diary user and generate their encryption key material')]
class CreateDiaryUser extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(DiaryKeyManager $keys): int
    {
        $name = text(
            label: 'Name',
            required: true,
        );

        $email = text(
            label: 'Email address',
            required: true,
            validate: fn (string $value): ?string => $this->validateEmail($value),
        );

        $secret = password(
            label: 'Password',
            required: true,
            validate: fn (string $value): ?string => $this->validatePassword($value),
        );

        $confirmation = password(
            label: 'Confirm password',
            required: true,
        );

        if ($secret !== $confirmation) {
            $this->components->error('The passwords do not match.');

            return self::INVALID;
        }

        $user = new User([
            'name' => $name,
            'email' => $email,
            'password' => $secret,
        ]);

        // The very first account on a fresh install becomes the administrator.
        $user->is_admin = User::query()->doesntExist();

        $user->save();

        $recoveryKey = $keys->provision($user, $secret);

        $this->components->info("Diary user [{$user->email}] created.");

        if ($user->is_admin) {
            $this->components->info('This user is the administrator: they can create and remove diary accounts.');
        }

        $this->components->warn(
            'Save this recovery key now. It is shown only once and lets you restore '
            .'access if you forget your password. Keep it somewhere safe and offline.',
        );
        $this->components->info("Recovery key: {$recoveryKey}");

        return self::SUCCESS;
    }

    private function validateEmail(string $value): ?string
    {
        $validator = Validator::make(
            ['email' => $value],
            ['email' => ['required', 'string', 'email', 'max:255', 'unique:users,email']],
        );

        return $validator->fails() ? $validator->errors()->first('email') : null;
    }

    private function validatePassword(string $value): ?string
    {
        $validator = Validator::make(
            ['password' => $value],
            ['password' => ['required', 'string', Password::min(8)]],
        );

        return $validator->fails() ? $validator->errors()->first('password') : null;
    }
}
