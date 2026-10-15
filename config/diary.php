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
    | Locales
    |--------------------------------------------------------------------------
    |
    | The languages the diary user interface can be shown in. Keep this list in
    | sync with `resources/js/i18n/locales.ts`, which drives the same selection
    | on the client. The `SetLocale` middleware resolves the request language
    | from the `lang` cookie first and the Accept-Language header second, then
    | falls back to the default locale below.
    |
    */

    'locales' => ['en', 'es', 'fr', 'de', 'pt', 'it', 'ca'],

    'locale_names' => [
        'en' => 'English',
        'es' => 'Español',
        'fr' => 'Français',
        'de' => 'Deutsch',
        'pt' => 'Português',
        'it' => 'Italiano',
        'ca' => 'Catalan',
    ],

    'default_locale' => 'en',

    'cookie_name' => 'lang',

    /*
    |--------------------------------------------------------------------------
    | Backgrounds
    |--------------------------------------------------------------------------
    |
    | The preset background keys a user can pick for the diary. The chosen key
    | is stored encrypted in `users.background` and applied as a CSS class of
    | the same name (e.g. `bg-paper`) defined in `resources/css/app.css`, with
    | a dark-mode variant. Keys are stored in the database, so keep them
    | stable once shipped. `default` means no custom background.
    |
    */

    'backgrounds' => ['default', 'paper', 'sky', 'sage', 'peach', 'slate'],

    /*
    |--------------------------------------------------------------------------
    | Background image
    |--------------------------------------------------------------------------
    |
    | Maximum size for a custom background image, in kilobytes. The image is
    | stored as an encrypted `data:` URI on the user and served through the
    | background route, so keep this modest.
    |
    */

    'background' => [
        'max_size_kb' => (int) env('DIARY_MAX_BACKGROUND_KB', 2048),
    ],

    /*
    |--------------------------------------------------------------------------
    | Attachments
    |--------------------------------------------------------------------------
    |
    | Maximum size for a single attached file, in kilobytes. PHP must accept
    | multipart bodies at least this large (`upload_max_filesize` and
    | `post_max_size`), otherwise uploads are rejected before validation runs.
    |
    */

    'attachments' => [
        'max_size_kb' => (int) env('DIARY_MAX_ATTACHMENT_KB', 25600),
    ],

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
