<?php

namespace App\Security;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Single-use backup codes for an account that lost its authenticator device.
 *
 * Only hashes are stored, exactly like passwords: the plain codes are shown
 * once when they are created and can never be read back. Each code works a
 * single time and is then removed from the account.
 */
class RecoveryCodes
{
    /** How many codes are issued at a time. */
    public const COUNT = 8;

    /**
     * A fresh set of plain codes in the `xxxx-xxxx` shape.
     *
     * @return array<int, string>
     */
    public function generate(): array
    {
        $codes = [];

        while (count($codes) < self::COUNT) {
            $raw = Str::upper(Str::random(8));
            $code = substr($raw, 0, 4).'-'.substr($raw, 4);

            if (! in_array($code, $codes, true)) {
                $codes[] = $code;
            }
        }

        return $codes;
    }

    /**
     * Hash the given codes for storage.
     *
     * @param  array<int, string>  $codes
     * @return array<int, string>
     */
    public function hash(array $codes): array
    {
        return array_values(array_map(
            fn (string $code): string => Hash::make($code),
            $codes,
        ));
    }

    /**
     * Consume the matching recovery code, if the given code is valid. The
     * code is removed from the account so it can never be used twice.
     */
    public function consume(User $user, string $code): bool
    {
        $hashes = $user->two_factor_recovery_codes;

        if (! is_array($hashes)) {
            return false;
        }

        $normalized = $this->normalize($code);

        foreach (array_filter($hashes, 'is_string') as $index => $hash) {
            if (! Hash::check($normalized, $hash)) {
                continue;
            }

            unset($hashes[$index]);

            $user->forceFill(['two_factor_recovery_codes' => array_values($hashes)])->save();

            return true;
        }

        return false;
    }

    /**
     * The canonical form of whatever the user typed: upper case, dash in the
     * middle, so `abcd efgh` and `ABCD-EFGH` are the same code.
     */
    private function normalize(string $code): string
    {
        $clean = Str::upper((string) preg_replace('/[^a-zA-Z0-9]/', '', $code));

        if (strlen($clean) !== 8) {
            return $clean;
        }

        return substr($clean, 0, 4).'-'.substr($clean, 4);
    }
}
