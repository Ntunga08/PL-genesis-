<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DownloadICD10Codes extends Command
{
    protected $signature   = 'icd10:download';
    protected $description = 'Download and import all ICD-10-CM codes from CMS.gov';

    // Official ICD-10-CM CSV from CMS via Bobrovskiy mirror
    // Schema: Id,Code,CodeWithSeparator,ShortDescription,LongDescription,HippaCovered,Deleted
    const SOURCE_URL = 'https://raw.githubusercontent.com/Bobrovskiy/ICD-10-CSV/master/2020/diagnosis.csv';

    public function handle(): int
    {
        $this->info('Downloading ICD-10-CM codes (~70,000 codes)...');
        $this->info('Source: ' . self::SOURCE_URL);

        $context = stream_context_create([
            'http' => [
                'timeout'    => 120,
                'user_agent' => 'HasetHospitalHMS/1.0',
            ]
        ]);

        $raw = @file_get_contents(self::SOURCE_URL, false, $context);

        if (!$raw) {
            $this->error('Download failed. Check your internet connection.');
            $this->info('');
            $this->info('Manual option:');
            $this->info('1. Download: https://raw.githubusercontent.com/Bobrovskiy/ICD-10-CSV/master/2020/diagnosis.csv');
            $this->info('2. Save as:  backend/database/data/icd10_codes.csv');
            $this->info('3. Run:      php artisan db:seed --class=ICD10CodesSeeder');
            return self::FAILURE;
        }

        // Save locally for future use
        $dataDir = database_path('data');
        if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
        file_put_contents($dataDir . '/icd10_codes.csv', $raw);
        $this->info('Saved to database/data/icd10_codes.csv');

        // Parse and import
        DB::table('icd10_codes')->truncate();

        $lines     = explode("\n", $raw);
        $batch     = [];
        $count     = 0;
        $batchSize = 500;
        $skipped   = 0;

        foreach ($lines as $i => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Skip header row
            if ($i === 0 && str_starts_with(strtolower($line), 'id,')) continue;

            $row = str_getcsv($line);
            // Schema: Id, Code, CodeWithSeparator, ShortDescription, LongDescription, HippaCovered, Deleted
            if (count($row) < 4) continue;

            $deleted = trim($row[6] ?? '0');
            if ($deleted === '1') { $skipped++; continue; }

            $code = strtoupper(trim($row[2] ?? $row[1] ?? '')); // prefer CodeWithSeparator (has dots)
            $desc = trim($row[4] ?? $row[3] ?? '');             // prefer LongDescription

            if (!$code || !$desc) continue;

            $batch[] = [
                'code'        => $code,
                'description' => $desc,
                'category'    => strtoupper(substr($code, 0, 1)),
            ];
            $count++;

            if (count($batch) >= $batchSize) {
                DB::table('icd10_codes')->insertOrIgnore($batch);
                $batch = [];
                $this->line("  Imported {$count} codes...");
            }
        }

        if (!empty($batch)) {
            DB::table('icd10_codes')->insertOrIgnore($batch);
        }

        $this->info('');
        $this->info("✅ Done! {$count} ICD-10 codes imported. ({$skipped} deleted/inactive skipped)");
        $this->info('The search endpoint now uses the full dataset automatically.');

        return self::SUCCESS;
    }
}
