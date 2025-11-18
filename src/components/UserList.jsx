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

const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];

// 役割を日本語ラベルに変換するユーティリティ
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

    // カウント表示
    const [counts, setCounts] = useState({ admin: 0, teacher: 0, student: 0, total: 0 });

    // フィルタとソート
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [roleSort, setRoleSort] = useState('NONE');

    // 非表示ユーザーパネル
    const [hiddenVisible, setHiddenVisible] = useState(false);
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenUsers, setHiddenUsers] = useState([]);
    const [hiddenError, setHiddenError] = useState(null);

    // 現在ログイン中ユーザーのロール
    const [currentUserRole, setCurrentUserRole] = useState(null);

    // 汎用 fetch (cookie を送る)
    const fetchWithCreds = (url, options = {}) => {
        const opts = {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                ...options.headers,
            },
            ...options,
        };
        return fetch(url, opts);
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
    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetchWithCreds('/api/app');
            if (!res.ok) {
                setCurrentUserRole(null);
                return;
            }
            const d = await res.json();
            const currentUser = d && d.user ? d.user : null;
            if (currentUser && currentUser.role) setCurrentUserRole(currentUser.role);
            else setCurrentUserRole(null);
        } catch (err) {
            console.warn('fetchCurrentUserRole error:', err);
            setCurrentUserRole(null);
        }
    };

    // ページ指定でユーザーを取得する (サーバー側ページ対応)
    const fetchUsers = async (page = 0, size = pageSize, query = '') => {
        try {
            setLoading(true);
            let url = `/api/users?page=${page}&size=${size}`;
            if (query && query.trim() !== '') url += `&q=${encodeURIComponent(query)}`;

            const res = await fetchWithCreds(url);
            if (!res.ok) await handleApiError(res);
            const data = await res.json();

            // Spring Data Page の JSON を想定: content, totalElements, totalPages, number, size
            if (data && Array.isArray(data.content)) {
                setUsers(Array.isArray(data.content) ? data.content : []);
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);
                setCurrentPage(data.number || 0);
                setPageSize(data.size || size);
            } else if (Array.isArray(data)) {
                // 互換性: 古い配列応答に対応
                setUsers(data);
                setTotalElements(data.length);
                setTotalPages(1);
                setCurrentPage(0);
                setPageSize(size);
            } else {
                setUsers([]);
                setTotalElements(0);
                setTotalPages(0);
                setCurrentPage(0);
            }
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // カウント取得
    const fetchCounts = async () => {
        try {
            const res = await fetchWithCreds('/api/users/counts');
            if (!res.ok) await handleApiError(res);
            const d = await res.json();
            setCounts({
                admin: d.admin || 0,
                teacher: d.teacher || 0,
                student: d.student || 0,
                total: d.total || 0,
            });
        } catch (err) {
            console.error('fetchCounts error:', err);
        }
    };

    // 非表示ユーザー一覧取得（管理者のみ）
    const fetchHiddenUsers = async (query = '') => {
        try {
            setHiddenLoading(true);
            const url = query ? `/api/users/hidden?q=${encodeURIComponent(query)}` : '/api/users/hidden';
            const res = await fetchWithCreds(url);
            if (!res.ok) await handleApiError(res);
            const d = await res.json();
            setHiddenUsers(Array.isArray(d) ? d : []);
            setHiddenError(null);
        } catch (err) {
            console.error('fetchHiddenUsers error:', err);
            setHiddenError(err.message || 'エラーが発生しました');
        } finally {
            setHiddenLoading(false);
        }
    };

    // 初回読み込み
    useEffect(() => {
        (async () => {
            await fetchCurrentUserRole();
            await fetchUsers(0, pageSize);
            await fetchCounts();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 検索 (先頭ページへ)
    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(0, pageSize, searchQuery);
        fetchCounts();
    };

    // ロール変更 (管理者のみ)
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
            // 現在ページを再読み込み
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ロールを変更しました');
        } catch (err) {
            alert(err.message || err);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
        }
    };

    // 非表示切替 (管理者のみ)
    const handleHideToggle = async (userId) => {
        if (currentUserRole !== 'ADMIN') { alert('この操作は管理者のみ可能です'); return; }
        const target = users.find(u => u.userId === userId) || hiddenUsers.find(u => u.userId === userId);
        if (!target) return;
        const newHidden = !target.hidden;
        if (newHidden) {
            if (!window.confirm('このユーザーを削除（非表示）しますか？')) return;
        } else {
            if (!window.confirm('このユーザーを一覧に再表示しますか？')) return;
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

    // 非表示一覧から復元
    const restoreHiddenUser = async (userId) => {
        if (currentUserRole !== 'ADMIN') { alert('この操作は管理者のみ可能です'); return; }
        if (!window.confirm('このユーザーを一覧に再表示しますか？')) return;
        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: false })
            });
            if (!res.ok) await handleApiError(res);
            await res.json();
            setHiddenUsers(prev => prev.filter(u => u.userId !== userId));
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ユーザーを表示状態に戻しました');
        } catch (err) {
            console.error(err);
            alert(err.message || '復元に失敗しました');
        }
    };

    // ページ移動
    const goToPage = (page) => {
        if (page < 0 || (totalPages > 0 && page >= totalPages)) return;
        fetchUsers(page, pageSize, searchQuery);
    };

    // クライアント側の追加フィルタ/ソート（ページ内で適用）
    const processedUsers = React.useMemo(() => {
        let list = users.filter(u => !u.hidden);

        if (roleFilter && roleFilter !== 'ALL') {
            list = list.filter(u => u.role === roleFilter);
        }

        if (roleSort !== 'NONE') {
            list = [...list].sort((a, b) => {
                const ia = ROLE_ORDER.indexOf(a.role || '');
                const ib = ROLE_ORDER.indexOf(b.role || '');
                const aIndex = ia === -1 ? 99 : ia;
                const bIndex = ib === -1 ? 99 : ib;
                return roleSort === 'ASC' ? aIndex - bIndex : bIndex - aIndex;
            });
        }

        return list;
    }, [users, roleFilter, roleSort]);

    const isAdmin = currentUserRole === 'ADMIN';

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

    // ページ番号表示用 (最大表示数を制限して表示)
    const renderPageButtons = () => {
        if (totalPages <= 1) return null;
        const buttons = [];
        const windowSize = 5; // 表示するボタン数 (現在ページの前後)
        const half = Math.floor(windowSize / 2);
        let start = Math.max(0, currentPage - half);
        let end = Math.min(totalPages - 1, currentPage + half);
        // adjust when near edges
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

                    {/* 非表示ユーザー表示ボタン */}
                    {isAdmin && (
                        <div className="mb-4">
                            <Button variant="outline" onClick={() => { if (!hiddenVisible) fetchHiddenUsers(); setHiddenVisible(prev => !prev); }}>
                                {hiddenVisible ? '非表示ユーザーを閉じる' : '非表示ユーザーを表示'}
                            </Button>
                        </div>
                    )}

                    {/* 非表示ユーザー一覧パネル */}
                    {hiddenVisible && isAdmin && (
                        <div style={{ border: '1px solid #e6e6e6', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                            {hiddenLoading && <div>読み込み中...</div>}
                            {hiddenError && <div style={{ color: 'red' }}>{hiddenError}</div>}
                            {!hiddenLoading && !hiddenError && (
                                <>
                                    {hiddenUsers.length === 0 ? (
                                        <div>非表示ユーザーは存在しません。</div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '6px' }}>ID</th>
                                                <th style={{ textAlign: 'left', padding: '6px' }}>名前</th>
                                                <th style={{ textAlign: 'left', padding: '6px' }}>メール</th>
                                                <th style={{ textAlign: 'left', padding: '6px' }}>役割</th>
                                                <th style={{ textAlign: 'left', padding: '6px' }}>作成日</th>
                                                <th style={{ padding: '6px' }}>操作</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {hiddenUsers.map(u => (
                                                <tr key={u.userId} style={{ borderTop: '1px solid #eee' }}>
                                                    <td style={{ padding: '6px' }}>{u.userId}</td>
                                                    <td style={{ padding: '6px' }}>{u.userName}</td>
                                                    <td style={{ padding: '6px' }}>{u.email}</td>
                                                    <td style={{ padding: '6px' }}>{roleLabel(u.role)}</td>
                                                    <td style={{ padding: '6px' }}>{u.createdAt ? new Date(u.createdAt).toLocaleString('ja-JP') : ''}</td>
                                                    <td style={{ padding: '6px' }}>
                                                        <Button onClick={() => restoreHiddenUser(u.userId)}>復元</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
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
                        <Button type="button" variant="outline" onClick={() => { setSearchQuery(''); fetchUsers(0, pageSize); fetchCounts(); }} className="reset-button">リセット</Button>

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

                    {/* ユーザー一覧テーブル */}
                    <Table className="user-table">
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>ユーザー名</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>ロール</TableHead>
                                <TableHead>作成日時</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="no-data text-center">
                                        ユーザーが見つかりません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                processedUsers.map((user) => (
                                    <TableRow key={user.userId}>
                                        <TableCell>{user.userId}</TableCell>
                                        <TableCell>{user.userName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {isAdmin ? (
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(value) =>
                                                        handleRoleChange(user.userId, value)
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
                                                <span>{roleLabel(user.role)}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleString('ja-JP')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {/* 削除（実際は hidden=true）: 管理者のみ表示 */}
                                                {isAdmin ? (
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleHideToggle(user.userId)}
                                                    >
                                                        {user.hidden ? '表示' : '削除'}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
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

                        {/* ページサイズ選択 */}
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

                    <div className="user-count mt-4 text-right">
                        表示: {processedUsers.length} / 全体: {totalElements} 人
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default UserList;