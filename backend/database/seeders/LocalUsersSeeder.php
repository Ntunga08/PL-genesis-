<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LocalUsersSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'id' => Str::uuid(),
                'name' => 'Admin User',
                'email' => 'admin@test.com',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'phone' => '0734567890',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Dr. John Doe',
                'email' => 'doctor@test.com',
                'password' => Hash::make('doctor123'),
                'role' => 'doctor',
                'phone' => '0712345678',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Nurse Jane',
                'email' => 'nurse@test.com',
                'password' => Hash::make('nurse123'),
                'role' => 'nurse',
                'phone' => '0745678901',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Receptionist Mary',
                'email' => 'receptionist@test.com',
                'password' => Hash::make('reception123'),
                'role' => 'receptionist',
                'phone' => '0756789012',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Lab Technician',
                'email' => 'lab@test.com',
                'password' => Hash::make('lab123'),
                'role' => 'lab_technician',
                'phone' => '0723456789',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Pharmacist Ali',
                'email' => 'pharmacist@test.com',
                'password' => Hash::make('pharma123'),
                'role' => 'pharmacist',
                'phone' => '0767890123',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'name' => 'Billing Officer',
                'email' => 'billing@test.com',
                'password' => Hash::make('billing123'),
                'role' => 'billing',
                'phone' => '0778901234',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        $emails = array_column($users, 'email');
        DB::table('users')->whereIn('email', $emails)->delete();

        foreach ($users as $user) {
            DB::table('users')->insert($user);
        }

        $this->command->info('✅ Local test users created successfully!');
        $this->command->info('');
        $this->command->info('Login Credentials:');
        $this->command->info('──────────────────────────────────────────────────');
        $this->command->info('Admin:        admin@test.com        / admin123');
        $this->command->info('Doctor:       doctor@test.com       / doctor123');
        $this->command->info('Nurse:        nurse@test.com        / nurse123');
        $this->command->info('Receptionist: receptionist@test.com / reception123');
        $this->command->info('Lab Tech:     lab@test.com          / lab123');
        $this->command->info('Pharmacist:   pharmacist@test.com   / pharma123');
        $this->command->info('Billing:      billing@test.com      / billing123');
        $this->command->info('──────────────────────────────────────────────────');
    }
}
