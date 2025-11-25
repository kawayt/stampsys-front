import React, { useState } from 'react';
import { getHiddenUsers, restoreHiddenUser } from '../api/user';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function HiddenUsersPanel({ onRestored }) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    // 復元確認ダイアログ状態
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [restoreDialogUser, setRestoreDialogUser] = useState(null);
    const [restoreDialogLoading, setRestoreDialogLoading] = useState(false);
    const [restoreDialogError, setRestoreDialogError] = useState(null);

    const openRestoreDialog = (user) => {
        setRestoreDialogUser(user || null);
        setRestoreDialogError(null);
        setRestoreDialogOpen(true);
    };
    const closeRestoreDialog = () => {
        setRestoreDialogOpen(false);
        setRestoreDialogUser(null);
        setRestoreDialogError(null);
    };

    const fetchHidden = async (query = '') => {
        setLoading(true);
        setError(null);
        try {
            const data = await getHiddenUsers(query);
            setUsers(Array.isArray(data) ? data : []);
            setVisible(true);
        } catch (err) {
            console.error('fetchHidden error:', err);
            setError(err.message || 'エラー');
        } finally {
            setLoading(false);
        }
    };

    const performRestore = async () => {
        if (!restoreDialogUser) return;
        const uidRaw = restoreDialogUser?.userId ?? restoreDialogUser?.id ?? restoreDialogUser?.user_id;
        if (!uidRaw) {
            setRestoreDialogError('ユーザーIDを取得できませんでした');
            return;
        }
        const uid = String(uidRaw);

        if (/^hidden-\d+$/i.test(uid)) {
            setRestoreDialogError('ローカルのみの項目のため復元できません（ID不正）');
            return;
        }

        setRestoreDialogLoading(true);
        setRestoreDialogError(null);
        try {
            if (typeof restoreHiddenUser === 'function') {
                await restoreHiddenUser(uid);
            } else {
                const res = await fetch(`/api/users/${uid}/hidden`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hidden: false }),
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(text || `復元に失敗しました (${res.status})`);
                }
            }
            setUsers(prev => prev.filter(u => {
                const id = u?.userId ?? u?.id ?? u?.user_id;
                return String(id) !== uid;
            }));
            if (onRestored) {
                try { onRestored(uid); } catch (_) { /* empty */ }
            }
            closeRestoreDialog();
        } catch (err) {
            console.error('performRestore error:', err);
            setRestoreDialogError(err?.message || String(err));
        } finally {
            setRestoreDialogLoading(false);
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
                                {users.map((u, idx) => {
                                    const uidRaw = u?.userId ?? u?.id ?? u?.user_id;
                                    const uid = uidRaw != null ? String(uidRaw) : `hidden-${idx}`;
                                    const name = u?.userName ?? u?.name ?? u?.fullName ?? '';
                                    const created = u?.createdAt ?? u?.created_at ?? '';
                                    const isPlaceholder = /^hidden-\d+$/i.test(uid);
                                    return (
                                        <tr key={uid} className="border-t">
                                            <td className="py-2 px-3">{uid}</td>
                                            <td className="py-2 px-3">{name}</td>
                                            <td className="py-2 px-3">{u?.email ?? ''}</td>
                                            <td className="py-2 px-3">{u?.role ?? ''}</td>
                                            <td className="py-2 px-3">{created}</td>
                                            <td className="py-2 px-3">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openRestoreDialog(u)}
                                                    disabled={isPlaceholder}
                                                >
                                                    {isPlaceholder ? '復元不可' : '復元'}
                                                </Button>
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

            <Dialog open={restoreDialogOpen} onOpenChange={(v) => { if (!v) closeRestoreDialog(); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>非表示ユーザーを復元</DialogTitle>
                        <DialogDescription>
                            {restoreDialogUser
                                ? `${restoreDialogUser.userName ?? restoreDialogUser.name ?? restoreDialogUser.fullName ?? ''} を表示状態に戻しますか？`
                                : 'ユーザーを復元しますか？'}
                        </DialogDescription>
                    </DialogHeader>

                    {restoreDialogError && (
                        <div className="text-sm text-red-600 mb-2 px-2">{restoreDialogError}</div>
                    )}

                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={closeRestoreDialog} disabled={restoreDialogLoading}>
                            キャンセル
                        </Button>
                        <Button onClick={performRestore} disabled={restoreDialogLoading}>
                            {restoreDialogLoading ? '復元中…' : '復元'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
