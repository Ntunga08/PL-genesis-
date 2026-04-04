<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Tanzania ICD-10 Quick Reference Codes (QRC)
 * Source: CODING SUMMARY OF COMMONLY OCCURRING DISEASES ICD 10 CODES USED IN TANZANIA
 */
class TanzaniaICD10Seeder extends Seeder
{
    public function run(): void
    {
        $codes = [
            // ── QRC Summary List ──────────────────────────────────────────
            ['A01',    'Typhoid and paratyphoid fever'],
            ['A06',    'Amoebiasis'],
            ['A09',    'Other gastroenteritis and colitis of infectious and unspecified origin'],
            ['A41',    'Other Septicaemia'],
            ['B24',    'Unspecified HIV disease resulting in infectious and parasitic diseases'],
            ['B35',    'Dermatophytosis'],
            ['B37',    'Candidiasis'],
            ['B45',    'Cryptococcosis'],
            ['B16',    'Acute Hepatitis B'],
            ['B17',    'Other acute viral hepatitis'],
            ['B18',    'Chronic viral hepatitis'],
            ['B53',    'Other parasitologically confirmed malaria'],
            ['B54',    'Unspecified malaria'],
            ['B76',    'Hookworm diseases'],
            ['B77',    'Ascariasis'],
            ['B82',    'Unspecified intestinal parasitism'],
            ['I10',    'Essential (primary) hypertension'],
            ['I15',    'Secondary hypertension'],
            ['I20',    'Angina pectoris'],
            ['I50',    'Heart failure'],
            ['I60',    'Subarachnoid haemorrhage'],
            ['I64',    'Stroke not specified as haemorrhage or infarction'],
            ['J00',    'Acute nasopharyngitis (common cold)'],
            ['J03',    'Acute tonsillitis'],
            ['J06',    'Acute upper respiratory infections of multiple and unspecified site'],
            ['J18',    'Pneumonia, organism unspecified'],
            ['J20',    'Acute bronchitis'],
            ['J22',    'Unspecified acute lower respiratory infection'],
            ['J41',    'Simple and mucopurulent chronic bronchitis'],
            ['J42',    'Unspecified chronic bronchitis'],
            ['J45',    'Asthma'],
            ['K25',    'Gastric ulcer'],
            ['K26',    'Duodenal ulcer'],
            ['K27',    'Peptic ulcer, site unspecified'],
            ['K29',    'Gastritis and duodenitis'],
            ['K35',    'Acute appendicitis'],
            ['K37',    'Unspecified appendicitis'],
            ['L01',    'Impetigo'],
            ['L03',    'Cellulitis'],
            ['L22',    'Diaper (Napkin) dermatitis'],
            ['L40',    'Psoriasis'],
            ['L50',    'Urticaria'],
            ['P05',    'Slow fetal growth and fetal malnutrition'],
            ['P07',    'Disorders related to short gestation and low birth weight, NEC'],
            ['P08',    'Disorders related to long gestation and high birth weight'],
            ['E10',    'Type 1 diabetes mellitus'],
            ['E11',    'Type 2 diabetes mellitus'],
            ['S00',    'Superficial injury of head'],
            ['S07',    'Crushing injury of head'],
            ['T31',    'Burns classified according to extent of body surface involved'],
            ['T32',    'Corrosions classified according to extent of body surface involved'],
            ['C50',    'Malignant neoplasm of breast'],
            ['C61',    'Malignant neoplasm of prostate'],
            ['O00',    'Ectopic pregnancy'],
            ['O03',    'Spontaneous abortion'],
            ['O70',    'Perineal laceration during delivery'],
            ['O80',    'Single spontaneous delivery'],
            ['O82',    'Single delivery by caesarean section'],
            ['O84',    'Multiple delivery'],
            ['N05',    'Nephrotic syndrome'],
            ['N17',    'Acute renal failure'],
            ['N18',    'Chronic renal failure'],
            ['N30',    'Cystitis'],
            ['N34',    'Urethritis and urethral syndrome'],
            ['N35',    'Urethral stricture'],
            ['N36',    'Other disorders of urethra'],
            ['N39',    'Other disorders of urinary system'],
            ['M47',    'Spondylosis'],
            ['M10',    'Gout'],
            ['H52',    'Disorders of refraction and accommodation'],
            ['G40',    'Epilepsy'],
            ['D50',    'Iron deficiency anaemia'],
            ['D52',    'Folate deficiency anaemia'],
            ['D53',    'Other nutritional anaemia'],
            ['D63',    'Anaemia in chronic diseases classified elsewhere'],
            ['M45',    'Ankylosing spondylitis'],
            ['M86',    'Osteomyelitis'],
            ['Z31',    'Procreative management'],
            ['Z32',    'Pregnancy examination and test'],
            ['Z34',    'Supervision of normal pregnancy'],
            ['Z35',    'Supervision of high-risk pregnancy'],
            ['Z36',    'Antenatal screening'],

            // ── Full Tabular List ─────────────────────────────────────────
            // A00 - Cholera
            ['A00',    'Cholera'],
            ['A00.0',  'Cholera due to Vibrio cholerae 01, biovar cholerae'],
            ['A00.1',  'Cholera due to Vibrio cholerae 01, biovar eltor'],
            ['A00.9',  'Cholera, unspecified'],
            // A01 - Typhoid
            ['A01.0',  'Typhoid fever'],
            ['A01.1',  'Paratyphoid fever A'],
            ['A01.2',  'Paratyphoid fever B'],
            ['A01.3',  'Paratyphoid fever C'],
            ['A01.4',  'Paratyphoid fever, unspecified'],
            // A02 - Salmonella
            ['A02',    'Other salmonella infections'],
            ['A02.0',  'Salmonella enteritis'],
            ['A02.1',  'Salmonella septicaemia'],
            ['A02.2',  'Localized salmonella infections'],
            ['A02.8',  'Other specified salmonella infections'],
            ['A02.9',  'Salmonella infection, unspecified'],
            // A03 - Shigellosis
            ['A03',    'Shigellosis'],
            ['A03.0',  'Shigellosis due to Shigella dysenteriae'],
            ['A03.1',  'Shigellosis due to Shigella flexneri'],
            ['A03.2',  'Shigellosis due to Shigella boydii'],
            ['A03.3',  'Shigellosis due to Shigella sonnei'],
            ['A03.8',  'Other shigellosis'],
            ['A03.9',  'Shigellosis, unspecified'],
            // A04 - Bacterial intestinal
            ['A04',    'Other bacterial intestinal infections'],
            ['A04.0',  'Enteropathogenic Escherichia coli infection'],
            ['A04.1',  'Enterotoxigenic Escherichia coli infection'],
            ['A04.2',  'Enteroinvasive Escherichia coli infection'],
            ['A04.3',  'Enterohaemorrhagic Escherichia coli infection'],
            ['A04.4',  'Other intestinal Escherichia coli infections'],
            ['A04.5',  'Campylobacter enteritis'],
            ['A04.6',  'Enteritis due to Yersinia enterocolitica'],
            ['A04.7',  'Enterocolitis due to Clostridium difficile'],
            ['A04.8',  'Other specified bacterial intestinal infections'],
            ['A04.9',  'Bacterial intestinal infection, unspecified'],
            // A05 - Foodborne
            ['A05',    'Other bacterial foodborne intoxications'],
            ['A05.0',  'Foodborne staphylococcal intoxication'],
            ['A05.1',  'Botulism'],
            ['A05.2',  'Foodborne Clostridium perfringens intoxication'],
            ['A05.3',  'Foodborne Vibrio parahaemolyticus intoxication'],
            ['A05.4',  'Foodborne Bacillus cereus intoxication'],
            ['A05.8',  'Other specified bacterial foodborne intoxications'],
            ['A05.9',  'Bacterial foodborne intoxication, unspecified'],
            // A06 - Amoebiasis
            ['A06.0',  'Acute amoebic dysentery'],
            ['A06.1',  'Chronic intestinal amoebiasis'],
            ['A06.2',  'Amoebic nondysenteric colitis'],
            ['A06.3',  'Amoeboma of intestine'],
            ['A06.4',  'Amoebic liver abscess'],
            ['A06.5',  'Amoebic lung abscess'],
            ['A06.6',  'Amoebic brain abscess'],
            ['A06.7',  'Cutaneous amoebiasis'],
            ['A06.8',  'Amoebic infection of other sites'],
            ['A06.9',  'Amoebiasis, unspecified'],
        ];

        $batch = [];
        foreach ($codes as [$code, $desc]) {
            $batch[] = [
                'code'        => strtoupper(trim($code)),
                'description' => trim($desc),
                'category'    => strtoupper(substr(trim($code), 0, 1)),
            ];
        }

        // Merge with existing — don't truncate so we keep the 94k codes
        DB::table('icd10_codes')->insertOrIgnore($batch);

        $total = DB::table('icd10_codes')->count();
        $this->command->info('✅ Tanzania ICD-10 codes seeded. Total in DB: ' . $total);
    }
}
