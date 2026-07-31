import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function PosIndex({ auth, products, recentSales }) {
    const [cart, setCart] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerError, setScannerError] = useState(null);
    const [lastScanned, setLastScanned] = useState(null);
    
    const html5QrcodeRef = useRef(null);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        payment_method: 'pix',
        items: [],
    });

    const addToCart = (product, qty = 1) => {
        if (!product || product.total_stock <= 0) {
            alert(`Produto "${product?.name || 'desconhecido'}" sem estoque disponível!`);
            return;
        }

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.product_id === product.id);
            if (existingIndex > -1) {
                const currentQty = prevCart[existingIndex].quantity;
                if (currentQty + qty > product.total_stock) {
                    alert(`Estoque máximo atingido para ${product.name} (${product.total_stock} un.)`);
                    return prevCart;
                }
                const updated = [...prevCart];
                updated[existingIndex].quantity += qty;
                return updated;
            } else {
                return [...prevCart, {
                    product_id: product.id,
                    name: product.name,
                    barcode: product.barcode,
                    price: Number(product.price),
                    total_stock: product.total_stock,
                    quantity: qty,
                }];
            }
        });

        setLastScanned(product.name);
        setTimeout(() => setLastScanned(null), 2500);
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.product_id === productId) {
                    if (newQty > item.total_stock) {
                        alert(`Estoque máximo disponível: ${item.total_stock} un.`);
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            });
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
    };

    const handleBarcodeSearch = (e) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;

        const found = products.find(p => p.barcode === barcodeInput.trim() || p.name.toLowerCase().includes(barcodeInput.trim().toLowerCase()));

        if (found) {
            addToCart(found, 1);
            setBarcodeInput('');
        } else {
            alert(`Produto com código/nome "${barcodeInput}" não encontrado.`);
        }
    };

    // Camera Scanner lifecycle
    useEffect(() => {
        if (isScannerOpen) {
            setScannerError(null);
            const html5Qrcode = new Html5Qrcode('qr-reader');
            html5QrcodeRef.current = html5Qrcode;

            const config = { fps: 10, qrbox: { width: 250, height: 150 } };

            html5Qrcode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    const matched = products.find(p => p.barcode === decodedText);
                    if (matched) {
                        addToCart(matched, 1);
                    } else {
                        setLastScanned(`Código não cadastrado: ${decodedText}`);
                    }
                },
                (errorMessage) => {
                    // Ignore scan loop errors
                }
            ).catch(err => {
                console.error('Camera access error:', err);
                setScannerError('Não foi possível acessar a câmera. Verifique as permissões.');
            });

            return () => {
                if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
                    html5QrcodeRef.current.stop().catch(console.error);
                }
            };
        }
    }, [isScannerOpen]);

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) {
            alert('Adicione ao menos um item ao carrinho.');
            return;
        }

        const itemsPayload = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
        }));

        post(route('pos.sales.store'), {
            data: {
                payment_method: paymentMethod,
                items: itemsPayload,
            },
            onSuccess: () => {
                setCart([]);
                if (isScannerOpen && html5QrcodeRef.current?.isScanning) {
                    html5QrcodeRef.current.stop();
                    setIsScannerOpen(false);
                }
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-white flex items-center gap-2">
                        🛒 PDV Mobile <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded border border-pink-500/30">Caixa Aberto</span>
                    </h2>
                    <button
                        onClick={() => setIsScannerOpen(!isScannerOpen)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            isScannerOpen
                                ? 'bg-rose-600 text-white'
                                : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                        }`}
                    >
                        <span>📷 {isScannerOpen ? 'Fechar Câmera' : 'Leitor Câmera'}</span>
                    </button>
                </div>
            }
        >
            <Head title="PDV Mobile - Gifts" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Last scanned toast alert */}
                {lastScanned && (
                    <div className="mb-4 p-3 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-sm font-semibold text-center animate-bounce">
                        ✅ Item bipado: {lastScanned}
                    </div>
                )}

                {/* Camera Scanner Viewport */}
                {isScannerOpen && (
                    <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-300 mb-2 text-center">Aponta a câmera para o código de barras</h3>
                        <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-slate-900 border border-slate-700"></div>
                        {scannerError && (
                            <p className="text-xs text-rose-400 text-center mt-2">{scannerError}</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Barcode Search & Catalog (lg:col-span-7) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Quick Barcode Form */}
                        <form onSubmit={handleBarcodeSearch} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Barcode ou Nome do produto..."
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-pink-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="px-5 py-3 rounded-xl bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 shadow-md"
                            >
                                + Adicionar
                            </button>
                        </form>

                        {/* Quick Catalog Items Grid */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
                            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Catálogo de Produtos</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                                {products.map((product) => {
                                    const outOfStock = product.total_stock <= 0;
                                    return (
                                        <button
                                            key={product.id}
                                            disabled={outOfStock}
                                            onClick={() => addToCart(product, 1)}
                                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                                outOfStock
                                                    ? 'bg-slate-850 border-slate-800 opacity-40 cursor-not-allowed'
                                                    : 'bg-slate-800/80 border-slate-700 hover:border-pink-500/50 hover:bg-slate-800'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold text-xs text-white line-clamp-2">{product.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-1">{product.barcode}</div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                                                <span className="font-extrabold text-sm text-pink-400">
                                                    R$ {Number(product.price).toFixed(2)}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                    outOfStock ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                                                }`}>
                                                    {outOfStock ? 'Esgotado' : `${product.total_stock} un.`}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Sales */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
                            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Últimas Vendas Realizadas</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {recentSales.map((sale) => (
                                    <div key={sale.id} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                                        <div>
                                            <span className="font-bold text-white">Venda #{sale.id}</span>
                                            <span className="text-slate-500 ml-2">
                                                {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                Forma: <span className="uppercase font-semibold text-pink-400">{sale.payment_method}</span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm text-emerald-400">
                                            R$ {Number(sale.total_amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Active Cart & Checkout (lg:col-span-5) */}
                    <div className="lg:col-span-5">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sticky top-20">
                            <h3 className="font-bold text-lg text-white mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                                <span>🛒 Carrinho de Compras</span>
                                <span className="text-xs font-normal text-slate-400">{cart.length} item(ns)</span>
                            </h3>

                            {/* Cart Item List */}
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-4">
                                {cart.map((item) => (
                                    <div
                                        key={item.product_id}
                                        className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-100 text-sm">{item.name}</div>
                                            <div className="text-slate-400 mt-0.5">
                                                Un: R$ {item.price.toFixed(2)} | Subtotal: <span className="font-bold text-emerald-400">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 flex items-center justify-center"
                                            >
                                                -
                                            </button>
                                            <span className="w-7 text-center font-bold text-white text-xs">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 flex items-center justify-center"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="text-rose-400 hover:text-rose-300 font-bold px-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                {cart.length === 0 && (
                                    <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-850 rounded-xl border border-slate-800">
                                        Carrinho vazio. Bipe o código ou escolha um produto ao lado.
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Selector */}
                            <div className="mb-4 pt-3 border-t border-slate-800">
                                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                                    Forma de Pagamento
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                                            paymentMethod === 'pix'
                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                                        }`}
                                    >
                                        ⚡ PIX
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                                            paymentMethod === 'card'
                                                ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                                        }`}
                                    >
                                        💳 Cartão
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                                            paymentMethod === 'cash'
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                                        }`}
                                    >
                                        💵 Dinheiro
                                    </button>
                                </div>
                            </div>

                            {/* Total & Finalize Button */}
                            <div className="pt-3 border-t border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-400">Total a Pagar:</span>
                                    <span className="text-2xl font-extrabold text-emerald-400">
                                        R$ {cartTotal.toFixed(2)}
                                    </span>
                                </div>

                                {errors.items && (
                                    <p className="text-xs text-rose-400">{errors.items}</p>
                                )}

                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || processing}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-base font-bold text-white shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 transition-all"
                                >
                                    {processing ? 'Processando Venda...' : '✅ Finalizar Venda'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
