<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Setting;
use App\Models\User;
use App\Services\BarcodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GiftsSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_ean13_barcode_generation(): void
    {
        $barcode = BarcodeService::generateEAN13(1);
        $this->assertEquals(13, strlen($barcode));
        $this->assertStringStartsWith('20', $barcode);
    }

    public function test_product_creation_and_auto_barcode(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/products', [
            'name' => 'Caneca Gifts',
            'price' => 29.90,
            'cost_price' => 12.00,
            'min_stock_alert' => 5,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('products', [
            'name' => 'Caneca Gifts',
            'price' => 29.90,
        ]);

        $product = Product::first();
        $this->assertNotNull($product->barcode);
        $this->assertEquals(13, strlen($product->barcode));
    }

    public function test_pos_sale_with_fifo_stock_deduction(): void
    {
        $user = User::factory()->create();

        $product = Product::create([
            'name' => 'Vinho Especial',
            'barcode' => '2000000000015',
            'price' => 50.00,
            'min_stock_alert' => 2,
        ]);

        // Batch 1 (Older expiration: 10 un)
        $batchOld = ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'LOTE-VELHO',
            'quantity' => 10,
            'expiration_date' => now()->addDays(5)->format('Y-m-d'),
        ]);

        // Batch 2 (Newer expiration: 20 un)
        $batchNew = ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'LOTE-NOVO',
            'quantity' => 20,
            'expiration_date' => now()->addDays(60)->format('Y-m-d'),
        ]);

        // Sell 12 units -> Should deplete batchOld (10 un) and deduct 2 un from batchNew
        $response = $this->actingAs($user)->post('/pos/sales', [
            'payment_method' => 'pix',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 12,
                ]
            ]
        ]);

        $response->assertRedirect();

        $this->assertEquals(0, $batchOld->fresh()->quantity);
        $this->assertEquals(18, $batchNew->fresh()->quantity);

        $this->assertDatabaseHas('sales', [
            'total_amount' => 600.00,
            'payment_method' => 'pix',
        ]);
    }

    public function test_expiration_alert_settings(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/settings/expiration', [
            'expiration_alert_days' => 45,
        ]);

        $response->assertRedirect();
        $this->assertEquals('45', Setting::get('expiration_alert_days'));
    }
}
