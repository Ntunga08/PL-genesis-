<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasUuids;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role',
        'department_id',
        'is_active',
        'stellar_public_key',
        'stellar_encrypted_secret',
        'avatar_url',
        'specialization',
        'last_login_at',
        'password_reset_token',
        'password_reset_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'stellar_encrypted_secret',  // never expose encrypted secret in API responses
        'password_reset_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'           => 'datetime',
            'password'                    => 'hashed',
            'is_active'                   => 'boolean',
            'last_login_at'               => 'datetime',
            'password_reset_expires_at'   => 'datetime',
        ];
    }

    // Accessor for full_name (alias for name field for compatibility)
    public function getFullNameAttribute()
    {
        return $this->name;
    }

    // Append full_name to JSON responses
    protected $appends = ['full_name'];

    public function roles()
    {
        return $this->hasMany(UserRole::class);
    }

    public function hasRole($role)
    {
        return $this->roles()->where('role', $role)->exists() || $this->role === $role;
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }
}
