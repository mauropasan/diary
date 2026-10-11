<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use PDO;
use Symfony\Component\Finder\SplFileInfo;

#[Signature('diary:backup {--keep= : Number of backups to retain}')]
#[Description('Create a consistent SQLite backup of the diary database')]
class BackupDiary extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        if ($driver !== 'sqlite') {
            $this->components->error('The diary backup only supports SQLite databases.');

            return self::FAILURE;
        }

        $database = config("database.connections.{$connection}.database");

        if (! is_string($database) || $database === ':memory:' || ! is_file($database)) {
            $this->components->error('The SQLite database file could not be found.');

            return self::FAILURE;
        }

        $directory = (string) config('diary.backup.path');

        File::ensureDirectoryExists($directory);

        $target = $directory.DIRECTORY_SEPARATOR.'diary-'.now()->format('Y-m-d_His').'.sqlite';

        $pdo = new PDO('sqlite:'.$database, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('VACUUM INTO '.$pdo->quote($target));

        $this->components->info("Backup written to [{$target}].");

        $this->prune($directory, (int) ($this->option('keep') ?? config('diary.backup.keep')));

        return self::SUCCESS;
    }

    /**
     * Delete the oldest backups, keeping only the most recent ones.
     */
    private function prune(string $directory, int $keep): void
    {
        if ($keep < 1) {
            return;
        }

        collect(File::files($directory))
            ->filter(fn (SplFileInfo $file): bool => $file->getExtension() === 'sqlite')
            ->sortByDesc(fn (SplFileInfo $file): int => $file->getMTime())
            ->values()
            ->slice($keep)
            ->each(fn (SplFileInfo $file) => File::delete($file->getPathname()));
    }
}
