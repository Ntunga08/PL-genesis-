<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ClearLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logs:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all log files';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $logPath = storage_path('logs');
        
        if (!File::exists($logPath)) {
            $this->error('Log directory does not exist!');
            return 1;
        }

        $files = File::files($logPath);
        
        if (empty($files)) {
            $this->info('No log files to clear.');
            return 0;
        }

        $this->info('Clearing log files...');
        
        foreach ($files as $file) {
            if ($file->getExtension() === 'log') {
                File::delete($file->getPathname());
                $this->line('Deleted: ' . $file->getFilename());
            }
        }

        $this->info('All log files cleared successfully!');
        return 0;
    }
}
