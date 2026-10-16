<?php

namespace App\Console\Commands;

use App\Crypto\DiaryCrypto;
use App\Crypto\DiaryKeyManager;
use App\Exceptions\DecryptionFailedException;
use App\Exceptions\KeyUnwrapException;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\password;

#[Signature('diary:encrypt-schedules {--user=* : Only convert schedules belonging to these user emails}')]
#[Description('Encrypt plaintext schedule name/slots in place with each user\'s diary key')]
class EncryptSchedules extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(DiaryCrypto $crypto, DiaryKeyManager $keys): int
    {
        $emails = $this->option('user');

        $query = User::query()->orderBy('id');

        if ($emails !== []) {
            $query->whereIn('email', $emails);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            $this->components->error('No matching users found.');

            return self::INVALID;
        }

        foreach ($users as $user) {
            $dek = $this->unlockUser($keys, $user);

            if ($dek === null) {
                return self::FAILURE;
            }

            $converted = $this->convertSchedules($crypto, $user->id, $dek);

            $this->components->info("User {$user->email}: {$converted} schedule(s) encrypted.");
        }

        return self::SUCCESS;
    }

    /**
     * Prompt for the user's password and unwrap their DEK.
     */
    private function unlockUser(DiaryKeyManager $keys, User $user): ?string
    {
        $attempt = 0;

        while ($attempt < 3) {
            $password = password(
                label: "Password for {$user->email}",
                required: true,
            );

            try {
                return $keys->unlock($user, $password);
            } catch (KeyUnwrapException $exception) {
                $attempt++;

                $this->components->error($exception->getMessage());

                if ($attempt >= 3) {
                    $this->components->error(
                        "Too many failed attempts for {$user->email}; aborting before touching any data.",
                    );
                }
            }
        }

        return null;
    }

    /**
     * Encrypt any plaintext name/slots rows for the user, leaving rows that
     * already decrypt with the DEK untouched so the command is idempotent.
     */
    private function convertSchedules(DiaryCrypto $crypto, int $userId, string $dek): int
    {
        $converted = 0;

        $rows = DB::table('schedules')
            ->where('user_id', $userId)
            ->orderBy('id')
            ->get();

        foreach ($rows as $row) {
            $updates = [];

            if (! $this->isEncrypted($crypto, (string) $row->name, $dek)) {
                $updates['name'] = $crypto->encrypt((string) $row->name, $dek);
            }

            if ($row->slots !== null && ! $this->isEncrypted($crypto, (string) $row->slots, $dek)) {
                $updates['slots'] = $crypto->encrypt((string) $row->slots, $dek);
            }

            if ($updates !== []) {
                DB::table('schedules')->where('id', $row->id)->update($updates);

                $converted++;
            }
        }

        return $converted;
    }

    /**
     * A value counts as already encrypted when it decrypts cleanly with the
     * DEK; the AEAD authentication tag makes a false positive on plaintext
     * effectively impossible.
     */
    private function isEncrypted(DiaryCrypto $crypto, string $value, string $dek): bool
    {
        try {
            $crypto->decrypt($value, $dek);

            return true;
        } catch (DecryptionFailedException) {
            return false;
        }
    }
}
