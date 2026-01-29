// getHiddenUsers を次のように変更（相対パスを使う）
export async function getHiddenUsers(query = '') {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/users/hidden${q}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Failed to fetch hidden users (${res.status})`);
    }
    return res.json();
}

// restoreHiddenUser も相対パスへ
export async function restoreHiddenUser(userId) {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const res = await fetch(`${API_BASE_URL}/api/users/${userId}/hidden`, {
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