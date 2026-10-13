<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use PDO;
use Symfony\Component\Finder\SplFileInfo;

#[Signature('diary:backup {--keep= : Number of backups to retain}')]
#[Description('Create a consistent backup of the diary database (SQLite or MySQL)')]
class BackupDiary extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $connection = config('database.default');
        $driver = config("database.connections.{$connection}.driver");

        return match ($driver) {
            'sqlite' => $this->backupSqlite($connection),
            'mysql', 'mariadb' => $this->backupMysql($connection),
            default => $this->unsupportedDriver($driver),
        };
    }

    /**
     * Back up a SQLite database using VACUUM INTO.
     */
    private function backupSqlite(string $connection): int
    {
        $database = config("database.connections.{$connection}.database");

        if (! is_string($database) || $database === ':memory:' || ! is_file($database)) {
            $this->components->error('The SQLite database file could not be found.');

            return self::FAILURE;
        }

        $directory = $this->backupDirectory();
        $target = $directory.DIRECTORY_SEPARATOR.'diary-'.now()->format('Y-m-d_His').'.sqlite';

        $pdo = new PDO('sqlite:'.$database, options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('VACUUM INTO '.$pdo->quote($target));

        $this->components->info("Backup written to [{$target}].");

        $this->prune($directory, 'sqlite', (int) ($this->option('keep') ?? config('diary.backup.keep')));

        return self::SUCCESS;
    }

    /**
     * Back up a MySQL or MariaDB database using mysqldump.
     */
    private function backupMysql(string $connection): int
    {
        $config = config("database.connections.{$connection}");

        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? '3306';
        $database = $config['database'] ?? '';
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';
        $unixSocket = $config['unix_socket'] ?? null;

        if ($database === '' || $username === '') {
            $this->components->error('The MySQL connection is missing database or username.');

            return self::FAILURE;
        }

        $directory = $this->backupDirectory();
        $target = $directory.DIRECTORY_SEPARATOR.'diary-'.now()->format('Y-m-d_His').'.sql';

        $command = ['mysqldump', '--no-tablespaces', '--single-transaction', '--routines', '--triggers'];

        if (is_string($unixSocket) && $unixSocket !== '') {
            $command[] = '--socket='.$unixSocket;
        } else {
            $command[] = '--host='.$host;
            $command[] = '--port='.$port;
        }

        $command[] = '--user='.$username;
        $command[] = $database;

        $process = proc_open(
            $command,
            [
                0 => ['file', '/dev/null', 'r'],
                1 => ['file', $target, 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            null,
            // Pass the password via the environment so it never appears in the process list.
            array_merge($_ENV, ['MYSQL_PWD' => $password]),
        );

        if (! is_resource($process)) {
            $this->components->error('Failed to start mysqldump. Is it installed and in your PATH?');

            return self::FAILURE;
        }

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            File::delete($target);
            $this->components->error('mysqldump failed: '.trim((string) $stderr));

            return self::FAILURE;
        }

        $this->components->info("Backup written to [{$target}].");

        $this->prune($directory, 'sql', (int) ($this->option('keep') ?? config('diary.backup.keep')));

        return self::SUCCESS;
    }

    /**
     * Reject unsupported drivers.
     */
    private function unsupportedDriver(string $driver): int
    {
        $this->components->error("The diary backup does not support the [{$driver}] driver.");

        return self::FAILURE;
    }

    /**
     * Resolve and create the backup directory.
     */
    private function backupDirectory(): string
    {
        $directory = (string) config('diary.backup.path');

        File::ensureDirectoryExists($directory);

        return $directory;
    }

    /**
     * Delete the oldest backups, keeping only the most recent ones.
     */
    private function prune(string $directory, string $extension, int $keep): void
    {
        if ($keep < 1) {
            return;
        }

        collect(File::files($directory))
            ->filter(fn (SplFileInfo $file): bool => $file->getExtension() === $extension)
            ->sortByDesc(fn (SplFileInfo $file): int => $file->getMTime())
            ->values()
            ->slice($keep)
            ->each(fn (SplFileInfo $file) => File::delete($file->getPathname()));
    }
}
