<?php

use App\Models\User;

it('adds baseline security headers to web responses', function () {
    $this->get(route('login'))
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'same-origin')
        ->assertHeader(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=()',
        );
});

it('sends the content security policy only in production', function () {
    $this->get(route('login'))
        ->assertHeaderMissing('Content-Security-Policy');

    app()['env'] = 'production';

    $response = $this->get(route('login'));

    expect($response->headers->get('Content-Security-Policy'))
        ->toContain("script-src 'self'")
        ->toContain("frame-ancestors 'none'");
});

it('sends strict transport security only over https', function () {
    $this->get(route('login'))
        ->assertHeaderMissing('Strict-Transport-Security');

    $this->get('https://localhost/login')
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

it('keeps the unlocked diary session cookie secure in production', function () {
    $user = User::factory()->withDiaryKey('secret-password')->create();

    config(['session.secure' => true]);

    $response = $this->actingAs($user)
        ->post(route('diary.unlock.store'), ['password' => 'secret-password']);

    $sessionCookie = collect($response->headers->all('set-cookie'))
        ->first(fn (string $header): bool => str_contains($header, config('session.cookie').'='));

    expect($sessionCookie)->toContain('secure');
});
