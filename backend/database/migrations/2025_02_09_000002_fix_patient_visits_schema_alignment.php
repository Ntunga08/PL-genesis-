<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration ensures the patient_visits table matches production schema
     * Production has: provisional_diagnosis (not diagnosis)
     * Also adds missing fields from production
     */
    public function up(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            // Check if we need to rename diagnosis to provisional_diagnosis
            if (Schema::hasColumn('patient_visits', 'diagnosis') && 
                !Schema::hasColumn('patient_visits', 'provisional_diagnosis')) {
                $table->renameColumn('diagnosis', 'provisional_diagnosis');
            }
            
            // Add missing fields that exist in production but not in migrations
            if (!Schema::hasColumn('patient_visits', 'chief_complaint_detailed')) {
                $table->text('chief_complaint_detailed')->nullable()->after('chief_complaint');
            }
            
            if (!Schema::hasColumn('patient_visits', 'history_present_illness')) {
                $table->text('history_present_illness')->nullable()->after('chief_complaint_detailed');
            }
            
            if (!Schema::hasColumn('patient_visits', 'review_of_systems')) {
                $table->text('review_of_systems')->nullable()->after('history_present_illness');
            }
            
            if (!Schema::hasColumn('patient_visits', 'past_medical_history')) {
                $table->text('past_medical_history')->nullable()->after('review_of_systems');
            }
            
            if (!Schema::hasColumn('patient_visits', 'family_social_history')) {
                $table->text('family_social_history')->nullable()->after('past_medical_history');
            }
            
            if (!Schema::hasColumn('patient_visits', 'obstetric_history')) {
                $table->text('obstetric_history')->nullable()->after('family_social_history');
            }
            
            if (!Schema::hasColumn('patient_visits', 'developmental_milestones')) {
                $table->text('developmental_milestones')->nullable()->after('obstetric_history');
            }
            
            if (!Schema::hasColumn('patient_visits', 'investigation_plan')) {
                $table->text('investigation_plan')->nullable()->after('provisional_diagnosis');
            }
            
            if (!Schema::hasColumn('patient_visits', 'final_diagnosis')) {
                $table->text('final_diagnosis')->nullable()->after('investigation_plan');
            }
            
            if (!Schema::hasColumn('patient_visits', 'treatment_rx')) {
                $table->text('treatment_rx')->nullable()->after('final_diagnosis');
            }
            
            if (!Schema::hasColumn('patient_visits', 'other_management')) {
                $table->text('other_management')->nullable()->after('treatment_rx');
            }
            
            if (!Schema::hasColumn('patient_visits', 'provisional_diagnosis_completed')) {
                $table->boolean('provisional_diagnosis_completed')->default(false)->after('other_management');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            // Rename back if needed
            if (Schema::hasColumn('patient_visits', 'provisional_diagnosis') && 
                !Schema::hasColumn('patient_visits', 'diagnosis')) {
                $table->renameColumn('provisional_diagnosis', 'diagnosis');
            }
            
            // Drop added columns
            $columns = [
                'chief_complaint_detailed',
                'history_present_illness',
                'review_of_systems',
                'past_medical_history',
                'family_social_history',
                'obstetric_history',
                'developmental_milestones',
                'investigation_plan',
                'final_diagnosis',
                'treatment_rx',
                'other_management',
                'provisional_diagnosis_completed'
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('patient_visits', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
