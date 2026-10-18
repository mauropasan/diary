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
        'password-required' => 'Enter your password to turn two-factor authentication off.',
        'invalid-password' => 'That password is not correct, so two-factor authentication was left on.',
    ],

    'admin' => [
        'created' => 'Account for :name created. Hand the password and recovery key to the new user.',
        'self-delete' => 'You cannot delete your own account.',
        'deleted' => 'The account for :name has been deleted.',
        'email-updated' => 'The email for :name has been updated.',
        'two-factor-disabled' => 'Two-factor authentication has been turned off for :name and they have been signed out everywhere.',
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
        'reminder-updated' => 'Reminder schedule updated.',
        'reminder-days-invalid' => 'Choose how many days ahead to be reminded, between 0 and :max.',
        'reminder-times-invalid' => 'Choose between 1 and :max reminder times a day.',
        'reminder-time-invalid' => 'Each reminder time must be written as HH:mm.',
        'notifications' => 'Email notifications',
        'notificationsSubtitle' => 'Receive an email when a new reminder is created.',
        'emailNotifications' => 'Email notifications',
        'emailNotificationsOn' => 'On',
        'emailNotificationsOff' => 'Off',
    ],

    'notifications' => [
        'created' => 'Reminder created.',
        'deleted' => 'Notification deleted.',

        // Messages the application raises on its own. They are stored as a key
        // and its parameters, so they can be translated when they are read.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Two-factor authentication turned on',
                'body' => 'Two-factor authentication is on for your account. Signing in will ask for a code from your authenticator app.',
            ],
            'two_factor_disabled' => [
                'title' => 'Two-factor authentication turned off',
                'body' => 'Two-factor authentication is off for your account. Signing in only needs your password again.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'An administrator turned off your two-factor authentication',
                'body' => ':actor turned off two-factor authentication for your account. Signing in only needs your password from now on.',
            ],
        ],
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

        'two_factor' => [
            'intro' => 'Hello :name,',
            'two_factor_enabled' => [
                'subject' => 'Two-factor authentication on in :app',
                'heading' => 'Two-factor authentication is on',
                'body' => 'You turned on two-factor authentication. From now on you will need a code from your authenticator app, as well as your password, to sign in. Keep your recovery codes somewhere safe.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Two-factor authentication off in :app',
                'heading' => 'Two-factor authentication is off',
                'body' => 'You turned off two-factor authentication. Signing in only needs your password again.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Two-factor authentication turned off in :app',
                'heading' => 'An administrator turned off your two-factor authentication',
                'body' => 'An administrator (:actor) turned off two-factor authentication for your account. Signing in only needs your password again.',
            ],
            'signedOut' => 'Every session that was open on your account has been closed, so you will be asked to sign in again.',
            'warning' => 'If you did not expect this change, ask the administrator of the diary to look into it.',
            'openDiary' => 'Open diary',
            'noContent' => 'This email contains no diary content. Your entries stay encrypted and can only be read in your diary.',
        ],
    ],

];
