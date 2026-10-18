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

    'admin' => [
        'created' => 'Compte de :name créé. Remettez le mot de passe et la clé de récupération au nouvel utilisateur.',
        'self-delete' => 'Vous ne pouvez pas supprimer votre propre compte.',
        'deleted' => 'Le compte de :name a été supprimé.',
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
        'notifications-updated' => 'Notifications par e-mail mises à jour.',
    ],

    'notifications' => [
        'created' => 'Rappel créé.',
        'deleted' => 'Notification supprimée.',
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
    ],

];
