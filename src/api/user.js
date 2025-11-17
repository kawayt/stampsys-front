// src/api/users.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function getUsers() {
    const res = await fetch(`${API_BASE}/users`, {
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

// 削除（DELETE）APIは廃止したためこの関数は削除しました。
// 非表示（実質削除）は PUT /api/users/:id/hidden を直接呼ぶ実装にしました。