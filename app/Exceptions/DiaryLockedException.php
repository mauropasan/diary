<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when entry content is read or written while the diary is locked and
 * no data encryption key is available in the session.
 */
class DiaryLockedException extends RuntimeException
{
    //
}
