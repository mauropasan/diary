<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an AEAD ciphertext is malformed or fails authentication.
 */
class DecryptionFailedException extends RuntimeException
{
    //
}
