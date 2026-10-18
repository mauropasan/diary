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

    'two_factor' => [
        'ready' => 'Scan the QR code and confirm a code to turn two-factor authentication on.',
        'enabled' => 'Two-factor authentication is on.',
        'disabled' => 'Two-factor authentication is off.',
        'codes-regenerated' => 'New recovery codes generated. The previous codes no longer work.',
        'invalid-code' => 'That code is not valid. Check your authenticator app and try again.',
    ],

    'admin' => [
        'created' => 'Account for :name created. Hand the password and recovery key to the new user.',
        'self-delete' => 'You cannot delete your own account.',
        'deleted' => 'The account for :name has been deleted.',
        'email-updated' => 'The email for :name has been updated.',
        'two-factor-disabled' => 'Two-factor authentication has been turned off for :name.',
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

    'settings' => [
        'background-updated' => 'Background updated.',
        'email-updated' => 'Email updated.',
        'notifications-updated' => 'Email notifications updated.',
        'notifications' => 'Email notifications',
        'notificationsSubtitle' => 'Receive an email when a new reminder is created.',
        'emailNotifications' => 'Email notifications',
        'emailNotificationsOn' => 'On',
        'emailNotificationsOff' => 'Off',
    ],

    'notifications' => [
        'created' => 'Reminder created.',
        'deleted' => 'Notification deleted.',
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'New reminder in :app',
            'heading' => 'New reminder in :app',
            'intro' => 'Hello :name,',
            'body' => 'You have a new reminder in your diary. Open the app to see it.',
            'openDiary' => 'Open diary',
            'note' => 'This email contains no diary content. Your entries stay encrypted and can only be read in your diary.',
        ],
    ],

];
