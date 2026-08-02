<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    private function checkAdmin(): void
    {
        if (! Auth::user() || ! Auth::user()->is_admin) {
            abort(403, 'Acesso não autorizado.');
        }
    }

    public function index(): Response
    {
        $this->checkAdmin();
        $users = User::latest()->get();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => ['required', 'string', Password::defaults()],
            'is_admin' => 'required|boolean',
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $validated['is_admin'],
        ]);

        return redirect()->back()->with('success', 'Usuário cadastrado com sucesso!');
    }

    public function update(Request $request, User $user)
    {
        $this->checkAdmin();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', Password::defaults()],
            'is_admin' => 'required|boolean',
        ]);

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'is_admin' => $validated['is_admin'],
        ];

        if (!empty($validated['password'])) {
            $userData['password'] = Hash::make($validated['password']);
        }

        $user->update($userData);

        return redirect()->back()->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(User $user)
    {
        $this->checkAdmin();

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'user' => 'Você não pode excluir seu próprio usuário logado.'
            ]);
        }

        $user->delete();

        return redirect()->back()->with('success', 'Usuário excluído com sucesso!');
    }
}
