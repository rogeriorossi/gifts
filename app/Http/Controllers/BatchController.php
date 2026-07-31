<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BatchController extends Controller
{
    public function index(): Response
    {
        $alertDays = (int) Setting::get('expiration_alert_days', 30);
        $today = now()->startOfDay();
        $alertLimitDate = now()->addDays($alertDays)->endOfDay();

        // Expiring soon (or already expired) with quantity > 0
        $expiringBatches = ProductBatch::with('product')
            ->where('quantity', '>', 0)
            ->where('expiration_date', '<=', $alertLimitDate)
            ->orderBy('expiration_date', 'asc')
            ->get();

        // Products with low stock (total_stock <= min_stock_alert)
        $products = Product::with(['batches' => function ($q) {
            $q->orderBy('expiration_date', 'asc');
        }])->get();

        $lowStockProducts = $products->filter(function ($product) {
            return $product->total_stock <= $product->min_stock_alert;
        })->values();

        return Inertia::render('Stock/Index', [
            'products' => $products,
            'expiringBatches' => $expiringBatches,
            'lowStockProducts' => $lowStockProducts,
            'expirationAlertDays' => $alertDays,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'batch_code' => 'nullable|string|max:100',
            'quantity' => 'required|integer|min:1',
            'expiration_date' => 'required|date',
        ]);

        ProductBatch::create($validated);

        return redirect()->back()->with('success', 'Lote adicionado com sucesso!');
    }

    public function update(Request $request, ProductBatch $batch)
    {
        $validated = $request->validate([
            'batch_code' => 'nullable|string|max:100',
            'quantity' => 'required|integer|min:0',
            'expiration_date' => 'required|date',
        ]);

        $batch->update($validated);

        return redirect()->back()->with('success', 'Lote atualizado com sucesso!');
    }

    public function destroy(ProductBatch $batch)
    {
        $batch->delete();

        return redirect()->back()->with('success', 'Lote removido com sucesso!');
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'expiration_alert_days' => 'required|integer|min:1|max:365',
        ]);

        Setting::set('expiration_alert_days', $validated['expiration_alert_days']);

        return redirect()->back()->with('success', 'Configuração de alerta atualizada!');
    }
}
