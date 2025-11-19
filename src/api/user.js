// src/api/user.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function getUsers() {
    const res = await fetch(`${API_BASE}/users`, {
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

// 新規追加: 非表示ユーザー一覧取得と復元（hidden=false）
export async function getHiddenUsers(query = '') {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`${API_BASE}/users/hidden${q}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Failed to fetch hidden users (${res.status})`);
    }
    return res.json();
}

export async function restoreHiddenUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}/hidden`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: false })
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Failed to restore user (${res.status})`);
    }
    return res.json();
}

// 削除（DELETE）APIは廃止したためこの関数は削除しました。
// 非表示（実質削除）は PUT /api/users/:id/hidden を直接呼ぶ実装にしました。