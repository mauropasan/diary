<?php

namespace App\Security;

use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use RuntimeException;

/**
 * Time-based one-time passwords (RFC 6238) and the material needed to
 * enrol a device: the base32 secret, the otpauth:// URL and the QR code
 * that carries it into an authenticator app.
 *
 * Deliberately free of framework dependencies, so the crypto can be unit
 * tested against the RFC test vectors.
 */
class Totp
{
    /** How many digits a code has; six is what authenticator apps expect. */
    public const DIGITS = 6;

    /** Seconds per code; thirty is the de-facto standard period. */
    public const PERIOD = 30;

    /** How many neighbouring codes are accepted to tolerate clock drift. */
    public const WINDOW = 1;

    private const ALGORITHM = 'sha1';

    /** A 160 bit secret encodes to exactly 32 base32 characters. */
    private const SECRET_BYTES = 20;

    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * A fresh secret, ready to be stored and shown as an enrolment code.
     */
    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(self::SECRET_BYTES));
    }

    /**
     * The code for the given moment, zero padded to six digits.
     */
    public function currentCode(string $secret, ?int $at = null): string
    {
        $key = $this->base32Decode($secret);

        if ($key === null || $key === '') {
            return '';
        }

        $counter = intdiv($at ?? time(), self::PERIOD);

        return $this->generate($key, $counter);
    }

    /**
     * Whether the given code is the current code for the secret, allowing for
     * one step of clock drift in either direction.
     */
    public function verify(string $code, string $secret, ?int $at = null): bool
    {
        $code = trim($code);

        if (! preg_match('/^\d{'.self::DIGITS.'}$/', $code)) {
            return false;
        }

        $key = $this->base32Decode($secret);

        if ($key === null || $key === '') {
            return false;
        }

        $counter = intdiv($at ?? time(), self::PERIOD);

        for ($offset = -self::WINDOW; $offset <= self::WINDOW; $offset++) {
            if ($counter + $offset < 0) {
                continue;
            }

            if (hash_equals($this->generate($key, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The otpauth:// URL that enrols an authenticator app with the account.
     */
    public function otpauthUrl(string $issuer, string $account, string $secret): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=%s&digits=%d&period=%d',
            rawurlencode($issuer),
            rawurlencode($account),
            rawurlencode($secret),
            rawurlencode($issuer),
            strtoupper(self::ALGORITHM),
            self::DIGITS,
            self::PERIOD,
        );
    }

    /**
     * The enrolment URL as an SVG data URI, ready for an <img> tag.
     */
    public function qrCodeDataUri(string $url): string
    {
        $options = new QROptions([
            'eccLevel' => EccLevel::M,
            'svgAddXmlHeader' => false,
            'outputBase64' => false,
        ]);

        $svg = (new QRCode($options))->render($url);

        if (! is_string($svg)) {
            throw new RuntimeException('Could not render the QR code.');
        }

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /**
     * The HOTP value (RFC 4226) for the given counter, truncated to six
     * digits the way every authenticator app does it.
     */
    private function generate(string $key, int $counter): string
    {
        $hmac = hash_hmac(self::ALGORITHM, pack('N2', $counter >> 32, $counter & 0xFFFFFFFF), $key, true);

        $offset = ord($hmac[19]) & 0x0F;

        $unpacked = unpack('N', substr($hmac, $offset, 4));
        $value = is_array($unpacked) ? ((int) $unpacked[1]) & 0x7FFFFFFF : 0;

        return str_pad((string) ($value % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * RFC 4648 base32, upper case, padding optional.
     */
    private function base32Encode(string $data): string
    {
        $buffer = 0;
        $bits = 0;
        $out = '';

        foreach (str_split($data) as $byte) {
            $buffer = ($buffer << 8) | ord($byte);
            $bits += 8;

            while ($bits >= 5) {
                $bits -= 5;
                $out .= self::BASE32_ALPHABET[($buffer >> $bits) & 0b11111];
            }
        }

        if ($bits > 0) {
            $out .= self::BASE32_ALPHABET[($buffer << (5 - $bits)) & 0b11111];
        }

        return $out;
    }

    /**
     * Decode a base32 secret, or null when it is not valid base32.
     */
    private function base32Decode(string $secret): ?string
    {
        $buffer = 0;
        $bits = 0;
        $out = '';

        foreach (str_split(strtoupper(rtrim($secret, '='))) as $char) {
            $index = strpos(self::BASE32_ALPHABET, $char);

            if ($index === false) {
                return null;
            }

            $buffer = ($buffer << 5) | $index;
            $bits += 5;

            if ($bits >= 8) {
                $bits -= 8;
                $out .= chr(($buffer >> $bits) & 0xFF);
            }
        }

        return $out;
    }
}
