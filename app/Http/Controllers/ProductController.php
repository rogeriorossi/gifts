<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\BarcodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::with(['batches' => function ($query) {
            $query->orderBy('expiration_date', 'asc');
        }])->latest()->get();

        return Inertia::render('Products/Index', [
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'barcode' => 'nullable|string|max:50|unique:products,barcode',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'min_stock_alert' => 'required|integer|min:0',
            'initial_quantity' => 'nullable|integer|min:0',
            'initial_expiration_date' => 'nullable|date',
            'initial_batch_code' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $isCustomBarcode = !empty($validated['barcode']);
            
            // Create temporary product to get ID for auto barcode generation
            $product = Product::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'barcode' => $isCustomBarcode ? $validated['barcode'] : 'TEMP_' . uniqid(),
                'is_custom_barcode' => $isCustomBarcode,
                'price' => $validated['price'],
                'cost_price' => $validated['cost_price'] ?? null,
                'min_stock_alert' => $validated['min_stock_alert'] ?? 5,
            ]);

            if (!$isCustomBarcode) {
                $product->update([
                    'barcode' => BarcodeService::generateEAN13($product->id),
                ]);
            }

            // Create initial batch if quantity and expiration date provided
            if (!empty($validated['initial_quantity']) && $validated['initial_quantity'] > 0) {
                $product->batches()->create([
                    'batch_code' => $validated['initial_batch_code'] ?? 'LOTE-INICIAL',
                    'quantity' => $validated['initial_quantity'],
                    'expiration_date' => $validated['initial_expiration_date'] ?? now()->addMonths(6)->format('Y-m-d'),
                ]);
            }
        });

        return redirect()->back()->with('success', 'Produto cadastrado com sucesso!');
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'barcode' => 'required|string|max:50|unique:products,barcode,' . $product->id,
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'min_stock_alert' => 'required|integer|min:0',
        ]);

        $product->update($validated);

        return redirect()->back()->with('success', 'Produto atualizado com sucesso!');
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return redirect()->back()->with('success', 'Produto excluído com sucesso!');
    }
}
