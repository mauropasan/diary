(function () {
    try {
        var stored = localStorage.getItem('appearance');
        var dark =
            stored === 'dark' ||
            ((stored === null || stored === 'system') &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    } catch (error) {}
})();
