/* src/components/UserList.jsx
   ※既存ファイルを丸ごと置き換えてください（上書き） */
import React, { useState, useEffect } from 'react';
// shadcn/ui components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];

// 役割ラベル変換（簡易）
const roleLabel = (role) => {
    if (!role) return '';
    switch (String(role).toUpperCase()) {
        case 'ADMIN': return '管理者';
        case 'TEACHER': return '教員';
        case 'STUDENT': return '学生';
        default: return role;
    }
};

function UserList() {
    // データ
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // ページネーション
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // カウント
    const [counts, setCounts] = useState({ admin: 0, teacher: 0, student: 0, total: 0 });

    // フィルタとソート
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [roleSort, setRoleSort] = useState('NONE');

    // 非表示ユーザー関連
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenUsers, setHiddenUsers] = useState([]);
    const [hiddenError, setHiddenError] = useState(null);

    // ダイアログ制御（非表示ユーザー）
    const [openHiddenDialog, setOpenHiddenDialog] = useState(false);

    // 現在ログイン中ユーザーの role
    const [currentUserRole, setCurrentUserRole] = useState(null);

    // API base (必要なら .env で VITE_API_BASE_URL を設定)
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

    // fetch with credentials helper (API_BASE を考慮して URL を解決、ログ追加)
    const fetchWithCreds = (url, options = {}) => {
        const resolvedUrl = (typeof url === 'string' && url.startsWith('/api') && API_BASE) ? `${API_BASE}${url}` : url;
        const opts = {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                ...options.headers,
            },
            ...options,
        };
        // 開発時のみのデバッグ。不要なら削除可。
        console.debug('[fetchWithCreds] url=', resolvedUrl, 'opts=', opts);
        return fetch(resolvedUrl, opts);
    };

    const parseResponseBody = async (res) => {
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    };

    const handleApiError = async (res) => {
        if (res.status === 403) throw new Error('操作の権限がありません（管理者でログインしているか確認してください）');
        const body = await parseResponseBody(res);
        if (body && typeof body === 'object' && body.message) throw new Error(body.message);
        if (typeof body === 'string' && body.length > 0) throw new Error(body);
        throw new Error('サーバーエラーが発生しました');
    };

    // 現在のログインユーザー情報を取得して role をセット
    // 変更点: ロール情報を返すようにして、呼び出し元で判定できるようにする
    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetchWithCreds('/api/app');
            if (!res.ok) {
                setCurrentUserRole(null);
                return null;
            }
            const d = await res.json();
            const currentUser = d && d.user ? d.user : null;
            const role = currentUser && currentUser.role ? currentUser.role : null;
            if (role) setCurrentUserRole(role);
            else setCurrentUserRole(null);
            return role;
        } catch (err) {
            console.warn('fetchCurrentUserRole error:', err);
            setCurrentUserRole(null);
            return null;
        }
    };

    // ユーザー一覧取得（roleFilter をクエリに含めるように変更）
    const fetchUsers = async (page = 0, size = pageSize, query = '') => {
        try {
            setLoading(true);
            let url = `/api/users?page=${page}&size=${size}`;
            if (query && query.trim() !== '') url += `&q=${encodeURIComponent(query)}`;
            // ここで roleFilter を渡す（サーバーが role クエリを受け付けることを想定）
            if (roleFilter && roleFilter !== 'ALL') url += `&role=${encodeURIComponent(roleFilter)}`;

            console.debug('[fetchUsers] url=', url);
            const res = await fetchWithCreds(url);
            console.debug('[fetchUsers] status=', res.status);
            if (!res.ok) await handleApiError(res);
            const data = await res.json();
            console.debug('[fetchUsers] body=', data);

            // Spring Data Page を想定
            if (data && Array.isArray(data.content)) {
                setUsers(Array.isArray(data.content) ? data.content : []);
                // totalElements / totalPages はサーバーの返却値を優先して使う
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);
                setCurrentPage(data.number || 0);
                setPageSize(data.size || size);
            } else if (Array.isArray(data)) {
                // サーバーが配列で返した場合は配列全体を page=0 として扱う
                setUsers(data);
                setTotalElements(data.length);
                setTotalPages(1);
                setCurrentPage(0);
                setPageSize(size);
            } else {
                // 予期しない形 or 空
                setUsers([]);
                setTotalElements(0);
                setTotalPages(0);
                setCurrentPage(0);
            }
            setError(null);
        } catch (err) {
            console.error('fetchUsers error:', err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    // カウント取得（role オプションを受け取れるように）
    const fetchCounts = async (role = null) => {
        try {
            const url = (role && role !== 'ALL') ? `/api/users/counts?role=${encodeURIComponent(role)}` : '/api/users/counts';
            const res = await fetchWithCreds(url);
            if (!res.ok) {
                await handleApiError(res);
            }
            const d = await res.json();
            setCounts({
                admin: d.admin || 0,
                teacher: d.teacher || 0,
                student: d.student || 0,
                total: d.total || 0,
            });
            return d;
        } catch (err) {
            console.error('fetchCounts error:', err);
            return null;
        }
    };

    // 非表示ユーザー取得（管理者のみ） — レスポンス形を柔軟に扱う、ログを出す
    const fetchHiddenUsers = async (query = '') => {
        try {
            console.debug('[fetchHiddenUsers] start, query=', query);
            setHiddenLoading(true);
            const url = query ? `/api/users/hidden?q=${encodeURIComponent(query)}` : '/api/users/hidden';
            console.debug('[fetchHiddenUsers] fetch url=', url);
            const res = await fetchWithCreds(url);
            console.debug('[fetchHiddenUsers] status=', res.status);
            if (!res.ok) await handleApiError(res);

            const text = await res.text();
            let body;
            try {
                body = text ? JSON.parse(text) : null;
            } catch (e) {
                console.warn('[fetchHiddenUsers] response JSON parse failed, text=', text);
                body = text;
            }
            console.debug('[fetchHiddenUsers] body=', body);

            let usersArray = [];
            if (Array.isArray(body)) {
                usersArray = body;
            } else if (body && Array.isArray(body.content)) {
                usersArray = body.content;
            } else if (body && Array.isArray(body.data)) {
                usersArray = body.data;
            } else if (body && Array.isArray(body.users)) {
                usersArray = body.users;
            } else if (body == null) {
                usersArray = [];
            } else {
                console.warn('[fetchHiddenUsers] unexpected response shape, body=', body);
                usersArray = [];
            }

            setHiddenUsers(usersArray);
            setHiddenError(null);
        } catch (err) {
            console.error('fetchHiddenUsers error:', err);
            setHiddenError(err.message || 'エラーが発生しました');
        } finally {
            setHiddenLoading(false);
        }
    };

    // 初回ロード
    useEffect(() => {
        (async () => {
            setLoading(true);
            const role = await fetchCurrentUserRole();
            // 学生はアクセス不可として、以降のユーザー取得を行わない
            if (role && String(role).toUpperCase() === 'STUDENT') {
                // 学生は一覧取得しない（画面はエラーメッセージを表示）
                setLoading(false);
                setError(null);
                return;
            }
            // 管理者/教員は通常通り取得
            await fetchUsers(0, pageSize);
            await fetchCounts();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // roleFilter が変わったらサーバーに再取得を要求してページをリセット
    useEffect(() => {
        (async () => {
            // 学生は何もしない
            if (currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT') return;

            setCurrentPage(0);
            await fetchUsers(0, pageSize, searchQuery);

            try {
                const d = await fetchCounts(roleFilter);
                if (roleFilter && roleFilter !== 'ALL' && d) {
                    const totalFromCounts = d.total ?? d.count ?? d.filtered ?? null;
                    if (typeof totalFromCounts === 'number') {
                        setTotalElements(totalFromCounts);
                        setTotalPages(Math.max(1, Math.ceil(totalFromCounts / pageSize)));
                    }
                }
            } catch (e) {
                console.warn('roleFilter counts fetch failed:', e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleFilter]);

    // ダイアログが開かれたら非表示ユーザーを取得する
    useEffect(() => {
        if (openHiddenDialog) {
            fetchHiddenUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openHiddenDialog]);

    // 検索フォーム
    const handleSearch = (e) => {
        e.preventDefault();
        if (currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT') {
            // 学生は検索不可（何もしない）
            return;
        }
        fetchUsers(0, pageSize, searchQuery);
        fetchCounts();
    };

    // ロール変更（管理者のみ）
    const handleRoleChange = async (userId, newRole) => {
        if (currentUserRole !== 'ADMIN') { alert('権限がありません'); return; }
        try {
            const res = await fetchWithCreds(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) { await handleApiError(res); }
            await res.json();
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ロールを変更しました');
        } catch (err) {
            alert(err.message || err);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
        }
    };

    // 非表示切替（管理者のみ）
    const handleHideToggle = async (userId) => {
        if (currentUserRole !== 'ADMIN') { alert('この操作は管理者のみ可能です'); return; }
        const target = users.find(u => (u.userId ?? u.id ?? u.user_id) === userId) || hiddenUsers.find(u => (u.userId ?? u.id ?? u.user_id) === userId);
        if (!target) return;
        const newHidden = !Boolean(target.hidden);
        if (newHidden) {
            if (!window.confirm('このユーザーを削除（非表示）しますか？')) return;
        } else {
            if (!window.confirm('このユーザーを一括に再表示しますか？')) return;
        }
        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newHidden })
            });
            if (!res.ok) await handleApiError(res);
            await res.json();
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
        } catch (err) {
            console.error(err);
            alert(err.message || err);
        }
    };

    // 非表示からの復元（管理者のみ）
    const restoreHiddenUser = async (rawIdOrUser) => {
        const userId = (typeof rawIdOrUser === 'string' || typeof rawIdOrUser === 'number')
            ? rawIdOrUser
            : (rawIdOrUser?.userId ?? rawIdOrUser?.id ?? rawIdOrUser?.user_id);

        if (!userId) { alert('ユーザーIDが取得できませんでした'); return; }
        if (currentUserRole !== 'ADMIN') { alert('この操作は管理者のみ可能です'); return; }
        if (!window.confirm('このユーザーを表示状態に戻しますか？')) return;

        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: false })
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);
            setHiddenUsers(prev => prev.filter(u => {
                const uid = u?.userId ?? u?.id ?? u?.user_id;
                return String(uid) !== String(userId);
            }));
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ユーザーを表示状態に戻しました');
        } catch (err) {
            console.error('restoreHiddenUser error:', err);
            alert('復元に失敗しました: ' + (err.message || ''));
        }
    };

    // ページ移動
    const goToPage = (page) => {
        if (page < 0 || (totalPages > 0 && page >= totalPages)) return;
        setCurrentPage(page);
        fetchUsers(page, pageSize, searchQuery);
    };

    // テーブル表示用にフィルタ／ソートを適用
    const processedUsers = React.useMemo(() => {
        let list = users.filter(u => !u.hidden && !Boolean(u.hidden));

        if (roleFilter && roleFilter !== 'ALL') {
            list = list.filter(u => u.role === roleFilter);
        }

        if (roleSort !== 'NONE') {
            list = [...list].sort((a, b) => {
                const ia = ROLE_ORDER.indexOf((a.role || '').toUpperCase());
                const ib = ROLE_ORDER.indexOf((b.role || '').toUpperCase());
                const aIndex = ia === -1 ? 99 : ia;
                const bIndex = ib === -1 ? 99 : ib;
                return roleSort === 'ASC' ? aIndex - bIndex : bIndex - aIndex;
            });
        }

        return list;
    }, [users, roleFilter, roleSort]);

    const isAdmin = currentUserRole === 'ADMIN';
    const isStudent = currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT';

    if (loading) {
        return (
            <div className="user-list-container">
                <Card>
                    <CardContent className="py-6">
                        <p className="loading">読み込み中...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 学生はこの画面の機能を利用できない旨のメッセージを表示（要望の文言に合わせました）
    if (isStudent) {
        return (
            <div className="user-list-container">
                <Card>
                    <CardHeader>
                        <CardTitle>ユーザー一覧</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTitle>エラー</AlertTitle>
                            <AlertDescription>学生はこの機能を使用することはできません</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-list-container">
                <Alert variant="destructive">
                    <AlertTitle>エラー</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // ページ番号ボタン表示
    const renderPageButtons = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        const windowSize = 5;
        const half = Math.floor(windowSize / 2);
        let start = Math.max(0, currentPage - half);
        let end = Math.min(totalPages - 1, currentPage + half);
        if (currentPage - start < half) {
            end = Math.min(totalPages - 1, end + (half - (currentPage - start)));
        }
        if (end - currentPage < half) {
            start = Math.max(0, start - (half - (end - currentPage)));
        }

        for (let i = start; i <= end; i++) {
            buttons.push(
                <Button
                    key={i}
                    variant={i === currentPage ? undefined : 'outline'}
                    onClick={() => goToPage(i)}
                >
                    {i + 1}
                </Button>
            );
        }
        return buttons;
    };

    return (
        <div className="user-list-container">
            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                </CardHeader>

                <CardContent>
                    {/* カウント表示 */}
                    <div className="mb-4 flex gap-4 items-center text-sm">
                        <div>管理者: <strong>{counts.admin}</strong></div>
                        <div>教員: <strong>{counts.teacher}</strong></div>
                        <div>学生: <strong>{counts.student}</strong></div>
                        <div>合計: <strong>{totalElements}</strong></div>
                    </div>

                    {/* 非表示ユーザーはダイアログで表示（管理者のみ） */}
                    {isAdmin && (
                        <div className="mb-4">
                            <Dialog open={openHiddenDialog} onOpenChange={setOpenHiddenDialog}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setOpenHiddenDialog(true);
                                            fetchHiddenUsers();
                                        }}
                                    >
                                        非表示ユーザーを表示{hiddenUsers && hiddenUsers.length ? ` (${hiddenUsers.length}件)` : ''}
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>
                                            非表示ユーザー{hiddenUsers ? `（${hiddenUsers.length}件）` : ''}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs">
                                            非表示になっているユーザーの一覧です。復元したいユーザーを選択してください。
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="mt-2">
                                        {hiddenLoading && (
                                            <div className="py-4 text-sm text-slate-500">読み込み中...</div>
                                        )}

                                        {hiddenError && (
                                            <div className="py-2 text-sm text-red-600">{hiddenError}</div>
                                        )}

                                        {!hiddenLoading && !hiddenError && (
                                            <>
                                                {hiddenUsers.length === 0 ? (
                                                    <div className="text-sm text-slate-500">
                                                        非表示ユーザーは存在しません。
                                                    </div>
                                                ) : (
                                                    <div className="overflow-auto max-h-[60vh]">
                                                        <table className="w-full border-collapse">
                                                            <thead>
                                                            <tr className="text-left text-xs text-slate-600">
                                                                <th className="py-2 px-3">ID</th>
                                                                <th className="py-2 px-3">名前</th>
                                                                <th className="py-2 px-3">メール</th>
                                                                <th className="py-2 px-3">役割</th>
                                                                <th className="py-2 px-3">作成日時</th>
                                                                <th className="py-2 px-3">操作</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {hiddenUsers.map((u, idx) => {
                                                                const uid = u?.userId ?? u?.id ?? u?.user_id ?? `hidden-${idx}`;
                                                                const name = u?.userName ?? u?.name ?? u?.fullName ?? '';
                                                                const created = u?.createdAt ?? u?.created_at ?? '';
                                                                return (
                                                                    <tr key={uid} className="border-t">
                                                                        <td className="py-2 px-3 align-top">{uid}</td>
                                                                        <td className="py-2 px-3 align-top">{name}</td>
                                                                        <td className="py-2 px-3 align-top">{u?.email ?? ''}</td>
                                                                        <td className="py-2 px-3 align-top">
                                                                            <span className="whitespace-nowrap">{roleLabel(u?.role)}</span>
                                                                        </td>
                                                                        <td className="py-2 px-3 align-top">
                                                                            {created ? new Date(created).toLocaleString('ja-JP') : ''}
                                                                        </td>
                                                                        <td className="py-2 px-3 align-top">
                                                                            <Button size="sm" onClick={() => restoreHiddenUser(uid)}>
                                                                                復元
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
                                    </div>

                                    <DialogFooter className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline" onClick={() => setOpenHiddenDialog(false)}>
                                            閉じる
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}

                    {/* 検索フォーム */}
                    <form onSubmit={handleSearch} className="search-form flex flex-wrap gap-2 items-center mb-4">
                        <Input
                            type="text"
                            placeholder="名前またはメールアドレスで検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input max-w-xs"
                        />
                        <Button type="submit" className="search-button">検索</Button>
                        <Button type="button" variant="outline" onClick={() => { setSearchQuery(''); fetchUsers(0, pageSize); fetchCounts(); }} className="reset-button">
                            リセット
                        </Button>

                        <div className="ml-4 flex items-center gap-2">
                            <label htmlFor="role-filter" style={{ fontSize: 13 }}>ロール絞込</label>
                            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
                                <SelectTrigger id="role-filter" className="w-[160px]">
                                    <SelectValue placeholder="すべて" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">すべて</SelectItem>
                                    <SelectItem value="ADMIN">管理者</SelectItem>
                                    <SelectItem value="TEACHER">教員</SelectItem>
                                    <SelectItem value="STUDENT">学生</SelectItem>
                                </SelectContent>
                            </Select>

                            <label htmlFor="role-sort" style={{ fontSize: 13 }}>並び替え</label>
                            <Select value={roleSort} onValueChange={(v) => setRoleSort(v)}>
                                <SelectTrigger id="role-sort" className="w-[160px]">
                                    <SelectValue placeholder="並び替え" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">なし</SelectItem>
                                    <SelectItem value="ASC">管理者→教員→学生</SelectItem>
                                    <SelectItem value="DESC">学生→教員→管理者</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>

                    {/* 一覧テーブル */}
                    <Table className="user-table">
                        <TableHeader>
                            <TableRow>
                                {isAdmin && <TableHead>ID</TableHead>}
                                <TableHead>ユーザー名</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>権限</TableHead>
                                <TableHead>作成日時</TableHead>
                                {isAdmin && <TableHead>操作</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 6 : 4} className="no-data text-center">ユーザーが見つかりません</TableCell>
                                </TableRow>
                            ) : (
                                processedUsers.map((user, idx) => {
                                    const uid = user?.userId ?? user?.id ?? user?.user_id ?? `u-${idx}`;
                                    const name = user?.userName ?? user?.name ?? user?.fullName ?? '';
                                    const created = user?.createdAt ?? user?.created_at ?? '';
                                    return (
                                        <TableRow key={uid}>
                                            {isAdmin && <TableCell>{uid}</TableCell>}
                                            <TableCell>{name}</TableCell>
                                            <TableCell>{user?.email ?? ''}</TableCell>
                                            <TableCell>
                                                {isAdmin ? (
                                                    <Select
                                                        value={user.role}
                                                        onValueChange={(value) =>
                                                            handleRoleChange(uid, value)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-[140px] role-select">
                                                            <SelectValue placeholder="ロールを選択" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ADMIN">管理者</SelectItem>
                                                            <SelectItem value="TEACHER">教員</SelectItem>
                                                            <SelectItem value="STUDENT">学生</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <span className="whitespace-nowrap">{roleLabel(user.role)}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{created ? new Date(created).toLocaleString('ja-JP') : ''}</TableCell>
                                            {isAdmin && (
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {isAdmin ? (
                                                            <Button variant="destructive" onClick={() => handleHideToggle(uid)}>
                                                                {user.hidden ? '表示' : '削除'}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* ページネーション */}
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <Button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 0}>前へ</Button>
                        <div className="flex items-center gap-2">
                            {renderPageButtons()}
                        </div>
                        <Button onClick={() => goToPage(currentPage + 1)} disabled={totalPages === 0 || currentPage >= totalPages - 1}>次へ</Button>

                        <div className="ml-4 flex items-center gap-2">
                            <label style={{ fontSize: 13 }}>表示数</label>
                            <Select value={String(pageSize)} onValueChange={(v) => {
                                const newSize = parseInt(v, 10);
                                setPageSize(newSize);
                                fetchUsers(0, newSize, searchQuery);
                            }}>
                                <SelectTrigger className="w-[90px]">
                                    <SelectValue placeholder={`${pageSize}件`} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="user-count mt-4 text-right">表示: {processedUsers.length} / 全体: {totalElements} 人</div>
                </CardContent>
            </Card>
        </div>
    );
}

export default UserList;