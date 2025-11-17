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

function loadHiddenIds() {
    try {
        const raw = localStorage.getItem('hiddenUserIds');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
function saveHiddenIds(ids) {
    localStorage.setItem('hiddenUserIds', JSON.stringify(ids));
}

const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [hiddenIds, setHiddenIds] = useState(loadHiddenIds());

    // 新規: フィルタとソートの状態
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

    // 初回読み込み
    useEffect(() => {
        fetchUsers();
    }, []);

    // hiddenIds を localStorage に保存
    useEffect(() => {
        saveHiddenIds(hiddenIds);
    }, [hiddenIds]);

    // 検索実行
    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(searchQuery);
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
            setUsers(users.map(user =>
                user.userId === userId ? updatedUser : user
            ));

            alert('ロールを変更しました');
        } catch (err) {
            alert(err.message);
            // エラー時は再フェッチして状態を復元
            fetchUsers(searchQuery);
        }
    };

    // サーバー削除を試行。失敗したらクライアント側非表示にする選択を提示。
    const handleDelete = async (userId) => {
        if (!window.confirm('本当にこのユーザーを削除しますか？（元に戻せません）')) return;

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || '削除に失敗しました');
            }

            // 成功したら一覧から削除
            setUsers(prev => prev.filter(u => u.userId !== userId));
            // hiddenIds に残っていれば消す
            setHiddenIds(prev => prev.filter(id => id !== userId));
            alert('ユーザーを削除しました');
        } catch (err) {
            console.error(err);
            const doHide = window.confirm('サーバー側の削除に失敗しました。クライアント上で非表示にしますか？（復元可能）');
            if (doHide) {
                setHiddenIds(prev => prev.includes(userId) ? prev : [...prev, userId]);
            } else {
                alert('削除に失敗しました: ' + (err.message || err));
            }
        }
    };

    const handleHideToggle = (userId) => {
        setHiddenIds(prev => {
            const exists = prev.includes(userId);
            return exists ? prev.filter(id => id !== userId) : [...prev, userId];
        });
    };

    // 新規: フィルタ・ソート適用済みの表示用配列を作る
    const processedUsers = React.useMemo(() => {
        // 1) クライアント非表示分を除く
        let list = users.filter(u => !hiddenIds.includes(u.userId));

        // 2) ロールフィルタ
        if (roleFilter && roleFilter !== 'ALL') {
            list = list.filter(u => u.role === roleFilter);
        }

        // 3) 検索は既にサーバー側クエリか client-side search not applied here
        // （現状はサーバーへ検索クエリを送る方式のため、ここでは追加の名前検索は行わない）

        // 4) ロールによるソート（独自順序: ADMIN > TEACHER > STUDENT）
        if (roleSort !== 'NONE') {
            list = [...list].sort((a, b) => {
                const ia = ROLE_ORDER.indexOf(a.role || '');
                const ib = ROLE_ORDER.indexOf(b.role || '');
                const diff = (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                return roleSort === 'ASC' ? diff : -diff;
            });
        }

        return list;
    }, [users, hiddenIds, roleFilter, roleSort]);

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
                            }}
                            className="reset-button"
                        >
                            リセット
                        </Button>

                        {/* 新規: ロールで絞り込み */}
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
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleDelete(user.userId)}
                                                >
                                                    削除
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleHideToggle(user.userId)}
                                                >
                                                    非表示
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="user-count mt-4 text-right">
                        表示: {processedUsers.length} / 全体: {users.length} 人
                    </div>

                    {/* 非表示ユーザーの管理 */}
                    {hiddenIds.length > 0 && (
                        <div className="hidden-section mt-6">
                            <h4 className="mb-2">非表示中のユーザー（クライアント側）</h4>
                            <div className="flex gap-2 flex-wrap items-center mb-2">
                                {hiddenIds.map((id) => (
                                    <div key={id} className="px-3 py-1 border rounded flex items-center gap-2">
                                        <span>{id}</span>
                                        <Button size="sm" onClick={() => handleHideToggle(id)}>復元</Button>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <Button variant="ghost" onClick={() => setHiddenIds([])}>すべて復元</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default UserList;