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

        $results = array_values(array_filter(self::$codes, function ($item) use ($query) {
            return str_contains(strtolower($item['code']), $query)
                || str_contains(strtolower($item['description']), $query);
        }));

        // Limit to 20 results
        return response()->json(['results' => array_slice($results, 0, 20)]);
    }
}
