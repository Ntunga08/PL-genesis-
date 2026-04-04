<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ICD10CodesSeeder extends Seeder
{
    /**
     * Import ICD-10 codes from a CSV file.
     *
     * Expected CSV format (no header row):
     *   code,description
     *   A00.0,"Cholera due to Vibrio cholerae 01, biovar cholerae"
     *
     * Place the file at: database/data/icd10_codes.csv
     *
     * Free source: https://www.cms.gov/medicare/coding-billing/icd-10-codes
     * or: https://github.com/kamilkisiela/icd10-cm (JSON format also supported below)
     */
    public function run(): void
    {
        $csvPath  = database_path('data/icd10_codes.csv');
        $jsonPath = database_path('data/icd10_codes.json');

        if (file_exists($csvPath)) {
            $this->importFromCsv($csvPath);
        } elseif (file_exists($jsonPath)) {
            $this->importFromJson($jsonPath);
        } else {
            $this->command->warn('No ICD-10 data file found.');
            $this->command->info('Place one of these files:');
            $this->command->info('  CSV: database/data/icd10_codes.csv');
            $this->command->info('  JSON: database/data/icd10_codes.json');
            $this->command->info('');
            $this->command->info('Download from:');
            $this->command->info('  https://www.cms.gov/medicare/coding-billing/icd-10-codes');
            $this->command->info('  or run: php artisan icd10:download');
            return;
        }
    }

    private function importFromCsv(string $path): void
    {
        $this->command->info("Importing ICD-10 codes from CSV...");

        $handle = fopen($path, 'r');
        $batch  = [];
        $count  = 0;
        $batchSize = 500;

        // Skip header if present
        $firstLine = fgetcsv($handle);
        if (strtolower($firstLine[0] ?? '') !== 'code') {
            // Not a header — process it as data
            $this->addToBatch($batch, $firstLine);
        }

        while (($row = fgetcsv($handle)) !== false) {
            if (empty($row[0])) continue;
            $this->addToBatch($batch, $row);
            $count++;

            if (count($batch) >= $batchSize) {
                DB::table('icd10_codes')->insertOrIgnore($batch);
                $batch = [];
                $this->command->info("  Imported $count codes...");
            }
        }

        if (!empty($batch)) {
            DB::table('icd10_codes')->insertOrIgnore($batch);
        }

        fclose($handle);
        $this->command->info("Done. Total: $count ICD-10 codes imported.");
    }

    private function importFromJson(string $path): void
    {
        $this->command->info("Importing ICD-10 codes from JSON...");

        $data  = json_decode(file_get_contents($path), true);
        $batch = [];
        $count = 0;
        $batchSize = 500;

        foreach ($data as $item) {
            // Support both flat array and nested formats
            $code = $item['code'] ?? $item[0] ?? null;
            $desc = $item['description'] ?? $item['desc'] ?? $item[1] ?? null;

            if (!$code || !$desc) continue;

            $batch[] = [
                'code'        => strtoupper(trim($code)),
                'description' => trim($desc),
                'category'    => strtoupper(substr(trim($code), 0, 1)),
            ];
            $count++;

            if (count($batch) >= $batchSize) {
                DB::table('icd10_codes')->insertOrIgnore($batch);
                $batch = [];
                $this->command->info("  Imported $count codes...");
            }
        }

        if (!empty($batch)) {
            DB::table('icd10_codes')->insertOrIgnore($batch);
        }

        $this->command->info("Done. Total: $count ICD-10 codes imported.");
    }

    private function addToBatch(array &$batch, array $row): void
    {
        $code = strtoupper(trim($row[0] ?? ''));
        $desc = trim($row[1] ?? '');
        if (!$code || !$desc) return;

        $batch[] = [
            'code'        => $code,
            'description' => $desc,
            'category'    => strtoupper(substr($code, 0, 1)),
        ];
    }
}
