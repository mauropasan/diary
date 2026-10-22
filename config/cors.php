<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing
|--------------------------------------------------------------------------
|
| Only the diary's own web origin and the Capacitor shell may call the JSON
| API from a browser context. The API authenticates with a bearer token (not
| cookies), so credentials are deliberately disabled and wildcard origins are
| never used.
|
*/

$appUrl = rtrim((string) env('APP_URL', 'http://localhost'), '/');

$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env(
        'CORS_ALLOWED_ORIGINS',
        implode(',', array_filter([
            $appUrl,
            'capacitor://localhost',
            'https://localhost',
            'http://localhost',
        ])),
    )),
)));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'Origin',
        'X-Diary-Key',
        'X-Requested-With',
        'X-XSRF-TOKEN',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
