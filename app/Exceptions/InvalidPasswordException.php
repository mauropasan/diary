<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when the supplied password does not match the stored password hash.
 */
class InvalidPasswordException extends RuntimeException
{
    //
}
