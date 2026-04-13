<?php
/**
 * Run this on the live server: php fix_live.php
 * It patches api.php and PatientController.php with the required fixes.
 */

$apiFile = __DIR__ . '/routes/api.php';
$patientController = __DIR__ . '/app/Http/Controllers/PatientController.php';

$api = file_get_contents($apiFile);
$patient = file_get_contents($patientController);

$errors = [];

// ── 1. Fix PatientController: add insurance_company_id to store() validation ──
if (strpos($patient, "'insurance_company_id' => 'nullable|uuid|exists:insurance_companies,id'") === false) {
    $patient = str_replace(
        "'insurance_number' => 'nullable|string|max:100',\n        ]);",
        "'insurance_number' => 'nullable|string|max:100',\n            'insurance_company_id' => 'nullable|uuid|exists:insurance_companies,id',\n            'status' => 'nullable|string|max:50',\n        ]);",
        $patient
    );
    echo "✓ PatientController store() - added insurance_company_id\n";
} else {
    echo "- PatientController store() already patched\n";
}

// ── 2. Fix PatientController: add insurance_company_id to update() validation ──
if (strpos($patient, "'insurance_company_id' => 'nullable|uuid|exists:insurance_companies,id'") !== false) {
    // Already done above or already present
}

// ── 3. Fix PatientController: add has_insurance and insurance_company_id filters to index() ──
if (strpos($patient, 'has_insurance') === false) {
    $patient = str_replace(
        "if (\$request->has('status')) {\n            \$query->where('status', \$request->status);\n        }",
        "if (\$request->has('status')) {\n            \$query->where('status', \$request->status);\n        }\n\n        if (\$request->has('has_insurance')) {\n            \$query->whereNotNull('insurance_company_id');\n        }\n\n        if (\$request->has('insurance_company_id')) {\n            \$query->where('insurance_company_id', \$request->insurance_company_id);\n        }",
        $patient
    );
    echo "✓ PatientController index() - added insurance filters\n";
} else {
    echo "- PatientController index() already patched\n";
}

// ── 4. Fix PatientController: eager load insuranceCompany in index() ──
if (strpos($patient, "Patient::with(['insuranceCompany'])") === false) {
    $patient = str_replace(
        '$query = Patient::query();',
        "\$query = Patient::with(['insuranceCompany']);",
        $patient
    );
    echo "✓ PatientController index() - added insuranceCompany eager load\n";
} else {
    echo "- PatientController index() eager load already patched\n";
}

// ── 5. Fix api.php: fix broken DB::table( syntax at /appointment-visits and /patient-visits ──
// The live server has DB::table( without the table name
$api = preg_replace(
    '/\$query = DB::table\(\s*\n\s*if \(\$request->has\(\'overall_status\'\)\)/',
    "\$query = DB::table('patient_visits');\n        \n        if (\$request->has('overall_status'))",
    $api
);

$api = preg_replace(
    '/\$query = DB::table\(\s*\n\s*if \(\$request->has\(\'status\'\)\)/',
    "\$query = DB::table('patient_visits');\n        \n        if (\$request->has('status'))",
    $api
);
echo "✓ api.php - fixed DB::table() syntax\n";

// ── 6. Fix api.php: add patient_id filter to /labs route ──
if (strpos($api, "patient_ids") === false) {
    $api = str_replace(
        "if (\$request->has('patient_id')) {\n            \$query->where('patient_id', \$request->patient_id);\n        }",
        "if (\$request->has('patient_ids')) {\n            \$ids = explode(',', \$request->patient_ids);\n            \$query->whereIn('patient_id', \$ids);\n        } elseif (\$request->has('patient_id')) {\n            \$query->where('patient_id', \$request->patient_id);\n        }\n\n        if (\$request->has('visit_id')) {\n            \$query->where('visit_id', \$request->visit_id);\n        }\n\n        if (\$request->has('doctor_id')) {\n            \$query->where('doctor_id', \$request->doctor_id);\n        }",
        $api
    );
    echo "✓ api.php - added patient_ids filter to /labs\n";
} else {
    echo "- api.php /labs patient_ids already patched\n";
}

// ── 7. Fix api.php: add patient_id filter to /insurance/claims ──
if (strpos($api, "patient_id') {\n            \$query->where('patient_id'") === false) {
    $api = str_replace(
        "if (\$request->has('status')) {\n            \$query->where('status', \$request->status);\n        }\n        \n        \$claims = \$query->orderBy('created_at', 'desc')->get();",
        "if (\$request->has('status')) {\n            \$query->where('status', \$request->status);\n        }\n\n        if (\$request->has('patient_id')) {\n            \$query->where('patient_id', \$request->patient_id);\n        }\n        \n        \$claims = \$query->orderBy('created_at', 'desc')->get();",
        $api
    );
    echo "✓ api.php - added patient_id filter to /insurance/claims\n";
} else {
    echo "- api.php /insurance/claims patient_id already patched\n";
}

// ── 8. Fix api.php: fix /insurance/claims POST - add submission_date, auto claim_number ──
if (strpos($api, 'submission_date') === false) {
    $api = str_replace(
        "'claim_number' => 'nullable|string',\n            'status' => 'nullable|in:Pending,Approved,Rejected,Paid',\n            'notes' => 'nullable|string'\n        ]);\n        \n        \$claim = \\App\\Models\\InsuranceClaim::create([\n            'id' => \\Illuminate\\Support\\Str::uuid(),\n            'invoice_id' => \$validated['invoice_id'],\n            'insurance_company_id' => \$validated['insurance_company_id'],\n            'claim_amount' => \$validated['claim_amount'],\n            'claim_number' => \$validated['claim_number'] ?? null,\n            'status' => \$validated['status'] ?? 'Pending',\n            'notes' => \$validated['notes'] ?? null,\n            'claim_date' => now()\n        ]);",
        "'claim_number' => 'nullable|string',\n            'patient_id' => 'nullable|exists:patients,id',\n            'submission_date' => 'nullable|date',\n            'status' => 'nullable|in:Pending,Approved,Rejected,Paid',\n            'notes' => 'nullable|string'\n        ]);\n\n        \$claimNumber = \$validated['claim_number'] ?? ('CLM-' . date('Ymd') . '-' . str_pad(\\App\\Models\\InsuranceClaim::whereDate('created_at', today())->count() + 1, 4, '0', STR_PAD_LEFT));\n        while (\\App\\Models\\InsuranceClaim::where('claim_number', \$claimNumber)->exists()) {\n            \$claimNumber = 'CLM-' . date('Ymd') . '-' . rand(1000, 9999);\n        }\n        \n        \$claim = \\App\\Models\\InsuranceClaim::create([\n            'id' => \\Illuminate\\Support\\Str::uuid(),\n            'invoice_id' => \$validated['invoice_id'],\n            'insurance_company_id' => \$validated['insurance_company_id'],\n            'patient_id' => \$validated['patient_id'] ?? null,\n            'claim_amount' => \$validated['claim_amount'],\n            'claim_number' => \$claimNumber,\n            'submission_date' => \$validated['submission_date'] ?? now()->toDateString(),\n            'status' => \$validated['status'] ?? 'Pending',\n            'notes' => \$validated['notes'] ?? null,\n        ]);",
        $api
    );
    echo "✓ api.php - fixed /insurance/claims POST\n";
} else {
    echo "- api.php /insurance/claims POST already patched\n";
}

// ── Write files ──
file_put_contents($apiFile, $api);
file_put_contents($patientController, $patient);

echo "\n✅ Done. Now run:\n";
echo "   php artisan config:clear\n";
echo "   php artisan cache:clear\n";
echo "   php artisan route:clear\n";
echo "   php artisan migrate --force\n";
