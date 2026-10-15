<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <script>
            (function () {
                try {
                    var stored = localStorage.getItem('appearance');
                    var dark = stored === 'dark' || ((stored === null || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.toggle('dark', dark);
                    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                } catch (error) {}
            })();
        </script>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Diario') }}</title>
        </x-inertia::head>
    </head>
    @php
    /*
     * The background is encrypted with the diary key, so it is only readable
     * once the diary is unlocked; a locked diary falls back to the default.
     * Only the CSS declaration is built here; the attribute quotes stay
     * literal HTML so Blade escaping cannot mangle them.
     */
    $user = auth()->user();
    $background = $user?->backgroundChoice();
    $backgroundClass = '';
    $backgroundStyle = '';

    if ($background === 'image') {
        $backgroundClass = ' app-background-image';
        $backgroundStyle = "--app-background-image: url('".route('diary.background', ['v' => $user->updated_at->getTimestamp()])."')";
    } elseif (is_string($background)) {
        $backgroundClass = ' bg-'.$background;
    }
@endphp
<body class="font-sans antialiased{{ $backgroundClass }}"@if($backgroundStyle !== '') style="{{ $backgroundStyle }}"@endif>
        <x-inertia::app />
    </body>
</html>
