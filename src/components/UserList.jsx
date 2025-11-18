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

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // カウント表示用
    const [counts, setCounts] = useState({ admin: 0, teacher: 0, student: 0, total: 0 });

    // フィルタとソートの状態
    const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'ADMIN' | 'TEACHER' | 'STUDENT'
    const [roleSort, setRoleSort] = useState('NONE'); // 'NONE' | 'ASC' | 'DESC'

    // 非表示ユーザー表示用
    const [hiddenVisible, setHiddenVisible] = useState(false);
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenUsers, setHiddenUsers] = useState([]);
    const [hiddenError, setHiddenError] = useState(null);

    // 現在ログイン中ユーザーのロール（'ADMIN' / 'TEACHER' / 'STUDENT' / null）
    const [currentUserRole, setCurrentUserRole] = useState(null);

    // 汎用 fetch ヘルパー: cookie/session を送るために credentials: 'include' を常に付ける
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

    // レスポンスの内容を安全にパース（JSON でなければテキストを返す）
    const parseResponseBody = async (res) => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    };

    // 権限エラーなどを扱うユーティリティ
    const handleApiError = async (res) => {
        if (res.status === 403) {
            // 明示的に権限エラーを通知
            throw new Error('操作の権限がありません（管理者でログインしているか確認してください）');
        }
        const body = await parseResponseBody(res);
        if (body && typeof body === 'object' && body.message) {
            throw new Error(body.message);
        }
        if (typeof body === 'string' && body.length > 0) {
            throw new Error(body);
        }
        throw new Error('サーバーエラーが発生しました');
    };

    // 現在ログイン中ユーザー情報を取得してロールをセット
    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetchWithCreds('/api/app');
            if (!res.ok) {
                // /api/app は認証が必要なので 401/403 が返る場合は無視して null にする
                return setCurrentUserRole(null);
            }
            const d = await res.json();
            // AppController の AppResponse に current user が入っている想定
            const currentUser = d && d.user ? d.user : null;
            if (currentUser && currentUser.role) {
                setCurrentUserRole(currentUser.role);
            } else {
                setCurrentUserRole(null);
            }
        } catch (err) {
            console.warn('fetchCurrentUserRole error:', err);
            setCurrentUserRole(null);
        }
    };

    // ユーザー一覧を取得
    const fetchUsers = async (query = '') => {
        try {
            setLoading(true);
            const url = query
                ? `/api/users?q=${encodeURIComponent(query)}`
                : '/api/users';

            const response = await fetchWithCreds(url);
            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();
            setUsers(Array.isArray(data) ? data : []);
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
        } catch (err) {
            console.error('fetchCounts error:', err);
        }
    };

    // 非表示ユーザー一覧取得
    const fetchHiddenUsers = async (query = '') => {
        try {
            setHiddenLoading(true);
            const url = query
                ? `/api/users/hidden?q=${encodeURIComponent(query)}`
                : '/api/users/hidden';
            const res = await fetchWithCreds(url);
            if (!res.ok) {
                await handleApiError(res);
            }
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
            await fetchUsers();
            await fetchCounts();
        })();
    }, []);

    // 検索実行
    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(searchQuery);
        fetchCounts();
    };

    // ロール変更 (管理者のみ見える/有効)
    const handleRoleChange = async (userId, newRole) => {
        if (currentUserRole !== 'ADMIN') {
            alert('権限がありません');
            return;
        }
        try {
            const response = await fetchWithCreds(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const updatedUser = await response.json();

            // ユーザーリストを更新
            setUsers(prev =>
                prev.map(user =>
                    user.userId === userId ? updatedUser : user
                )
            );

            // カウントも更新
            await fetchCounts();

            alert('ロールを変更しました');
        } catch (err) {
            alert(err.message);
            // エラー時は再フェッチして状態を復元
            fetchUsers(searchQuery);
            fetchCounts();
        }
    };

    // 非表示フラグ切り替え（サーバー連動）
    const handleHideToggle = async (userId) => {
        // 権限チェック（フロント側）
        if (currentUserRole !== 'ADMIN') {
            alert('この操作は管理者のみ可能です');
            return;
        }

        const target = users.find(u => u.userId === userId) || hiddenUsers.find(u => u.userId === userId);
        if (!target) return;

        const newHidden = !target.hidden;

        if (newHidden) {
            const ok = window.confirm('このユーザーを削除（非表示）しますか？（データは残りますが一覧からは除外されます。再表示可能です。）');
            if (!ok) return;
        } else {
            const ok = window.confirm('このユーザーを一覧に再表示しますか？');
            if (!ok) return;
        }

        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newHidden }),
            });

            if (!res.ok) {
                await handleApiError(res);
            }

            const updatedUser = await res.json();

            // users と hiddenUsers の両方を更新/除外して整合を保つ
            setUsers(prev =>
                prev
                    .map(u => (u.userId === userId ? updatedUser : u))
                    .filter(u => !u.hidden) // 非表示は親リストから除外
            );

            setHiddenUsers(prev => {
                // 更新ユーザーが非表示なら hiddenUsers に入れ、表示なら除外
                if (updatedUser.hidden) {
                    const exists = prev.some(u => u.userId === updatedUser.userId);
                    if (exists) {
                        return prev.map(u => (u.userId === updatedUser.userId ? updatedUser : u));
                    }
                    return [...prev, updatedUser];
                } else {
                    return prev.filter(u => u.userId !== updatedUser.userId);
                }
            });

            // カウントも更新
            await fetchCounts();
        } catch (err) {
            console.error(err);
            alert(err.message || err);
        }
    };

    // 非表示一覧から復元（hidden=false）
    const restoreHiddenUser = async (userId) => {
        if (currentUserRole !== 'ADMIN') {
            alert('この操作は管理者のみ可能です');
            return;
        }

        if (!window.confirm('このユーザーを一覧に再表示しますか？')) return;

        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: false }),
            });
            if (!res.ok) {
                await handleApiError(res);
            }
            await res.json();
// hiddenUsers から除外
            setHiddenUsers(prev => prev.filter(u => u.userId !== userId));

            // メインの一覧を再取得して反映（より確実に整合させる）
            await fetchUsers(searchQuery);
            await fetchCounts();

            alert('ユーザーを表示状態に戻しました');
        } catch (err) {
            console.error(err);
            alert(err.message || '復元に失敗しました');
        }
    };

    // フィルタ・ソート適用済みの表示用配列を作る
    const processedUsers = React.useMemo(() => {
        // 1) hidden=false のユーザーのみ表示
        let list = users.filter(u => !u.hidden);

        // 2) ロールフィルタ
        if (roleFilter && roleFilter !== 'ALL') {
            list = list.filter(u => u.role === roleFilter);
        }

        // 3) ロールによるソート（独自順序: ADMIN > TEACHER > STUDENT）
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
                        <div>合計: <strong>{counts.total}</strong></div>
                    </div>

                    {/* --- 非表示ユーザー表示ボタン（並び替えエリアの上） --- */}
                    {isAdmin && (
                        <div className="mb-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (!hiddenVisible) {
                                        fetchHiddenUsers();
                                    }
                                    setHiddenVisible(prev => !prev);
                                }}
                            >
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
                                                    <td style={{ padding: '6px' }}>{u.role}</td>
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
                    <form
                        onSubmit={handleSearch}
                        className="search-form flex flex-wrap gap-2 items-center mb-4"
                    >
                        <Input
                            type="text"
                            placeholder="名前またはメールアドレスで検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input max-w-xs"
                        />
                        <Button type="submit" className="search-button">
                            検索
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                fetchUsers();
                                fetchCounts();
                            }}
                            className="reset-button"
                        >
                            リセット
                        </Button>

                        {/* ロールで絞り込み */}
                        <div className="ml-4 flex items-center gap-2">
                            <label htmlFor="role-filter" style={{ fontSize: 13 }}>ロール絞込</label>
                            <Select
                                value={roleFilter}
                                onValueChange={(v) => setRoleFilter(v)}
                            >
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
                            <Select
                                value={roleSort}
                                onValueChange={(v) => setRoleSort(v)}
                            >
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
                                                <span>{user.role}</span>
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

                    <div className="user-count mt-4 text-right">
                        表示: {processedUsers.length} / 全体: {counts.total} 人
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default UserList;