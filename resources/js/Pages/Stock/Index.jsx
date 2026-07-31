import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function StockIndex({ auth, products, expiringBatches, lowStockProducts, expirationAlertDays }) {
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    const { data: batchData, setData: setBatchData, post: postBatch, put: putBatch, delete: destroyBatch, reset: resetBatch, errors: batchErrors, processing: batchProcessing } = useForm({
        product_id: products[0]?.id || '',
        batch_code: '',
        quantity: '',
        expiration_date: '',
    });

    const { data: settingsData, setData: setSettingsData, post: postSettings, errors: settingsErrors, processing: settingsProcessing } = useForm({
        expiration_alert_days: expirationAlertDays || 30,
    });

    const openAddBatchModal = (productId = null) => {
        resetBatch();
        setEditingBatch(null);
        if (productId) {
            setBatchData('product_id', productId);
        } else if (products.length > 0) {
            setBatchData('product_id', products[0].id);
        }
        setIsBatchModalOpen(true);
    };

    const openEditBatchModal = (batch) => {
        setEditingBatch(batch);
        setBatchData({
            product_id: batch.product_id,
            batch_code: batch.batch_code || '',
            quantity: batch.quantity,
            expiration_date: batch.expiration_date ? batch.expiration_date.split('T')[0] : '',
        });
        setIsBatchModalOpen(true);
    };

    const handleBatchSubmit = (e) => {
        e.preventDefault();
        if (editingBatch) {
            putBatch(route('batches.update', editingBatch.id), {
                onSuccess: () => {
                    setIsBatchModalOpen(false);
                    resetBatch();
                }
            });
        } else {
            postBatch(route('batches.store'), {
                onSuccess: () => {
                    setIsBatchModalOpen(false);
                    resetBatch();
                }
            });
        }
    };

    const handleDeleteBatch = (batch) => {
        if (confirm(`Remover lote ${batch.batch_code || 'ID:' + batch.id}?`)) {
            destroyBatch(route('batches.destroy', batch.id));
        }
    };

    const handleSettingsSubmit = (e) => {
        e.preventDefault();
        postSettings(route('settings.expiration'), {
            onSuccess: () => {
                setIsSettingsModalOpen(false);
            }
        });
    };

    const calculateDaysLeft = (expirationDateStr) => {
        if (!expirationDateStr) return null;
        const exp = new Date(expirationDateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-white">
                        ⏰ Estoque & Validades de Lotes
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                        >
                            ⚙️ Configurar Alertas ({expirationAlertDays} dias)
                        </button>
                        <button
                            onClick={() => openAddBatchModal()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:from-pink-600 hover:to-rose-600 transition"
                        >
                            <span>+ Entrada de Lote</span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Estoque e Validades - Gifts" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Expiration Alerts Box */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <h3 className="font-bold text-lg text-amber-200">Alertas de Vencimento Próximo</h3>
                                    <p className="text-xs text-amber-400/80">Lotes vencendo nos próximos {expirationAlertDays} dias</p>
                                </div>
                            </div>
                            <span className="text-xl font-extrabold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
                                {expiringBatches.length}
                            </span>
                        </div>

                        {expiringBatches.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {expiringBatches.map((batch) => {
                                    const daysLeft = calculateDaysLeft(batch.expiration_date);
                                    const isExpired = daysLeft < 0;

                                    return (
                                        <div
                                            key={batch.id}
                                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                                                isExpired
                                                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                                                    : 'bg-amber-900/40 border-amber-800 text-amber-100'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-bold text-sm text-white">{batch.product?.name}</div>
                                                <div className="text-slate-400 mt-0.5">
                                                    Lote: <span className="font-mono">{batch.batch_code || 'S/N'}</span> | Qtd: <span className="font-semibold text-white">{batch.quantity} un.</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">
                                                    {new Date(batch.expiration_date).toLocaleDateString('pt-BR')}
                                                </div>
                                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isExpired ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                                                }`}>
                                                    {isExpired ? `Vencido há ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-amber-300/70 italic py-4 text-center">
                                Nenhum produto com vencimento próximo nos próximos {expirationAlertDays} dias.
                            </p>
                        )}
                    </div>

                    {/* Low Stock Box */}
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🚨</span>
                                <div>
                                    <h3 className="font-bold text-lg text-rose-200">Produtos com Estoque Baixo</h3>
                                    <p className="text-xs text-rose-400/80">Produtos atingindo o limite mínimo de alerta</p>
                                </div>
                            </div>
                            <span className="text-xl font-extrabold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-xl border border-rose-500/30">
                                {lowStockProducts.length}
                            </span>
                        </div>

                        {lowStockProducts.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {lowStockProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 flex items-center justify-between text-xs text-rose-100"
                                    >
                                        <div>
                                            <div className="font-bold text-sm text-white">{product.name}</div>
                                            <div className="text-rose-300/70 mt-0.5">
                                                Cód: {product.barcode} | Mín. Alerta: {product.min_stock_alert} un.
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm bg-rose-600/30 px-2 py-1 rounded text-rose-300 border border-rose-500/30">
                                                {product.total_stock} un.
                                            </span>
                                            <button
                                                onClick={() => openAddBatchModal(product.id)}
                                                className="px-2.5 py-1 rounded-lg bg-pink-500 text-[11px] font-bold text-white hover:bg-pink-600"
                                            >
                                                + Repor
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-rose-300/70 italic py-4 text-center">
                                Nenhum produto com estoque abaixo do limite de alerta.
                            </p>
                        )}
                    </div>
                </div>

                {/* All Batches Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                    <h3 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
                        <span>📋 Todos os Lotes por Produto</span>
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-xs font-semibold uppercase text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">Produto</th>
                                    <th className="py-3 px-4">Código Lote</th>
                                    <th className="py-3 px-4">Quantidade</th>
                                    <th className="py-3 px-4">Data de Validade</th>
                                    <th className="py-3 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {products.map((product) => (
                                    product.batches.length > 0 ? (
                                        product.batches.map((batch) => (
                                            <tr key={batch.id} className="hover:bg-slate-850">
                                                <td className="py-3 px-4 font-medium text-white">
                                                    {product.name}
                                                    <span className="block text-xs text-slate-500 font-mono">{product.barcode}</span>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-slate-300">
                                                    {batch.batch_code || '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">
                                                        {batch.quantity} un.
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {new Date(batch.expiration_date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="py-3 px-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => openEditBatchModal(batch)}
                                                        className="text-xs text-pink-400 hover:text-pink-300 font-semibold"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBatch(batch)}
                                                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                                                    >
                                                        Excluir
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr key={`empty-${product.id}`} className="hover:bg-slate-850 text-slate-500">
                                            <td className="py-3 px-4 font-medium text-slate-400">{product.name}</td>
                                            <td className="py-3 px-4 text-xs italic" colSpan="3">Sem lotes ativos</td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => openAddBatchModal(product.id)}
                                                    className="text-xs text-pink-400 font-semibold hover:underline"
                                                >
                                                    + Adicionar Lote
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add / Edit Batch Modal */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">
                                {editingBatch ? 'Editar Lote' : 'Entrada de Novo Lote'}
                            </h3>
                            <button
                                onClick={() => setIsBatchModalOpen(false)}
                                className="text-slate-400 hover:text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleBatchSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Produto *</label>
                                <select
                                    disabled={!!editingBatch}
                                    value={batchData.product_id}
                                    onChange={(e) => setBatchData('product_id', e.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                >
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.barcode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Código do Lote</label>
                                <input
                                    type="text"
                                    value={batchData.batch_code}
                                    onChange={(e) => setBatchData('batch_code', e.target.value)}
                                    placeholder="Ex: LOTE-2026-A"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Quantidade *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={batchData.quantity}
                                        onChange={(e) => setBatchData('quantity', e.target.value)}
                                        placeholder="10"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Data de Validade *</label>
                                    <input
                                        type="date"
                                        required
                                        value={batchData.expiration_date}
                                        onChange={(e) => setBatchData('expiration_date', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsBatchModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={batchProcessing}
                                    className="px-5 py-2 rounded-xl bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                                >
                                    Salvar Lote
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Configurar Alerta de Validade</h3>
                        <p className="text-xs text-slate-400 mb-4">
                            Defina com quantos dias de antecedência o sistema deve alertar sobre o vencimento de um lote.
                        </p>

                        <form onSubmit={handleSettingsSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Dias de Antecedência</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="365"
                                    value={settingsData.expiration_alert_days}
                                    onChange={(e) => setSettingsData('expiration_alert_days', e.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={settingsProcessing}
                                    className="px-5 py-2 rounded-xl bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                                >
                                    Salvar Configuração
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
