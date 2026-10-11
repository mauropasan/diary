<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Inactivity lock
    |--------------------------------------------------------------------------
    |
    | Number of minutes of inactivity after which the data encryption key is
    | dropped from the session and the diary must be unlocked again.
    |
    */

    'lock_after_minutes' => (int) env('DIARY_LOCK_AFTER_MINUTES', 15),

    /*
    |--------------------------------------------------------------------------
    | Backups
    |--------------------------------------------------------------------------
    |
    | The diary database is backed up with the `diary:backup` command, which
    | writes a consistent SQLite snapshot and keeps the most recent files.
    |
    */

    'backup' => [
        'path' => storage_path('app/backups'),

        'keep' => (int) env('DIARY_BACKUP_KEEP', 14),
    ],

];
