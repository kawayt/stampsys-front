import React, { useState, useEffect, useRef } from 'react';
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
import { restoreHiddenUser } from '@/api/user.js';

const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];
const CARD_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];

// 役割ラベル変換（簡易）
const roleLabel = (role) => {
    if (!role) return '';
    switch (String(role).toUpperCase()) {
        case 'ADMIN':
            return '管理者';
        case 'TEACHER':
            return '教員';
        case 'STUDENT':
            return '学生';
        default:
            return role;
    }
};

// RoleIcon — inline SVGs (no external dependency)
function RoleIcon({ role, className = 'h-4 w-4', ariaHidden = true }) {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={className + ' text-red-600'}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden={ariaHidden}
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l8 4v6c0 5-3.9 9.4-8 10-4.1-.6-8-5-8-10V6l8-4z" />
            </svg>
        );
    }
    if (r === 'TEACHER') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={className + ' text-blue-600'}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden={ariaHidden}
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v7" />
            </svg>
        );
    }
    // default STUDENT
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className={className + ' text-green-600'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden={ariaHidden}
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

// カウントカードコンポーネント（クリックで絞り込み）
function CountCard({ title, count, colorClass = 'bg-gray-50', icon, active = false, onClick, innerRef = null }) {
    // icon may be a function returning JSX or JSX element
    const iconNode = typeof icon === 'function' ? icon(false) : icon;
    return (
        <button
            type="button"
            onClick={onClick}
            ref={innerRef}
            className={`flex-1 min-w-[160px] transition rounded-lg ${active ? 'ring-2 ring-offset-2 ring-indigo-200' : ''} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400`}
            aria-pressed={active}
            aria-label={`${title} を絞り込む`}
        >
            <div className={`flex items-center gap-4 rounded-lg ${active ? 'bg-indigo-50 border border-indigo-200 text-slate-900' : 'bg-white'} p-4 shadow-sm hover:shadow-md transition`}>
                <div className={`${colorClass} shrink-0 rounded-md p-3 flex items-center justify-center`} aria-hidden="true">
                    {iconNode}
                </div>
                <div className="flex flex-col text-left">
                    <div className={`text-xs ${active ? 'font-semibold' : 'text-slate-500'}`}>
                        {title}
                        {active && <span className="sr-only">、選択中</span>}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-800">
                        {count}人
                    </div>
                </div>
            </div>
        </button>
    );
}

function renderPageButtons(currentPage, totalPages, goToPage) {
    if (!totalPages || totalPages <= 1) return null;
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
            <Button key={i} variant={i === currentPage ? undefined : 'outline'} onClick={() => goToPage(i)} aria-label={`ページ ${i + 1} を表示`}>
                {i + 1}
            </Button>
        );
    }
    return buttons;
}

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [counts, setCounts] = useState({ admin: 0, teacher: 0, student: 0, total: 0 });

    const [roleFilter, setRoleFilter] = useState('ALL');
    const [roleSort] = useState('NONE');

    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenUsers, setHiddenUsers] = useState([]);
    const [hiddenError, setHiddenError] = useState(null);

    const [openHiddenDialog, setOpenHiddenDialog] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(null);

    const cardRefs = useRef([]);

    // --- NEW: restoring state for restore button (prevents double click) ---
    const [restoringId, setRestoringId] = useState(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

    const fetchWithCreds = (url, options = {}) => {
        const resolvedUrl = (typeof url === 'string' && url.startsWith('/api') && API_BASE) ? `${API_BASE}${url}` : url;
        const opts = { credentials: 'include', headers: { Accept: 'application/json', ...options.headers }, ...options };
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

    // keyboard nav for cards
    const focusCard = (index) => {
        const el = cardRefs.current && cardRefs.current[index];
        if (el && typeof el.focus === 'function') el.focus();
    };
    const handleCardKeyDown = (e) => {
        const key = e.key;
        const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(key)) return;
        const active = document.activeElement;
        const idx = cardRefs.current ? cardRefs.current.findIndex((c) => c === active) : -1;
        if (idx === -1) return;
        let next = idx;
        const len = CARD_ROLES.length;
        if (key === 'ArrowRight' || key === 'ArrowDown') next = (idx + 1) % len;
        else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (idx - 1 + len) % len;
        else if (key === 'Home') next = 0;
        else if (key === 'End') next = len - 1;
        e.preventDefault();
        focusCard(next);
    };

    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetchWithCreds('/api/app');
            if (!res.ok) { setCurrentUserRole(null); return null; }
            const d = await res.json();
            const role = d?.user?.role ?? null;
            setCurrentUserRole(role || null);
            return role;
        } catch (err) {
            console.warn('fetchCurrentUserRole error:', err);
            setCurrentUserRole(null);
            return null;
        }
    };

    const fetchUsers = async (page = 0, size = pageSize, query = '') => {
        try {
            setLoading(true);
            let url = `/api/users?page=${page}&size=${size}`;
            if (query && query.trim() !== '') url += `&q=${encodeURIComponent(query)}`;
            if (roleFilter && roleFilter !== 'ALL') url += `&role=${encodeURIComponent(roleFilter)}`;
            const res = await fetchWithCreds(url);
            if (!res.ok) await handleApiError(res);
            const data = await res.json();
            if (data && Array.isArray(data.content)) {
                setUsers(data.content);
                setTotalElements(data.totalElements || 0);
                setTotalPages(data.totalPages || 0);
                setCurrentPage(data.number || 0);
                setPageSize(data.size || size);
            } else if (Array.isArray(data)) {
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
        } catch (err) {
            console.error('fetchUsers error:', err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        try {
            const res = await fetchWithCreds('/api/users/counts');
            if (!res.ok) await handleApiError(res);
            const d = await res.json();
            setCounts({ admin: d.admin || 0, teacher: d.teacher || 0, student: d.student || 0, total: d.total || 0 });
            return d;
        } catch (err) {
            console.error('fetchCounts error:', err);
            return null;
        }
    };

    const fetchHiddenUsers = async (query = '') => {
        try {
            setHiddenLoading(true);
            const url = query ? `/api/users/hidden?q=${encodeURIComponent(query)}` : '/api/users/hidden';
            const res = await fetchWithCreds(url);
            if (!res.ok) await handleApiError(res);
            const text = await res.text();
            let body;
            try { body = text ? JSON.parse(text) : null; } catch { body = text; }
            let usersArray = [];
            if (Array.isArray(body)) usersArray = body;
            else if (body && Array.isArray(body.content)) usersArray = body.content;
            else if (body && Array.isArray(body.data)) usersArray = body.data;
            else if (body && Array.isArray(body.users)) usersArray = body.users;
            else usersArray = [];
            setHiddenUsers(usersArray);
            setHiddenError(null);
        } catch (err) {
            console.error('fetchHiddenUsers error:', err);
            setHiddenError(err.message || 'エラーが発生しました');
        } finally {
            setHiddenLoading(false);
        }
    };

    useEffect(() => {
        cardRefs.current = cardRefs.current.slice(0, CARD_ROLES.length);
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const role = await fetchCurrentUserRole();
            if (role && String(role).toUpperCase() === 'STUDENT') { setLoading(false); setError(null); return; }
            await fetchUsers(0, pageSize);
            await fetchCounts();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        (async () => {
            if (currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT') return;
            setCurrentPage(0);
            await fetchUsers(0, pageSize, searchQuery);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT') return;
        fetchUsers(0, pageSize, searchQuery);
    };

    const handleRoleChange = async (userId, newRole) => {
        if (currentUserRole !== 'ADMIN') { alert('権限がありません'); return; }
        try {
            const res = await fetchWithCreds(`/api/users/${userId}/role`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ロールを変更しました');
        } catch (err) {
            alert(err.message || err);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
        }
    };

    const handleHideToggle = async (userId) => {
        if (currentUserRole !== 'ADMIN') { alert('この操作は管理者のみ可能です'); return; }
        const target = users.find(u => (u.userId ?? u.id ?? u.user_id) === userId) || hiddenUsers.find(u => (u.userId ?? u.id ?? u.user_id) === userId);
        if (!target) return;
        const newHidden = !target.hidden;
        if (newHidden) {
            if (!window.confirm('このユーザーを削除（非表示）しますか？')) return;
        } else {
            if (!window.confirm('このユーザーを一括に再表示しますか？')) return;
        }
        try {
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: newHidden })
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
        } catch (err) {
            console.error(err);
            alert(err.message || err);
        }
    };

    // --- UPDATED: more robust restore with parsing and button disabling ---
    const restoreHiddenUserLocal = async (rawIdOrUser) => {
        // normalize id to string early
        const rawId = (typeof rawIdOrUser === 'string' || typeof rawIdOrUser === 'number')
            ? rawIdOrUser
            : (rawIdOrUser?.userId ?? rawIdOrUser?.id ?? rawIdOrUser?.user_id);

        if (!rawId) {
            alert('ユーザーIDが取得できませんでした');
            return;
        }

        const userIdStr = String(rawId);

        // If id is our local placeholder like 'hidden-0', do not send to server
        if (/^hidden-\d+$/i.test(userIdStr)) {
            alert('このユーザーはサーバー上で復元できないローカル項目です（ID が不正です）。サーバーのデータを確認してください。');
            return;
        }

        if (currentUserRole !== 'ADMIN') {
            alert('この操作は管理者のみ可能です');
            return;
        }

        if (!window.confirm('このユーザーを表示状態に戻しますか？')) return;

        // set as string to compare reliably with uid strings in UI
        setRestoringId(userIdStr);
        try {
            // Prefer external API helper if present
            if (typeof restoreHiddenUser === 'function') {
                // If helper exists, pass normalized id string or number depending on implementation
                await restoreHiddenUser(rawId);
            } else {
                // Log request details to console for debugging
                console.debug('[restoreHiddenUserLocal] sending PUT', `/api/users/${userIdStr}/hidden`, { hidden: false });

                const res = await fetchWithCreds(`/api/users/${userIdStr}/hidden`, {
                    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: false })
                });

                if (!res.ok) {
                    const parsed = await parseResponseBody(res);
                    const msg =
                        (parsed && typeof parsed === 'object' && parsed.message) ? parsed.message :
                            (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
                    // include status for easier debugging
                    throw new Error(`HTTP ${res.status}: ${msg}`);
                }
                // consume body if any
                await res.json().catch(() => null);
            }

            // remove from hidden list optimistically
            setHiddenUsers(prev => prev.filter(u => {
                const uid = u?.userId ?? u?.id ?? u?.user_id;
                return String(uid) !== userIdStr;
            }));

            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            alert('ユーザーを表示状態に戻しました');
        } catch (err) {
            console.error('restoreHiddenUserLocal error:', err);
            alert('復元に失敗しました: ' + (err?.message || JSON.stringify(err)));
        } finally {
            setRestoringId(null);
        }
    };

    const goToPage = (page) => {
        if (page < 0 || (totalPages > 0 && page >= totalPages)) return;
        setCurrentPage(page);
        fetchUsers(page, pageSize, searchQuery);
    };

    const processedUsers = React.useMemo(() => {
        let list = users.filter((u) => !u.hidden && !u.hidden);
        if (roleFilter && roleFilter !== 'ALL') list = list.filter((u) => u.role === roleFilter);
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
                <Card role="status" aria-live="polite">
                    <CardContent className="py-6"><p className="loading">読み込み中...</p></CardContent>
                </Card>
            </div>
        );
    }

    if (isStudent) {
        return (
            <div className="user-list-container">
                <Card><CardHeader><CardTitle>ユーザー一覧</CardTitle></CardHeader>
                    <CardContent>
                        <Alert variant="destructive"><AlertTitle>エラー</AlertTitle><AlertDescription>学生はこの機能を使用することはできません</AlertDescription></Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="user-list-container">
            <Card>
                <CardHeader><CardTitle id="userlist-heading">ユーザー一覧</CardTitle></CardHeader>
                <CardContent>
                    <div className="mb-6" aria-live="polite" aria-atomic="true">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3" role="tablist" aria-label="役割で絞り込む" onKeyDown={handleCardKeyDown}>
                            <CountCard title="管理者" count={counts.admin} colorClass="bg-red-50" icon={() => <RoleIcon role="ADMIN" className="h-6 w-6" />} active={roleFilter === 'ADMIN'} innerRef={(el) => (cardRefs.current[0] = el)} onClick={() => setRoleFilter(prev => prev === 'ADMIN' ? 'ALL' : 'ADMIN')} />
                            <CountCard title="教員" count={counts.teacher} colorClass="bg-blue-50" icon={() => <RoleIcon role="TEACHER" className="h-6 w-6" />} active={roleFilter === 'TEACHER'} innerRef={(el) => (cardRefs.current[1] = el)} onClick={() => setRoleFilter(prev => prev === 'TEACHER' ? 'ALL' : 'TEACHER')} />
                            <CountCard title="学生" count={counts.student} colorClass="bg-green-50" icon={() => <RoleIcon role="STUDENT" className="h-6 w-6" />} active={roleFilter === 'STUDENT'} innerRef={(el) => (cardRefs.current[2] = el)} onClick={() => setRoleFilter(prev => prev === 'STUDENT' ? 'ALL' : 'STUDENT')} />
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="mb-4">
                            <Dialog open={openHiddenDialog} onOpenChange={setOpenHiddenDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" onClick={() => { setOpenHiddenDialog(true); fetchHiddenUsers(); }} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400" aria-label="非表示ユーザー一覧を開く">
                                        非表示ユーザーを表示{hiddenUsers && hiddenUsers.length ? ` (${hiddenUsers.length}件)` : ''}
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>非表示ユーザー{hiddenUsers ? `（${hiddenUsers.length}件）` : ''}</DialogTitle>
                                        <DialogDescription className="text-xs">非表示になっているユーザーの一覧です。復元したいユーザーを選択してください。</DialogDescription>
                                    </DialogHeader>

                                    <div className="mt-2">
                                        {hiddenLoading && <div className="py-4 text-sm text-slate-500">読み込み中...</div>}
                                        {hiddenError && <div className="py-2 text-sm text-red-600">{hiddenError}</div>}
                                        {!hiddenLoading && !hiddenError && (
                                            <>
                                                {hiddenUsers.length === 0 ? <div className="text-sm text-slate-500">非表示ユーザーは存在しません。</div> : (
                                                    <div className="overflow-auto max-h-[60vh]">
                                                        <table className="w-full border-collapse" aria-label="非表示ユーザー一覧">
                                                            <thead>
                                                            <tr className="text-left text-xs text-slate-600">
                                                                <th className="py-2 px-3">名前</th>
                                                                <th className="py-2 px-3">メール</th>
                                                                <th className="py-2 px-3">役割</th>
                                                                <th className="py-2 px-3">作成日時</th>
                                                                <th className="py-2 px-3">操作</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {hiddenUsers.map((u, idx) => {
                                                                const uidRaw = u?.userId ?? u?.id ?? u?.user_id;
                                                                const uid = uidRaw != null ? String(uidRaw) : `hidden-${idx}`;
                                                                const name = u?.userName ?? u?.name ?? u?.fullName ?? '';
                                                                const created = u?.createdAt ?? u?.created_at ?? '';
                                                                const isPlaceholder = /^hidden-\d+$/i.test(uid);
                                                                return (
                                                                    <tr key={uid} className="border-t" tabIndex={0}>
                                                                        <td className="py-2 px-3 align-top">{name}</td>
                                                                        <td className="py-2 px-3 align-top">{u?.email ?? ''}</td>
                                                                        <td className="py-2 px-3 align-top">
                                            <span className="whitespace-nowrap flex items-center gap-2">
                                              <RoleIcon role={u?.role} className="h-4 w-4" />
                                                {roleLabel(u?.role)}
                                            </span>
                                                                        </td>
                                                                        <td className="py-2 px-3 align-top">{created ? new Date(created).toLocaleString('ja-JP') : ''}</td>
                                                                        <td className="py-2 px-3 align-top">
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => restoreHiddenUserLocal(uid)}
                                                                                disabled={restoringId === uid || isPlaceholder}
                                                                                aria-label={`ユーザー ${name} を復元`}
                                                                            >
                                                                                {restoringId === uid ? '復元中…' : (isPlaceholder ? '復元不可' : '復元')}
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
                                        <Button variant="outline" onClick={() => setOpenHiddenDialog(false)} aria-label="非表示ダイアログを閉じる">閉じる</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="search-form flex flex-wrap gap-2 items-center mb-4" aria-labelledby="userlist-heading">
                        <label htmlFor="search-input" className="sr-only">名前またはメールアドレスで検索</label>
                        <Input id="search-input" type="text" placeholder="名前またはメールアドレスで検索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input max-w-xs" aria-label="名前またはメールアドレスで検索" />
                        <Button type="submit" className="search-button focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400" aria-label="検索">検索</Button>
                        <Button type="button" variant="outline" onClick={() => { setSearchQuery(''); fetchUsers(0, pageSize); fetchCounts(); }} className="reset-button focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400" aria-label="検索をリセット">リセット</Button>
                    </form>

                    <div role="region" aria-labelledby="userlist-heading">
                        <Table className="user-table" aria-label="ユーザー一覧テーブル">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ユーザー名</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead>権限</TableHead>
                                    <TableHead>作成日時</TableHead>
                                    {isAdmin && <TableHead>操作</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedUsers.length === 0 ? (
                                    <TableRow><TableCell colSpan={isAdmin ? 6 : 4} className="no-data text-center">ユーザーが見つかりません</TableCell></TableRow>
                                ) : (
                                    processedUsers.map((user, idx) => {
                                        const uid = user?.userId ?? user?.id ?? user?.user_id ?? `u-${idx}`;
                                        const name = user?.userName ?? user?.name ?? user?.fullName ?? '';
                                        const created = user?.createdAt ?? user?.created_at ?? '';
                                        return (
                                            <TableRow key={uid} tabIndex={0}>
                                                <TableCell>{name}</TableCell>
                                                <TableCell>{user?.email ?? ''}</TableCell>
                                                <TableCell>
                                                    {isAdmin ? (
                                                        <Select value={user.role} onValueChange={(value) => handleRoleChange(uid, value)}>
                                                            {/* SelectTrigger shows only the selected text; SelectItem contains icon + label */}
                                                            <SelectTrigger className="w-[180px] role-select">
                                                                <SelectValue placeholder="ロールを選択" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ADMIN"><div className="flex items-center gap-2"><RoleIcon role="ADMIN" className="h-4 w-4" /> 管理者</div></SelectItem>
                                                                <SelectItem value="TEACHER"><div className="flex items-center gap-2"><RoleIcon role="TEACHER" className="h-4 w-4" /> 教員</div></SelectItem>
                                                                <SelectItem value="STUDENT"><div className="flex items-center gap-2"><RoleIcon role="STUDENT" className="h-4 w-4" /> 学生</div></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="whitespace-nowrap flex items-center gap-2" aria-label={`権限: ${roleLabel(user.role)}`}>
                              <RoleIcon role={user.role} className="h-4 w-4" />
                                                            {roleLabel(user.role)}
                            </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{created ? new Date(created).toLocaleString('ja-JP') : ''}</TableCell>
                                                {isAdmin && (
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button variant="destructive" onClick={() => handleHideToggle(uid)} aria-label={`${name} を削除(非表示)`} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400">{user.hidden ? '表示' : '削除'}</Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-3">
                        <Button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 0}>前へ</Button>
                        <div className="flex items-center gap-2" role="navigation" aria-label="ページナビゲーション">{renderPageButtons(currentPage, totalPages, goToPage)}</div>
                        <Button onClick={() => goToPage(currentPage + 1)} disabled={totalPages === 0 || currentPage >= totalPages - 1}>次へ</Button>

                        <div className="ml-4 flex items-center gap-2">
                            {/* 旧: <label style={{ fontSize: 13 }} className="sr-only" htmlFor="page-size-select">表示数</label> */}
                            {/* 変更: sr-only の span を作り、Select に aria-labelledby を与える */}
                            <span id="page-size-select-label" className="sr-only" style={{ fontSize: 13 }}>表示数</span>

                            <span className="text-sm text-slate-600 mr-2" aria-hidden="true">表示数</span>
                            <Select
                                id="page-size-select"
                                aria-labelledby="page-size-select-label"
                                value={String(pageSize)}
                                onValueChange={(v) => { const newSize = parseInt(v, 10); setPageSize(newSize); fetchUsers(0, newSize, searchQuery); }}
                            >
                                <SelectTrigger className="w-[90px]"><SelectValue placeholder={`${pageSize}件`} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="user-count mt-4 text-right" aria-live="polite">表示: {processedUsers.length} / 全体: {totalElements} 人</div>
                </CardContent>
            </Card>
        </div>
    );
}

export default UserList;