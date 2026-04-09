<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Medication extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'generic_name', 'category', 'dosage_form', 'strength',
        'manufacturer', 'unit_price', 'stock_quantity', 'initial_quantity', 'reorder_level',
        'expiry_date', 'batch_number', 'is_active', 'stock_updated_at'
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
        'stock_updated_at' => 'datetime',
    ];

    protected $appends = ['quantity_in_stock'];

    // Accessor for backward compatibility
    public function getQuantityInStockAttribute()
    {
        return $this->stock_quantity;
    }
}
