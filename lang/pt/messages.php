<?php

return [

    'login' => [
        'failed' => 'As credenciais indicadas não correspondem aos nossos registos.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'unlock' => [
        'wrong-password' => 'A palavra-passe está incorreta.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'recovery' => [
        'no-account' => 'Não existe nenhuma conta com chave de recuperação para esse email.',
        'invalid-key' => 'A chave de recuperação não é válida ou os dados estão corrompidos.',
        'restored' => 'Acesso restaurado e palavra-passe atualizada.',
    ],

    'register' => [
        'ready' => 'O teu diário está pronto.',
    ],

    'password' => [
        'updated' => 'Palavra-passe atualizada. A chave do diário foi novamente protegida com a nova palavra-passe.',
        'unwrap-failed' => 'Não foi possível desencriptar a chave do diário; os dados podem estar corrompidos.',
    ],

    'two_factor' => [
        'ready' => 'Escaneie o código QR e confirme um código para ativar a autenticação de dois fatores.',
        'enabled' => 'A autenticação de dois fatores está ativa.',
        'disabled' => 'A autenticação de dois fatores está desativada.',
        'codes-regenerated' => 'Novos códigos de recuperação gerados. Os anteriores já não funcionam.',
        'invalid-code' => 'Esse código não é válido. Verifica a tua aplicação de autenticação e tenta novamente.',
    ],

    'admin' => [
        'created' => 'Conta de :name criada. Entrega a palavra-passe e a chave de recuperação ao novo utilizador.',
        'self-delete' => 'Não podes eliminar a tua própria conta.',
        'deleted' => 'A conta de :name foi eliminada.',
        'email-updated' => 'O e-mail de :name foi atualizado.',
        'two-factor-disabled' => 'A autenticação de dois fatores foi desativada para :name.',
    ],

    'moods' => [
        1 => 'Muito mau',
        2 => 'Mau',
        3 => 'Razoável',
        4 => 'Bom',
        5 => 'Muito bom',
    ],

    'export' => [
        'title' => 'Diário',
        'mood' => 'Humor: :mood',
        'tags' => 'Etiquetas: :tags',
    ],

    'notes' => [
        'empty' => 'Escreve um título ou algum texto.',
        'dated-kind-needs-date' => 'Um lembrete ou um evento precisa de um dia.',
    ],

    'settings' => [
        'background-updated' => 'Fundo atualizado.',
        'email-updated' => 'E-mail atualizado.',
        'notifications-updated' => 'Notificações de e-mail atualizadas.',
    ],

    'notifications' => [
        'created' => 'Lembrete criado.',
        'deleted' => 'Notificação eliminada.',
    ],

    'emails' => [
        'reminder' => [
            'subject' => 'Novo lembrete em :app',
            'heading' => 'Novo lembrete em :app',
            'intro' => 'Olá :name,',
            'body' => 'Tem um novo lembrete no seu diário. Abra a aplicação para ver.',
            'openDiary' => 'Abrir diário',
            'note' => 'Este e-mail não contém conteúdo do diário. As suas entradas permanecem cifradas e só podem ser lidas no seu diário.',
        ],
    ],

];
