<?php

namespace App\Providers;

use App\Crypto\DiaryCrypto;
use App\Crypto\DiaryKeyStore;
use App\Crypto\TransientKey;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\DevCommands;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(DiaryCrypto::class);
        $this->app->scoped(DiaryKeyStore::class);

        // The stateless sync API parks the header-verified DEK here for the
        // duration of one request; the web session flow never touches it.
        $this->app->singleton(TransientKey::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureDevServer();
    }

    /**
     * Serve the development server on the host and port declared in APP_URL so
     * other devices on the network can reach it (e.g. http://192.168.1.4:8000).
     */
    protected function configureDevServer(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $url = (string) config('app.url');
        $host = parse_url($url, PHP_URL_HOST) ?: '127.0.0.1';
        $port = parse_url($url, PHP_URL_PORT) ?: 8000;

        DevCommands::artisan("serve --host={$host} --port={$port}", 'server');
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
