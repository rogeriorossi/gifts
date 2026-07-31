<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'barcode',
        'is_custom_barcode',
        'price',
        'cost_price',
        'min_stock_alert',
    ];

    protected $appends = ['total_stock'];

    public function batches(): HasMany
    {
        return $this->hasMany(ProductBatch::class)->orderBy('expiration_date', 'asc');
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function getTotalStockAttribute(): int
    {
        return (int) $this->batches()->sum('quantity');
    }
}
