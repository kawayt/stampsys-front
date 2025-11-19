// getHiddenUsers を次のように変更（相対パスを使う）
export async function getHiddenUsers(query = '') {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/users/hidden${q}`, {
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
    const res = await fetch(`/api/users/${userId}/hidden`, {
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