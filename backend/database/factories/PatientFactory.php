<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PatientFactory extends Factory
{
    protected $model = \App\Models\Patient::class;

    public function definition(): array
    {
        return [
            'full_name'         => fake()->name(),
            'date_of_birth'     => fake()->date('Y-m-d', '-18 years'),
            'gender'            => fake()->randomElement(['Male', 'Female']),
            'phone'             => fake()->numerify('07########'),
            'email'             => fake()->unique()->safeEmail(),
            'address'           => fake()->address(),
            'blood_group'       => fake()->randomElement(['A+', 'B+', 'O+', 'AB+']),
            'insurance_provider'=> null,
            'insurance_number'  => null,
            'status'            => 'Active',
        ];
    }

    public function withStellarIdentity(): static
    {
        return $this->state(fn () => [
            'stellar_public_key' => 'G' . strtoupper(\Illuminate\Support\Str::random(55)),
            'share_code'         => 'HMS-' . strtoupper(\Illuminate\Support\Str::random(6)),
        ]);
    }
}
