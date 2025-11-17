// src/api/users.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function getUsers() {
    const res = await fetch(`${API_BASE}/users`, {
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function deleteUser(id) {
    // もしバックエンドに DELETE /users/:id がなければ、この関数はエラーになります。
    const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Delete failed: ${res.status} ${text}`);
    }
    return true;
}