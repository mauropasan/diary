<?php

return [

    'login' => [
        'failed' => 'The provided credentials do not match our records.',
        'unwrap-failed' => 'Could not decrypt the diary key; the data may be corrupted.',
    ],

    'unlock' => [
        'wrong-password' => 'The password is incorrect.',
        'unwrap-failed' => 'Could not decrypt the diary key; the data may be corrupted.',
    ],

    'recovery' => [
        'no-account' => 'There is no account with a recovery key for that email address.',
        'invalid-key' => 'The recovery key is not valid, or the data is corrupted.',
        'restored' => 'Access restored and password updated.',
    ],

    'register' => [
        'ready' => 'Your diary is ready.',
    ],

    'password' => [
        'updated' => 'Password updated. The diary key has been re-protected with the new password.',
        'unwrap-failed' => 'Could not decrypt the diary key; the data may be corrupted.',
    ],

    'admin' => [
        'created' => 'Account for :name created. Hand the password and recovery key to the new user.',
        'self-delete' => 'You cannot delete your own account.',
        'deleted' => 'The account for :name has been deleted.',
    ],

    'moods' => [
        1 => 'Very bad',
        2 => 'Bad',
        3 => 'Okay',
        4 => 'Good',
        5 => 'Very good',
    ],

    'export' => [
        'title' => 'Diary',
        'mood' => 'Mood: :mood',
        'tags' => 'Tags: :tags',
    ],

    'notes' => [
        'empty' => 'Write a title or some text.',
        'dated-kind-needs-date' => 'A reminder or event needs a day.',
    ],

];
