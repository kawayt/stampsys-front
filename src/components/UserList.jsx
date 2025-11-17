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

    // ユーザー一覧を取得
    const fetchUsers = async (query = '') => {
        try {
            setLoading(true);
            const url = query
                ? `/api/users?q=${encodeURIComponent(query)}`
                : '/api/users';

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('ユーザー一覧の取得に失敗しました');
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
            const res = await fetch('/api/users/counts');
            if (!res.ok) throw new Error('ユーザー数の取得に失敗しました');
            const d = await res.json();
            setCounts({
                admin: d.admin || 0,
                teacher: d.teacher || 0,
                student: d.student || 0,
                total: d.total || 0,
            });
        } catch (err) {
            console.error(err);
        }
    };

    // 初回読み込み
    useEffect(() => {
        (async () => {
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

    // ロール変更
    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'ロールの変更に失敗しました');
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
        const target = users.find(u => u.userId === userId);
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
            const res = await fetch(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newHidden }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || '非表示状態の更新に失敗しました');
            }

            const updatedUser = await res.json();

            setUsers(prev =>
                prev.map(u => (u.userId === userId ? updatedUser : u))
            );

            // カウントも更新
            await fetchCounts();
        } catch (err) {
            console.error(err);
            alert(err.message || err);
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
                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    <SelectItem value="TEACHER">TEACHER</SelectItem>
                                    <SelectItem value="STUDENT">STUDENT</SelectItem>
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
                                    <SelectItem value="ASC">ロール昇順 (ADMIN→STUDENT)</SelectItem>
                                    <SelectItem value="DESC">ロール降順 (STUDENT→ADMIN)</SelectItem>
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
                                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                                    <SelectItem value="TEACHER">TEACHER</SelectItem>
                                                    <SelectItem value="STUDENT">STUDENT</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleString('ja-JP')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {/* 削除（実際は hidden=true）: ボタンは赤（destructive）表示に */}
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleHideToggle(user.userId)}
                                                >
                                                    {user.hidden ? '表示' : '削除'}
                                                </Button>
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