<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--path= : Custom output path}';
    protected $description = 'Export the database to a SQL dump file';

    public function handle(): int
    {
        $driver = config('database.default');
        $timestamp = now()->format('Y-m-d_H-i-s');
        $defaultPath = storage_path("app/backups/backup_{$timestamp}.sql");
        $outputPath = $this->option('path') ?? $defaultPath;

        // Ensure backup directory exists
        $dir = dirname($outputPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if ($driver === 'sqlite') {
            $this->backupSqlite($outputPath);
        } elseif ($driver === 'mysql') {
            $this->backupMysql($outputPath);
        } else {
            $this->error("Unsupported driver: {$driver}");
            return self::FAILURE;
        }

        $size = round(filesize($outputPath) / 1024, 2);
        $this->info("✅ Backup saved to: {$outputPath} ({$size} KB)");
        return self::SUCCESS;
    }

    private function backupSqlite(string $outputPath): void
    {
        $dbPath = config('database.connections.sqlite.database');
        copy($dbPath, str_replace('.sql', '.sqlite', $outputPath));
        $this->info("SQLite database copied.");
    }

    private function backupMysql(string $outputPath): void
    {
        $config = config('database.connections.mysql');
        $host     = $config['host'];
        $port     = $config['port'] ?? 3306;
        $database = $config['database'];
        $username = $config['username'];
        $password = $config['password'];

        $passwordFlag = $password ? "-p" . escapeshellarg($password) : '';
        $cmd = "mysqldump -h {$host} -P {$port} -u " . escapeshellarg($username) . " {$passwordFlag} " . escapeshellarg($database) . " > " . escapeshellarg($outputPath);

        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0) {
            $this->error("mysqldump failed. Make sure mysqldump is installed and credentials are correct.");
            throw new \RuntimeException("mysqldump exited with code {$exitCode}");
        }
    }
}
