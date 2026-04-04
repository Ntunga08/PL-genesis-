<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ICD10Controller extends Controller
{
    /**
     * Common ICD-10 codes used in general hospital settings.
     * Extend this list as needed or replace with a full database table.
     */
    private static array $codes = [
        // Infectious & Parasitic
        ['code' => 'A00.0', 'description' => 'Cholera due to Vibrio cholerae 01, biovar cholerae'],
        ['code' => 'A01.0', 'description' => 'Typhoid fever'],
        ['code' => 'A06.0', 'description' => 'Acute amoebic dysentery'],
        ['code' => 'A09',   'description' => 'Diarrhoea and gastroenteritis of infectious origin'],
        ['code' => 'A15.0', 'description' => 'Tuberculosis of lung'],
        ['code' => 'A36.0', 'description' => 'Pharyngeal diphtheria'],
        ['code' => 'A37.0', 'description' => 'Whooping cough due to Bordetella pertussis'],
        ['code' => 'A50.0', 'description' => 'Early congenital syphilis'],
        ['code' => 'A90',   'description' => 'Dengue fever'],
        ['code' => 'A91',   'description' => 'Dengue haemorrhagic fever'],
        ['code' => 'B00.0', 'description' => 'Eczema herpeticum'],
        ['code' => 'B01.9', 'description' => 'Varicella without complication'],
        ['code' => 'B05.9', 'description' => 'Measles without complication'],
        ['code' => 'B15.9', 'description' => 'Acute hepatitis A without hepatic coma'],
        ['code' => 'B16.9', 'description' => 'Acute hepatitis B without delta-agent and without hepatic coma'],
        ['code' => 'B20',   'description' => 'Human immunodeficiency virus (HIV) disease'],
        ['code' => 'B50.0', 'description' => 'Plasmodium falciparum malaria with cerebral complications'],
        ['code' => 'B54',   'description' => 'Unspecified malaria'],
        ['code' => 'B99',   'description' => 'Other and unspecified infectious diseases'],

        // Neoplasms
        ['code' => 'C00.0', 'description' => 'Malignant neoplasm of external upper lip'],
        ['code' => 'C18.9', 'description' => 'Malignant neoplasm of colon, unspecified'],
        ['code' => 'C34.1', 'description' => 'Malignant neoplasm of upper lobe, bronchus or lung'],
        ['code' => 'C50.9', 'description' => 'Malignant neoplasm of breast, unspecified'],
        ['code' => 'C53.9', 'description' => 'Malignant neoplasm of cervix uteri, unspecified'],
        ['code' => 'C61',   'description' => 'Malignant neoplasm of prostate'],
        ['code' => 'D50.9', 'description' => 'Iron deficiency anaemia, unspecified'],
        ['code' => 'D64.9', 'description' => 'Anaemia, unspecified'],

        // Endocrine & Metabolic
        ['code' => 'E10.9', 'description' => 'Type 1 diabetes mellitus without complications'],
        ['code' => 'E11.9', 'description' => 'Type 2 diabetes mellitus without complications'],
        ['code' => 'E11.0', 'description' => 'Type 2 diabetes mellitus with hyperosmolarity'],
        ['code' => 'E14.9', 'description' => 'Unspecified diabetes mellitus without complications'],
        ['code' => 'E03.9', 'description' => 'Hypothyroidism, unspecified'],
        ['code' => 'E05.9', 'description' => 'Thyrotoxicosis, unspecified'],
        ['code' => 'E66.9', 'description' => 'Obesity, unspecified'],
        ['code' => 'E46',   'description' => 'Unspecified protein-energy malnutrition'],

        // Mental & Behavioural
        ['code' => 'F10.1', 'description' => 'Mental and behavioural disorders due to use of alcohol - harmful use'],
        ['code' => 'F20.9', 'description' => 'Schizophrenia, unspecified'],
        ['code' => 'F32.9', 'description' => 'Depressive episode, unspecified'],
        ['code' => 'F41.1', 'description' => 'Generalised anxiety disorder'],

        // Nervous System
        ['code' => 'G40.9', 'description' => 'Epilepsy, unspecified'],
        ['code' => 'G43.9', 'description' => 'Migraine, unspecified'],
        ['code' => 'G45.9', 'description' => 'Transient cerebral ischaemic attack, unspecified'],

        // Eye
        ['code' => 'H10.9', 'description' => 'Conjunctivitis, unspecified'],
        ['code' => 'H26.9', 'description' => 'Cataract, unspecified'],
        ['code' => 'H35.0', 'description' => 'Background retinopathy and retinal vascular changes'],

        // Ear
        ['code' => 'H65.9', 'description' => 'Nonsuppurative otitis media, unspecified'],
        ['code' => 'H66.9', 'description' => 'Otitis media, unspecified'],

        // Circulatory
        ['code' => 'I10',   'description' => 'Essential (primary) hypertension'],
        ['code' => 'I11.9', 'description' => 'Hypertensive heart disease without heart failure'],
        ['code' => 'I20.9', 'description' => 'Angina pectoris, unspecified'],
        ['code' => 'I21.9', 'description' => 'Acute myocardial infarction, unspecified'],
        ['code' => 'I25.1', 'description' => 'Atherosclerotic heart disease of native coronary artery'],
        ['code' => 'I48.9', 'description' => 'Atrial fibrillation and flutter, unspecified'],
        ['code' => 'I50.9', 'description' => 'Heart failure, unspecified'],
        ['code' => 'I63.9', 'description' => 'Cerebral infarction, unspecified'],
        ['code' => 'I64',   'description' => 'Stroke, not specified as haemorrhage or infarction'],

        // Respiratory
        ['code' => 'J00',   'description' => 'Acute nasopharyngitis (common cold)'],
        ['code' => 'J02.9', 'description' => 'Acute pharyngitis, unspecified'],
        ['code' => 'J03.9', 'description' => 'Acute tonsillitis, unspecified'],
        ['code' => 'J06.9', 'description' => 'Acute upper respiratory infection, unspecified'],
        ['code' => 'J18.9', 'description' => 'Pneumonia, unspecified organism'],
        ['code' => 'J20.9', 'description' => 'Acute bronchitis, unspecified'],
        ['code' => 'J44.1', 'description' => 'Chronic obstructive pulmonary disease with acute exacerbation'],
        ['code' => 'J45.9', 'description' => 'Asthma, unspecified'],

        // Digestive
        ['code' => 'K21.0', 'description' => 'Gastro-oesophageal reflux disease with oesophagitis'],
        ['code' => 'K25.9', 'description' => 'Gastric ulcer, unspecified'],
        ['code' => 'K29.7', 'description' => 'Gastritis, unspecified'],
        ['code' => 'K35.8', 'description' => 'Acute appendicitis with other complications'],
        ['code' => 'K37',   'description' => 'Unspecified appendicitis'],
        ['code' => 'K40.9', 'description' => 'Unilateral inguinal hernia, without obstruction or gangrene'],
        ['code' => 'K57.3', 'description' => 'Diverticular disease of large intestine without perforation or abscess'],
        ['code' => 'K70.3', 'description' => 'Alcoholic cirrhosis of liver'],
        ['code' => 'K74.6', 'description' => 'Other and unspecified cirrhosis of liver'],
        ['code' => 'K80.2', 'description' => 'Calculus of gallbladder without cholecystitis'],

        // Skin
        ['code' => 'L01.0', 'description' => 'Impetigo due to Staphylococcus aureus'],
        ['code' => 'L20.9', 'description' => 'Atopic dermatitis, unspecified'],
        ['code' => 'L30.9', 'description' => 'Dermatitis, unspecified'],
        ['code' => 'L50.9', 'description' => 'Urticaria, unspecified'],

        // Musculoskeletal
        ['code' => 'M05.9', 'description' => 'Rheumatoid arthritis with rheumatoid factor, unspecified'],
        ['code' => 'M10.9', 'description' => 'Gout, unspecified'],
        ['code' => 'M54.5', 'description' => 'Low back pain'],
        ['code' => 'M79.3', 'description' => 'Panniculitis'],

        // Genitourinary
        ['code' => 'N18.9', 'description' => 'Chronic kidney disease, unspecified'],
        ['code' => 'N20.0', 'description' => 'Calculus of kidney'],
        ['code' => 'N30.0', 'description' => 'Acute cystitis'],
        ['code' => 'N39.0', 'description' => 'Urinary tract infection, site not specified'],
        ['code' => 'N40',   'description' => 'Benign prostatic hyperplasia'],

        // Pregnancy & Childbirth
        ['code' => 'O10.0', 'description' => 'Pre-existing essential hypertension complicating pregnancy'],
        ['code' => 'O14.1', 'description' => 'Severe pre-eclampsia'],
        ['code' => 'O20.0', 'description' => 'Threatened abortion'],
        ['code' => 'O80',   'description' => 'Encounter for full-term uncomplicated delivery'],

        // Perinatal
        ['code' => 'P07.3', 'description' => 'Other preterm newborn'],
        ['code' => 'P22.0', 'description' => 'Respiratory distress syndrome of newborn'],

        // Congenital
        ['code' => 'Q21.1', 'description' => 'Atrial septal defect'],
        ['code' => 'Q90.9', 'description' => 'Down syndrome, unspecified'],

        // Symptoms & Signs
        ['code' => 'R00.0', 'description' => 'Tachycardia, unspecified'],
        ['code' => 'R05',   'description' => 'Cough'],
        ['code' => 'R06.0', 'description' => 'Dyspnoea'],
        ['code' => 'R07.4', 'description' => 'Chest pain, unspecified'],
        ['code' => 'R10.4', 'description' => 'Other and unspecified abdominal pain'],
        ['code' => 'R11',   'description' => 'Nausea and vomiting'],
        ['code' => 'R50.9', 'description' => 'Fever, unspecified'],
        ['code' => 'R51',   'description' => 'Headache'],
        ['code' => 'R55',   'description' => 'Syncope and collapse'],
        ['code' => 'R73.0', 'description' => 'Abnormal glucose'],

        // Injury & Poisoning
        ['code' => 'S00.0', 'description' => 'Superficial injury of scalp'],
        ['code' => 'S06.0', 'description' => 'Concussion'],
        ['code' => 'S52.5', 'description' => 'Fracture of lower end of radius'],
        ['code' => 'T14.0', 'description' => 'Superficial injury of unspecified body region'],
        ['code' => 'T14.1', 'description' => 'Open wound of unspecified body region'],

        // External causes
        ['code' => 'Z00.0', 'description' => 'Encounter for general adult medical examination'],
        ['code' => 'Z23',   'description' => 'Encounter for immunization'],
        ['code' => 'Z30.0', 'description' => 'Encounter for general counselling and advice on contraception'],
        ['code' => 'Z34.0', 'description' => 'Encounter for supervision of normal first pregnancy'],
    ];

    public function search(Request $request)
    {
        $query = strtolower(trim($request->get('q', '')));

        if (strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        // Use database table if it has been populated (full 70k+ codes)
        if (\Illuminate\Support\Facades\Schema::hasTable('icd10_codes') &&
            \Illuminate\Support\Facades\DB::table('icd10_codes')->count() > 200) {

            try {
                $results = \Illuminate\Support\Facades\DB::table('icd10_codes')
                    ->where('code', 'like', "%{$query}%")
                    ->orWhere('description', 'like', "%{$query}%")
                    ->orderByRaw("CASE WHEN LOWER(code) = ? THEN 0
                                       WHEN LOWER(code) LIKE ? THEN 1
                                       ELSE 2 END", [$query, $query . '%'])
                    ->limit(20)
                    ->get(['code', 'description'])
                    ->toArray();

                return response()->json(['results' => $results, 'source' => 'database']);
            } catch (\Throwable $e) {
                // fall through to built-in
            }
        }

        // Fallback to built-in array (120 common codes)
        $results = array_values(array_filter(self::$codes, function ($item) use ($query) {
            return str_contains(strtolower($item['code']), $query)
                || str_contains(strtolower($item['description']), $query);
        }));

        return response()->json(['results' => array_slice($results, 0, 20), 'source' => 'builtin']);
    }

    /** Return stats about the current ICD-10 dataset */
    public function stats()
    {
        try {
            $count = \Illuminate\Support\Facades\DB::table('icd10_codes')->count();
            return response()->json([
                'total'  => $count,
                'source' => $count > 200 ? 'database' : 'builtin',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['total' => 0, 'source' => 'builtin']);
        }
    }

    /** Debug endpoint — returns raw extracted text from a PDF (admin only) */
    public function debugPdf(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:pdf|max:20480']);

        $path = $request->file('file')->getPathname();
        $text = '';
        $method = '';

        try {
            $config = new \Smalot\PdfParser\Config();
            $config->setRetainImageContent(false);
            $parser = new \Smalot\PdfParser\Parser([], $config);
            $pdf    = $parser->parseFile($path);
            $text   = $pdf->getText();
            $method = 'smalot';
        } catch (\Throwable $e) {
            $text   = $this->extractRawPdfText($path);
            $method = 'raw_fallback';
        }

        // Fix encoding — convert to UTF-8 safely
        $text = $this->toUtf8($text);

        $lines = array_values(array_filter(
            array_map('trim', preg_split('/\r\n|\r|\n/', $text)),
            fn($l) => strlen($l) > 0
        ));

        return response()->json([
            'method'        => $method,
            'total_chars'   => strlen($text),
            'total_lines'   => count($lines),
            'parsed_rows'   => count($this->parseTextToRows($text)),
            'sample_lines'  => array_slice($lines, 0, 40),
            'raw_preview'   => substr($text, 0, 2000),
        ], 200, [], JSON_INVALID_UTF8_SUBSTITUTE);
    }

    /** Upload and import a CSV, Excel, or PDF file of ICD-10 codes */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls,pdf|max:20480',
        ]);

        $file      = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $rows      = [];

        if (in_array($extension, ['xlsx', 'xls'])) {
            if (!class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Excel support requires phpoffice/phpspreadsheet. Upload a CSV or PDF instead, or run: composer require phpoffice/phpspreadsheet',
                ], 422);
            }
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $rows        = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        } elseif ($extension === 'pdf') {
            if (!class_exists('\Smalot\PdfParser\Parser')) {
                return response()->json([
                    'success' => false,
                    'message' => 'PDF support requires smalot/pdfparser. Run: composer require smalot/pdfparser',
                ], 422);
            }
            $rows = $this->parsePdf($file->getPathname());

        } else {
            // CSV / TXT
            $handle = fopen($file->getPathname(), 'r');
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return response()->json([
                'success' => false,
                'message' => $extension === 'pdf'
                    ? 'No ICD-10 codes could be extracted from this PDF. The file may be encrypted, password-protected, or a scanned image with no text layer. Please use a CSV file instead.'
                    : 'No data found in file.',
            ], 422);
        }

        // Auto-detect header row
        $firstRow  = array_map('strtolower', array_map('trim', $rows[0]));
        $hasHeader = in_array('code', $firstRow) || str_contains($firstRow[0] ?? '', 'icd');
        $startIndex = $hasHeader ? 1 : 0;

        // Detect column positions
        $codeCol = 0;
        $descCol = 1;
        if ($hasHeader) {
            foreach ($firstRow as $i => $col) {
                if (in_array($col, ['code', 'icd_code', 'icd10', 'icd-10', 'codewithseparator'])) $codeCol = $i;
                if (in_array($col, ['description', 'desc', 'longdescription', 'shortdescription', 'name'])) $descCol = $i;
            }
        }

        $batch     = [];
        $imported  = 0;
        $skipped   = 0;
        $batchSize = 500;

        \Illuminate\Support\Facades\DB::table('icd10_codes')->truncate();

        for ($i = $startIndex; $i < count($rows); $i++) {
            $row  = $rows[$i];
            $code = strtoupper(trim($row[$codeCol] ?? ''));
            $desc = trim($row[$descCol] ?? '');

            if (!$code || !$desc || strlen($code) > 10) { $skipped++; continue; }

            $batch[] = [
                'code'        => $code,
                'description' => $desc,
                'category'    => strtoupper(substr($code, 0, 1)),
            ];
            $imported++;

            if (count($batch) >= $batchSize) {
                \Illuminate\Support\Facades\DB::table('icd10_codes')->insertOrIgnore($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            \Illuminate\Support\Facades\DB::table('icd10_codes')->insertOrIgnore($batch);
        }

        return response()->json([
            'success'  => true,
            'imported' => $imported,
            'skipped'  => $skipped,
            'message'  => "Successfully imported {$imported} ICD-10 codes.",
        ]);
    }

    /**
     * Parse a PDF file and extract ICD-10 code rows.
     * Tries smalot/pdfparser first, falls back to raw text extraction.
     */
    private function parsePdf(string $path): array
    {
        $text = '';

        // Try smalot parser with ignoreEncryption flag
        try {
            $config = new \Smalot\PdfParser\Config();
            $config->setRetainImageContent(false);
            $config->setIgnoreEncryption(true);
            $parser = new \Smalot\PdfParser\Parser([], $config);
            $pdf    = $parser->parseFile($path);
            $text   = $pdf->getText();
        } catch (\Throwable $e) {
            // Fallback: extract raw text directly from PDF binary
            $text = $this->extractRawPdfText($path);
        }

        // Fix encoding — convert to UTF-8 safely
        $text = $this->toUtf8($text);

        if (empty(trim($text))) {
            return [];
        }

        return $this->parseTextToRows($text);
    }

    /**
     * Raw text extraction from PDF binary.
     * Decompresses FlateDecode (zlib) streams first, then extracts text.
     * This handles modern compressed PDFs that smalot can't parse.
     */
    private function extractRawPdfText(string $path): string
    {
        $content = file_get_contents($path);
        $text    = '';

        // Step 1: Decompress all FlateDecode (zlib) streams
        // Modern PDFs compress content streams with zlib/deflate
        preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $content, $streams);
        $decompressed = '';
        foreach ($streams[1] as $stream) {
            // Try zlib decompression
            $inflated = @gzuncompress($stream);
            if ($inflated !== false) {
                $decompressed .= $inflated . "\n";
            } else {
                // Try raw deflate (no zlib header)
                $inflated = @gzinflate($stream);
                if ($inflated !== false) {
                    $decompressed .= $inflated . "\n";
                }
            }
        }

        // Use decompressed content if we got something, otherwise use raw
        $source = strlen($decompressed) > 100 ? $decompressed : $content;

        // Step 2: Extract text from BT...ET blocks
        preg_match_all('/BT\s*(.*?)\s*ET/s', $source, $blocks);
        foreach ($blocks[1] as $block) {
            preg_match_all('/\(([^)]*)\)\s*(?:Tj|\'|")/', $block, $strings);
            foreach ($strings[1] as $s) {
                $text .= $this->decodePdfString($s) . ' ';
            }
            preg_match_all('/\[([^\]]*)\]\s*TJ/', $block, $tjArrays);
            foreach ($tjArrays[1] as $arr) {
                preg_match_all('/\(([^)]*)\)/', $arr, $parts);
                foreach ($parts[1] as $p) {
                    $text .= $this->decodePdfString($p);
                }
                $text .= ' ';
            }
        }

        // Step 3: If still nothing, extract all readable ASCII from decompressed content
        if (strlen(trim($text)) < 100 && strlen($decompressed) > 100) {
            preg_match_all('/[\x20-\x7E]{4,}/', $decompressed, $readable);
            $text = implode("\n", $readable[0]);
        }

        // Step 4: Last resort — readable ASCII from raw binary
        if (strlen(trim($text)) < 100) {
            preg_match_all('/[\x20-\x7E]{4,}/', $content, $readable);
            $text = implode("\n", $readable[0]);
        }

        return $this->toUtf8($text);
    }

    private function decodePdfString(string $s): string
    {
        // Decode common PDF escape sequences
        return str_replace(
            ['\\n', '\\r', '\\t', '\\(', '\\)', '\\\\'],
            ["\n",  "\r",  "\t",  '(',   ')',   '\\'],
            $s
        );
    }

    /**
     * Convert any encoding to clean UTF-8.
     * Tries mb_detect_encoding first, falls back to Windows-1252/Latin-1.
     */
    private function toUtf8(string $text): string
    {
        if (mb_check_encoding($text, 'UTF-8')) {
            return $text;
        }
        $detected = mb_detect_encoding($text, ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ISO-8859-15', 'ASCII'], true);
        if ($detected && $detected !== 'UTF-8') {
            $converted = mb_convert_encoding($text, 'UTF-8', $detected);
            if ($converted !== false) return $converted;
        }
        // Last resort — force convert from Windows-1252
        return mb_convert_encoding($text, 'UTF-8', 'Windows-1252');
    }

    /**
     * Parse extracted text into [code, description] rows.
     * Handles two Tanzania ICD-10 PDF formats:
     *   Format A (QRC list): "1. Typhoid and paratyphoid fever A01"
     *   Format B (full list): "A00.0 Cholera due to Vibrio cholerae 01, biovar cholerae"
     */
    private function parseTextToRows(string $text): array
    {
        $rows  = [];
        $lines = preg_split('/\r\n|\r|\n/', $text);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strlen($line) < 4) continue;

            // Skip header/section lines
            if (preg_match('/^(S\/N|DISEASE|ICD|CODE|NB:|I\.|II\.|III\.|IV\.|V\.|CERTAIN|CHAPTER)/i', $line)) continue;

            // ── Format A: numbered list — "1. Disease name CODE" or "1. Disease name  CODE"
            // e.g. "1. Typhoid and paratyphoid fever A01"
            // e.g. "39. Cellulitis L03 3" (page number at end)
            if (preg_match('/^\d+\.\s+(.+?)\s+([A-Z]\d{2}(?:\.\d{1,4})?)\s*\d*$/', $line, $m)) {
                $rows[] = [trim($m[2]), trim($m[1])];
                continue;
            }

            // ── Format B: code first — "A00.0 Description"
            // e.g. "A00.0 Cholera due to Vibrio cholerae 01, biovar cholerae"
            if (preg_match('/^([A-Z]\d{2}(?:\.\d{1,4})?)\s+(.+)$/', $line, $m)) {
                $code = strtoupper(trim($m[1]));
                $desc = trim($m[2]);
                // Skip if description looks like a page number or section header
                if (strlen($desc) < 3 || is_numeric($desc)) continue;
                $rows[] = [$code, $desc];
                continue;
            }

            // ── Format C: comma/tab separated
            if (str_contains($line, "\t")) {
                $parts = explode("\t", $line, 2);
                if (count($parts) === 2 && preg_match('/^[A-Z]\d{2}/', strtoupper(trim($parts[0])))) {
                    $rows[] = [strtoupper(trim($parts[0])), trim($parts[1])];
                    continue;
                }
            }
        }

        return $rows;
    }
}
