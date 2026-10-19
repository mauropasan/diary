<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Custom validation language lines (English)
    |--------------------------------------------------------------------------
    |
    | Only the diary's own keys live here; every other validation message is
    | provided by the framework's built-in English language files and merged
    | in by the translator.
    |
    */

    'custom' => [
        'date' => [
            'invalid' => 'The date is not valid.',
            'future' => 'You cannot write on future dates.',
            'future_attachment' => 'You cannot attach files on future dates.',
        ],
    ],

];
