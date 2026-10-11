<?php

return [

    'login' => [
        'failed' => 'Las credenciales no coinciden con nuestros registros.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'unlock' => [
        'wrong-password' => 'La contraseña no es correcta.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'recovery' => [
        'no-account' => 'No hay ninguna cuenta con clave de recuperación para ese correo.',
        'invalid-key' => 'La clave de recuperación no es válida o los datos están dañados.',
        'restored' => 'Acceso restaurado y contraseña actualizada.',
    ],

    'register' => [
        'ready' => 'Tu diario está listo.',
    ],

    'password' => [
        'updated' => 'Contraseña actualizada. La clave del diario se ha vuelto a proteger con la nueva contraseña.',
        'unwrap-failed' => 'No se pudo descifrar la clave del diario; los datos pueden estar dañados.',
    ],

    'admin' => [
        'created' => 'Cuenta de :name creada. Entrega la contraseña y la clave de recuperación al nuevo usuario.',
        'self-delete' => 'No puedes eliminar tu propia cuenta.',
        'deleted' => 'La cuenta de :name ha sido eliminada.',
    ],

    'moods' => [
        1 => 'Muy mal',
        2 => 'Mal',
        3 => 'Regular',
        4 => 'Bien',
        5 => 'Muy bien',
    ],

    'export' => [
        'title' => 'Diario',
        'mood' => 'Ánimo: :mood',
        'tags' => 'Etiquetas: :tags',
    ],

    'notes' => [
        'empty' => 'Escribe un título o algo de texto.',
        'dated-kind-needs-date' => 'Un recordatorio o un evento necesita un día.',
    ],

];
