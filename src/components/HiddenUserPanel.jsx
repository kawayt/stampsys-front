import React, { useState } from 'react';

/**
 * 非表示ユーザー一覧を取得して表示し、復元（hidden=false）できるパネル。
 * ページ上部の並び替えエリアの上などに配置してください。
 *
 * - 管理者のみがアクセスできる想定です（サーバ側で @PreAuthorize を設定済み）。
 * - API:
 *   GET  /api/users/hidden       -> 非表示ユーザー一覧
 *   PUT  /api/users/{id}/hidden  -> { hidden: false } で復元
 */

export default function HiddenUsersPanel({ onRestored }) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    const fetchHidden = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/users/hidden', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error('非表示ユーザー一覧の取得に失敗しました');
            const data = await res.json();
            setUsers(data || []);
            setVisible(true);
        } catch (e) {
            console.error(e);
            setError(e.message || 'エラー');
        } finally {
            setLoading(false);
        }
    };

    const restoreUser = async (userId) => {
        if (!window.confirm('このユーザーを表示状態に戻しますか？')) return;
        try {
            const res = await fetch(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: false })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || '復元に失敗しました');
            }
            const updated = await res.json();
            // リストから除外
            setUsers(prev => prev.filter(u => u.userId !== userId));
            // 呼び出し元に通知（メインの一覧を再取得させる等）
            if (onRestored) onRestored(updated);
            alert('ユーザーを表示状態に戻しました');
        } catch (e) {
            console.error(e);
            alert('復元に失敗しました: ' + (e.message || ''));
        }
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
                <button
                    onClick={() => {
                        if (!visible) {
                            fetchHidden();
                        } else {
                            setVisible(false);
                        }
                    }}
                    disabled={loading}
                >
                    {visible ? '非表示ユーザーを閉じる' : '非表示ユーザーを表示'}
                </button>
            </div>

            {loading && <div>読み込み中...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {visible && (
                <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 6 }}>
                    {users.length === 0 ? (
                        <div>非表示ユーザーは存在しません。</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '6px' }}>名前</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>メール</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>役割</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>作成日</th>
                                <th style={{ padding: '6px' }}>操作</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u => (
                                <tr key={u.userId} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={{ padding: '6px' }}>{u.userName}</td>
                                    <td style={{ padding: '6px' }}>{u.email}</td>
                                    <td style={{ padding: '6px' }}>{u.role}</td>
                                    <td style={{ padding: '6px' }}>{u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</td>
                                    <td style={{ padding: '6px' }}>
                                        <button onClick={() => restoreUser(u.userId)}>復元</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}