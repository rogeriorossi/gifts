import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { Html5Qrcode } from 'html5-qrcode';

export default function Index({ auth, products }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerError, setScannerError] = useState(null);
    
    const html5QrcodeRef = useRef(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        name: '',
        description: '',
        barcode: '',
        price: '',
        cost_price: '',
        min_stock_alert: 5,
        initial_quantity: '',
        initial_expiration_date: '',
        initial_batch_code: '',
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm))
    );

    const openCreateModal = () => {
        reset();
        setEditingProduct(null);
        setIsScannerOpen(false);
        setIsCreateModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setIsScannerOpen(false);
        setData({
            name: product.name,
            description: product.description || '',
            barcode: product.barcode,
            price: product.price,
            cost_price: product.cost_price || '',
            min_stock_alert: product.min_stock_alert,
            initial_quantity: '',
            initial_expiration_date: '',
            initial_batch_code: '',
        });
        setIsCreateModalOpen(true);
    };

    // Camera Scanner lifecycle for Product Barcode Input
    useEffect(() => {
        if (isScannerOpen && isCreateModalOpen) {
            setScannerError(null);
            const html5Qrcode = new Html5Qrcode('product-qr-reader');
            html5QrcodeRef.current = html5Qrcode;

            const config = { fps: 10, qrbox: { width: 250, height: 150 } };

            html5Qrcode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    setData('barcode', decodedText);
                    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
                        html5QrcodeRef.current.stop().then(() => {
                            setIsScannerOpen(false);
                        }).catch(console.error);
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
    }, [isScannerOpen, isCreateModalOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingProduct) {
            put(route('products.update', editingProduct.id), {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                }
            });
        } else {
            post(route('products.store'), {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    reset();
                }
            });
        }
    };

    const handleDelete = (product) => {
        if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
            destroy(route('products.destroy', product.id));
        }
    };

    const handlePrintBarcode = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-white">
                        📦 Gerenciamento de Produtos
                    </h2>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:from-pink-600 hover:to-rose-600 transition-all"
                    >
                        <span>+ Novo Produto</span>
                    </button>
                </div>
            }
        >
            <Head title="Produtos - Gifts" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por nome ou código de barras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                </div>

                {/* Product List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-lg text-white">{product.name}</h3>
                                    <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                        {product.barcode}
                                    </span>
                                </div>
                                {product.description && (
                                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{product.description}</p>
                                )}
                                <div className="flex items-center justify-between text-sm py-2 border-t border-slate-800">
                                    <span className="text-slate-400">Preço de Venda:</span>
                                    <span className="font-bold text-emerald-400 text-base">
                                        R$ {Number(product.price).toFixed(2)}
                                    </span>
                                </div>
                                {product.cost_price && (
                                    <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                                        <span>Preço de Custo:</span>
                                        <span>R$ {Number(product.cost_price).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm py-2 border-t border-slate-800">
                                    <span className="text-slate-400">Estoque Total:</span>
                                    <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                                        product.total_stock <= product.min_stock_alert
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}>
                                        {product.total_stock} un. (Mín: {product.min_stock_alert})
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                                <button
                                    onClick={() => setSelectedBarcodeProduct(product)}
                                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                                >
                                    🏷️ Etiqueta
                                </button>
                                <button
                                    onClick={() => openEditModal(product)}
                                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                                >
                                    ✏️ Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(product)}
                                    className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-900/50 transition"
                                >
                                    🗑️ Excluir
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <p className="text-lg font-medium">Nenhum produto encontrado.</p>
                            <p className="text-sm text-slate-500 mt-1">Clique no botão "+ Novo Produto" acima para cadastrar.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Product Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl my-8">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">
                                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                            </h3>
                            <button
                                onClick={() => {
                                    if (isScannerOpen && html5QrcodeRef.current?.isScanning) {
                                        html5QrcodeRef.current.stop();
                                    }
                                    setIsCreateModalOpen(false);
                                }}
                                className="text-slate-400 hover:text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Mobile Camera Scanner for Barcode Field */}
                        {isScannerOpen && (
                            <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden text-center">
                                <h4 className="text-xs font-bold text-slate-300 mb-2">Aproxime o código de barras da câmera</h4>
                                <div id="product-qr-reader" className="w-full max-w-xs mx-auto overflow-hidden rounded-lg bg-slate-900 border border-slate-700"></div>
                                {scannerError && (
                                    <p className="text-xs text-rose-400 mt-2">{scannerError}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (html5QrcodeRef.current?.isScanning) {
                                            html5QrcodeRef.current.stop();
                                        }
                                        setIsScannerOpen(false);
                                    }}
                                    className="mt-2 px-3 py-1 bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg hover:bg-slate-700"
                                >
                                    Cancelar Leitura
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Produto *</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex: Caneca Personalizada Gifts"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                                <textarea
                                    rows="2"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Detalhes ou especificações do produto..."
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Preço de Venda (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                    />
                                    {errors.price && <p className="text-xs text-rose-400 mt-1">{errors.price}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Preço de Custo (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.cost_price}
                                        onChange={(e) => setData('cost_price', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-medium text-slate-300">Código de Barras</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsScannerOpen(!isScannerOpen)}
                                            className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                                        >
                                            📷 Ler Câmera
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={data.barcode}
                                            onChange={(e) => setData('barcode', e.target.value)}
                                            placeholder="Auto EAN-13 se vazio"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none pr-8 font-mono"
                                        />
                                        {data.barcode && (
                                            <button
                                                type="button"
                                                onClick={() => setData('barcode', '')}
                                                className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs font-bold"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Vazio = EAN-13 próprio (20...).</p>
                                    {errors.barcode && <p className="text-xs text-rose-400 mt-1">{errors.barcode}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Estoque Mínimo Alerta</label>
                                    <input
                                        type="number"
                                        value={data.min_stock_alert}
                                        onChange={(e) => setData('min_stock_alert', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {!editingProduct && (
                                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-3">
                                    <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider">Lote Inicial de Estoque (Opcional)</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[11px] text-slate-300">Qtd. Inicial</label>
                                            <input
                                                type="number"
                                                value={data.initial_quantity}
                                                onChange={(e) => setData('initial_quantity', e.target.value)}
                                                placeholder="0"
                                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-300">Validade</label>
                                            <input
                                                type="date"
                                                value={data.initial_expiration_date}
                                                onChange={(e) => setData('initial_expiration_date', e.target.value)}
                                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-slate-300">Cód. Lote</label>
                                            <input
                                                type="text"
                                                value={data.initial_batch_code}
                                                onChange={(e) => setData('initial_batch_code', e.target.value)}
                                                placeholder="LOTE-01"
                                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isScannerOpen && html5QrcodeRef.current?.isScanning) {
                                            html5QrcodeRef.current.stop();
                                        }
                                        setIsCreateModalOpen(false);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                                >
                                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Tag Modal */}
            {selectedBarcodeProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-slate-900 text-center">
                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-slate-900">{selectedBarcodeProduct.name}</h3>
                            <p className="text-xl font-extrabold text-pink-600 mt-1">
                                R$ {Number(selectedBarcodeProduct.price).toFixed(2)}
                            </p>
                        </div>

                        <div className="flex justify-center my-4 bg-white p-2 border border-slate-200 rounded-lg">
                            <Barcode
                                value={selectedBarcodeProduct.barcode}
                                format={selectedBarcodeProduct.barcode.length === 13 ? 'EAN13' : 'CODE128'}
                                width={1.8}
                                height={60}
                                fontSize={14}
                            />
                        </div>

                        <div className="flex justify-center gap-3 mt-6 print:hidden">
                            <button
                                onClick={() => setSelectedBarcodeProduct(null)}
                                className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={handlePrintBarcode}
                                className="px-5 py-2 rounded-xl bg-pink-600 text-sm font-bold text-white hover:bg-pink-700 shadow-md"
                            >
                                🖨️ Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
