<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

it('defaults to the configured locale when nothing is provided', function () {
    $this->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('locale', config('diary.default_locale'))
        );
});

it('prefers the lang cookie over the accept-language header', function () {
    $this->withUnencryptedCookie('lang', 'fr')
        ->withHeader('Accept-Language', 'es')
        ->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('locale', 'fr')
        );
});

it('ignores an unsupported lang cookie', function () {
    $this->withUnencryptedCookie('lang', 'xx')
        ->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('locale', config('diary.default_locale'))
        );
});

it('resolves the locale from the accept-language header', function () {
    $this->withHeader('Accept-Language', 'de-DE,de;q=0.9')
        ->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('locale', 'de')
        );
});

it('matches a supported base code from the accept-language header', function () {
    $this->withHeader('Accept-Language', 'pt-BR,pt;q=0.9')
        ->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('locale', 'pt')
        );
});

it('shares the supported locales', function () {
    $this->get(route('register'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('locales', count(config('diary.locales')))
            ->where('locales.0.code', 'en')
            ->where('locales.0.name', 'English')
        );
});

it('translates server messages to the request locale', function () {
    User::factory()->withDiaryKey('secret-password')->create([
        'email' => 'me@example.com',
    ]);

    $this->withUnencryptedCookie('lang', 'fr')
        ->from(route('login'))
        ->post(route('login.store'), [
            'email' => 'me@example.com',
            'password' => 'wrong-password',
        ])
        ->assertSessionHasErrors([
            'email' => trans('messages.login.failed', [], 'fr'),
        ]);
});
