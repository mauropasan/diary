<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the wrapped data encryption key cannot be unwrapped, indicating
 * either an incorrect password or corrupted key material.
 */
class KeyUnwrapException extends RuntimeException
{
    //
}
