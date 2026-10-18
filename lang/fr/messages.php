<?php

return [

    'login' => [
        'failed' => 'Ces identifiants ne correspondent pas à nos enregistrements.',
        'unwrap-failed' => 'Impossible de déchiffrer la clé du journal ; les données sont peut-être corrompues.',
    ],

    'unlock' => [
        'wrong-password' => 'Le mot de passe est incorrect.',
        'unwrap-failed' => 'Impossible de déchiffrer la clé du journal ; les données sont peut-être corrompues.',
    ],

    'recovery' => [
        'no-account' => 'Aucun compte avec une clé de récupération ne correspond à cet e-mail.',
        'invalid-key' => 'La clé de récupération est invalide ou les données sont corrompues.',
        'restored' => 'Accès restauré et mot de passe mis à jour.',
    ],

    'register' => [
        'ready' => 'Votre journal est prêt.',
    ],

    'password' => [
        'updated' => 'Mot de passe mis à jour. La clé du journal a été re-protégée avec le nouveau mot de passe.',
        'unwrap-failed' => 'Impossible de déchiffrer la clé du journal ; les données sont peut-être corrompues.',
    ],

    'two_factor' => [
        'ready' => 'Scannez le code QR et confirmez un code pour activer l\'authentification à deux facteurs.',
        'enabled' => 'L\'authentification à deux facteurs est activée.',
        'disabled' => 'L\'authentification à deux facteurs est désactivée.',
        'codes-regenerated' => 'De nouveaux codes de récupération ont été générés. Les précédents ne fonctionnent plus.',
        'invalid-code' => 'Ce code n\'est pas valide. Vérifiez votre application d\'authentification et réessayez.',
        'password-required' => 'Saisissez votre mot de passe pour désactiver l\'authentification à deux facteurs.',
        'invalid-password' => 'Ce mot de passe n\'est pas correct, l\'authentification à deux facteurs reste donc activée.',
    ],

    'admin' => [
        'created' => 'Compte de :name créé. Remettez le mot de passe et la clé de récupération au nouvel utilisateur.',
        'self-delete' => 'Vous ne pouvez pas supprimer votre propre compte.',
        'deleted' => 'Le compte de :name a été supprimé.',
        'email-updated' => 'L\'adresse e-mail de :name a été mise à jour.',
        'two-factor-disabled' => 'L\'authentification à deux facteurs a été désactivée pour :name et toutes ses sessions ont été fermées.',
    ],

    'moods' => [
        1 => 'Très mal',
        2 => 'Mal',
        3 => 'Moyen',
        4 => 'Bien',
        5 => 'Très bien',
    ],

    'export' => [
        'title' => 'Journal',
        'mood' => 'Humeur : :mood',
        'tags' => 'Étiquettes : :tags',
    ],

    'notes' => [
        'empty' => 'Écris un titre ou un peu de texte.',
        'dated-kind-needs-date' => 'Un rappel ou un événement a besoin d\'un jour.',
    ],

    'settings' => [
        'background-updated' => 'Arrière-plan mis à jour.',
        'email-updated' => 'Adresse e-mail mise à jour.',
        'notifications-updated' => 'Notifications par e-mail mises à jour.',
    ],

    'notifications' => [
        'created' => 'Rappel créé.',
        'deleted' => 'Notification supprimée.',

        // Messages que l\'application émet elle-même. Ils sont stockés sous
        // forme de clé et de paramètres, puis traduits à la lecture.
        'kinds' => [
            'two_factor_enabled' => [
                'title' => 'Authentification à deux facteurs activée',
                'body' => 'L\'authentification à deux facteurs est activée sur votre compte. À la connexion, un code de votre application d\'authentification sera demandé.',
            ],
            'two_factor_disabled' => [
                'title' => 'Authentification à deux facteurs désactivée',
                'body' => 'L\'authentification à deux facteurs est désactivée sur votre compte. Seul votre mot de passe sera nécessaire pour vous connecter.',
            ],
            'two_factor_disabled_by_admin' => [
                'title' => 'Un administrateur a désactivé votre authentification à deux facteurs',
                'body' => ':actor a désactivé l\'authentification à deux facteurs de votre compte. Désormais, seul votre mot de passe sera nécessaire pour vous connecter.',
            ],
        ],
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Nouveau rappel dans :app',
            'heading' => 'Nouveau rappel dans :app',
            'intro' => 'Bonjour :name,',
            'body' => 'Vous avez un nouveau rappel dans votre journal. Ouvrez l\'app pour le voir.',
            'openDiary' => 'Ouvrir le journal',
            'note' => 'Cet e-mail ne contient aucun contenu du journal. Vos entrées restent chiffrées et ne sont lisibles que dans votre journal.',
        ],

        'two_factor' => [
            'intro' => 'Bonjour :name,',
            'two_factor_enabled' => [
                'subject' => 'Authentification à deux facteurs activée dans :app',
                'heading' => 'L\'authentification à deux facteurs est activée',
                'body' => 'Vous avez activé l\'authentification à deux facteurs. Désormais, un code de votre application d\'authentification sera nécessaire, en plus de votre mot de passe, pour vous connecter. Conservez vos codes de récupération en lieu sûr.',
            ],
            'two_factor_disabled' => [
                'subject' => 'Authentification à deux facteurs désactivée dans :app',
                'heading' => 'L\'authentification à deux facteurs est désactivée',
                'body' => 'Vous avez désactivé l\'authentification à deux facteurs. Seul votre mot de passe sera nécessaire pour vous connecter.',
            ],
            'two_factor_disabled_by_admin' => [
                'subject' => 'Authentification à deux facteurs désactivée dans :app',
                'heading' => 'Un administrateur a désactivé votre authentification à deux facteurs',
                'body' => 'Un administrateur (:actor) a désactivé l\'authentification à deux facteurs de votre compte. Seul votre mot de passe sera nécessaire pour vous connecter.',
            ],
            'signedOut' => 'Par sécurité, toutes les sessions ouvertes de votre compte ont été fermées : vous devrez vous reconnecter.',
            'warning' => 'Si vous n\'attendiez pas ce changement, demandez à l\'administrateur du journal de vérifier.',
            'openDiary' => 'Ouvrir le journal',
            'noContent' => 'Cet e-mail ne contient aucun contenu du journal. Vos entrées restent chiffrées et ne sont lisibles que dans votre journal.',
        ],
    ],

];
