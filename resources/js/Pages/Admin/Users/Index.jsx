import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function UsersIndex({ auth, users }) {
    const currentUser = usePage().props.auth.user;
    const [searchTerm, setSearchTerm] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        is_admin: false,
    });

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreateModal = () => {
        reset();
        setEditingUser(null);
        setIsUserModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setData({
            name: user.name,
            email: user.email,
            password: '',
            is_admin: Boolean(user.is_admin),
        });
        setIsUserModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingUser) {
            put(route('admin.users.update', editingUser.id), {
                onSuccess: () => {
                    setIsUserModalOpen(false);
                    reset();
                }
            });
        } else {
            post(route('admin.users.store'), {
                onSuccess: () => {
                    setIsUserModalOpen(false);
                    reset();
                }
            });
        }
    };

    const handleDelete = (user) => {
        if (user.id === currentUser.id) {
            alert('Você não pode excluir a sua própria conta enquanto estiver logado.');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
            destroy(route('admin.users.destroy', user.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-white flex items-center gap-2">
                        👥 Gerenciamento de Usuários
                    </h2>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:from-pink-600 hover:to-rose-600 transition"
                    >
                        <span>+ Novo Usuário</span>
                    </button>
                </div>
            }
        >
            <Head title="Gerenciamento de Usuários - Gifts" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-400 text-sm focus:border-pink-500 focus:outline-none"
                    />
                </div>

                {/* Users Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-xs font-semibold uppercase text-slate-400 border-b border-slate-700">
                                <tr>
                                    <th className="py-3.5 px-4">Nome</th>
                                    <th className="py-3.5 px-4">E-mail</th>
                                    <th className="py-3.5 px-4">Perfil</th>
                                    <th className="py-3.5 px-4">Data de Cadastro</th>
                                    <th className="py-3.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-850 transition">
                                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                                            <span>{user.name}</span>
                                            {user.id === currentUser.id && (
                                                <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-1.5 py-0.5 rounded font-mono">
                                                    Você
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                                            {user.email}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                                user.is_admin
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                                {user.is_admin ? '👑 Administrador' : '👤 Usuário Padrão'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-3.5 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-xs text-pink-400 hover:text-pink-300 font-semibold"
                                            >
                                                Editar
                                            </button>
                                            {user.id !== currentUser.id && (
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-slate-500 text-sm">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create / Edit User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white">
                                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                            </h3>
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="text-slate-400 hover:text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ex: Maria Silva"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">E-mail *</label>
                                <input
                                    type="email"
                                    required
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="maria@exemplo.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha *'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    minLength={6}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="******"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 text-sm focus:border-pink-500 focus:outline-none"
                                />
                                {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password}</p>}
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_admin}
                                        onChange={(e) => setData('is_admin', e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-800 text-pink-500 focus:ring-pink-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-slate-200">
                                        Conceder permissões de Administrador
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-5 py-2 rounded-xl bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                                >
                                    {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
