<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index(): Response
    {
        $products = Product::with(['batches' => function ($query) {
            $query->where('quantity', '>', 0)->orderBy('expiration_date', 'asc');
        }])->get();

        $recentSales = Sale::with('items.product')
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('Pos/Index', [
            'products' => $products,
            'recentSales' => $recentSales,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'payment_method' => 'required|in:cash,card,pix',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $totalAmount = 0;
            $saleItemsToInsert = [];

            foreach ($validated['items'] as $itemData) {
                $product = Product::with(['batches' => function ($q) {
                    $q->where('quantity', '>', 0)->orderBy('expiration_date', 'asc');
                }])->findOrFail($itemData['product_id']);

                $requestedQty = (int) $itemData['quantity'];

                if ($product->total_stock < $requestedQty) {
                    throw ValidationException::withMessages([
                        'items' => "Estoque insuficiente para o produto {$product->name}. Solicitado: {$requestedQty}, Disponível: {$product->total_stock}."
                    ]);
                }

                $remainingToDeduct = $requestedQty;

                foreach ($product->batches as $batch) {
                    if ($remainingToDeduct <= 0) {
                        break;
                    }

                    $deductQty = min($batch->quantity, $remainingToDeduct);
                    $batch->quantity -= $deductQty;
                    $batch->save();

                    $subtotal = $deductQty * $product->price;
                    $totalAmount += $subtotal;

                    $saleItemsToInsert[] = [
                        'product_id' => $product->id,
                        'product_batch_id' => $batch->id,
                        'quantity' => $deductQty,
                        'unit_price' => $product->price,
                        'subtotal' => $subtotal,
                    ];

                    $remainingToDeduct -= $deductQty;
                }
            }

            // Create Sale record
            $sale = Sale::create([
                'user_id' => Auth::id(),
                'total_amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
            ]);

            // Save sale items
            foreach ($saleItemsToInsert as $item) {
                $sale->items()->create($item);
            }
        });

        return redirect()->back()->with('success', 'Venda finalizada com sucesso!');
    }
}
