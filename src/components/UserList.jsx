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

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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
            setUsers(data);
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
            // エラー時は元に戻す
            fetchUsers(searchQuery);
        }
    };

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="no-data text-center">
                    ユーザーが見つかりません
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="user-count mt-4 text-right">
            合計: {users.length}人
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserList;