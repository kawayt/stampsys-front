import React, { useState } from 'react';
import { getHiddenUsers, restoreHiddenUser } from '../api/user';

/**
 * 非表示ユーザー一覧を取得して表示し、復元（hidden=false）できるパネル。
 * - 管理者のみがアクセスできる想定です（サーバ側での権限制御は別途）。
 */

export default function HiddenUsersPanel({ onRestored }) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    const fetchHidden = async (query = '') => {
        setLoading(true);
        setError(null);
        try {
            const data = await getHiddenUsers(query);
            setUsers(Array.isArray(data) ? data : []);
            setVisible(true);
        } catch (e) {
            console.error('fetchHidden error:', e);
            setError(e.message || 'エラー');
        } finally {
            setLoading(false);
        }
    };

    const restoreUser = async (rawUser) => {
        const userId = rawUser?.userId ?? rawUser?.id ?? rawUser?.user_id;
        if (!userId) {
            alert('ユーザーIDが取得できませんでした');
            return;
        }
        if (!window.confirm('このユーザーを表示状態に戻しますか？')) return;
        try {
            const updated = await restoreHiddenUser(userId);
            // リストから除外
            setUsers(prev => prev.filter(u => {
                const uid = u?.userId ?? u?.id ?? u?.user_id;
                return uid !== userId;
            }));
            if (onRestored) onRestored(updated);
            alert('ユーザーを表示状態に戻しました');
        } catch (e) {
            console.error('restoreUser error:', e);
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
                    {visible ? '削除済みユーザー一覧を閉じる' : '削除済みユーザー一覧を表示'}
                </button>
            </div>

            {loading && <div>読み込み中...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {visible && !loading && !error && (
                <>
                    {users.length === 0 ? (
                        <div className="text-sm text-slate-500">非表示ユーザーは存在しません。</div>
                    ) : (
                        <div className="overflow-auto max-h-[60vh]">
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="text-left text-xs text-slate-600">
                                    <th className="py-2 px-3">ID</th>
                                    <th className="py-2 px-3">名前</th>
                                    <th className="py-2 px-3">メール</th>
                                    <th className="py-2 px-3">権限</th>
                                    <th className="py-2 px-3">作成日時</th>
                                    <th className="py-2 px-3">操作</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map(u => {
                                    const uid = u?.userId ?? u?.id ?? u?.user_id;
                                    return (
                                        <tr key={uid ?? Math.random()} className="border-t">
                                            <td className="py-2 px-3">{uid}</td>
                                            <td className="py-2 px-3">{u?.name ?? u?.fullName ?? ''}</td>
                                            <td className="py-2 px-3">{u?.email ?? ''}</td>
                                            <td className="py-2 px-3">{u?.role ?? ''}</td>
                                            <td className="py-2 px-3">{u?.createdAt ?? u?.created_at ?? ''}</td>
                                            <td className="py-2 px-3">
                                                <button onClick={() => restoreUser(u)}>復元</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}