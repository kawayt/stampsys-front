import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
    Card, CardHeader, CardTitle, CardContent,
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
import { Search } from 'lucide-react';

/**
 * roleLabel: map role code to Japanese label
 */
const roleLabel = (role) => {
    if (!role) return '';
    switch (String(role).toUpperCase()) {
        case 'ADMIN': return '管理者';
        case 'TEACHER': return '教員';
        case 'STUDENT': return '学生';
        default: return role;
    }
};

/**
 * UserBadge: shows Icon for Admin/Teacher, N/M for Student
 */
function UserBadge({ email, role, size = 18 }) {
    const local = (email || '').split('@')[0] || '';
    const localUp = String(local).toUpperCase();
    const domain = String(email || '').toLowerCase();
    const isNgo = domain.includes('@ngo');

    const circleStyle = (bg) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '9999px',
        background: bg,
        color: '#fff',
        fontSize: Math.max(10, Math.floor(size / 2.2)),
        fontWeight: 700,
        lineHeight: 1,
    });

    // アイコンのサイズ調整
    const iconSize = Math.max(10, Math.floor(size * 0.7));

    // 管理者: 赤 (#DC2626 - text-red-600相当)
    if (String(role || '').toUpperCase() === 'ADMIN') {
        return (
            <span title="管理者" aria-label="管理者" style={circleStyle('#DC2626')}>
                <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l8 4v6c0 5-3.9 9.4-8 10-4.1-.6-8-5-8-10V6l8-4z" />
                </svg>
            </span>
        );
    }

    if (isNgo) {
        // 名古屋(学生): オレンジ (#F97316 - orange-500相当)
        // 教員が青になったため、区別しやすい色に変更
        if (/^N\d+$/i.test(localUp)) {
            return <span title="名古屋" aria-label="名古屋" style={circleStyle('#F97316')}>N</span>;
        }
        // 津(学生): 緑 (#16A34A - text-green-600相当)
        if (/^M\d+$/i.test(localUp)) {
            return <span title="津" aria-label="津" style={circleStyle('#16A34A')}>M</span>;
        }
    }

    // 教員 (Fallback): 青 (#2563EB - text-blue-600相当)
    return (
        <span title="教員" aria-label="教員" style={circleStyle('#2563EB')}>
            <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v7" />
            </svg>
        </span>
    );
}

/**
 * small RoleIcon for role column / selects
 */
function RoleIconSmall({ role, className = 'h-4 w-4' }) {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-red-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l8 4v6c0 5-3.9 9.4-8 10-4.1-.6-8-5-8-10V6l8-4z" />
            </svg>
        );
    }
    if (r === 'TEACHER') {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-blue-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v7" />
            </svg>
        );
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${className} text-green-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

/**
 * Simple toast component
 */
function ToastSingle({ open, message, onClose, autoHideMs = 5000 }) {
    useEffect(() => {
        if (!open) return undefined;
        if (!autoHideMs) return undefined;
        const t = setTimeout(() => onClose(), autoHideMs);
        return () => clearTimeout(t);
    }, [open, autoHideMs, onClose]);

    if (!open) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            onClick={onClose}
            style={{
                position: 'fixed',
                right: 20,
                bottom: 24,
                zIndex: 9999,
                background: 'rgba(17,24,39,0.95)',
                color: '#fff',
                padding: '12px 16px',
                borderRadius: 8,
                boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                maxWidth: '360px',
                pointerEvents: 'auto',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>操作が完了しました</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>{message}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>クリックで閉じる</div>
        </div>
    );
}

/* CountCard (kept simple) */
function CountCard({ title, count, colorClass = 'bg-gray-50', icon, active = false, onClick, innerRef = null }) {
    const iconNode = typeof icon === 'function' ? icon() : icon;
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
                        {title}{active && <span className="sr-only">、選択中</span>}
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-slate-800">{count}人</div>
                </div>
            </div>
        </button>
    );
}

/* Pagination buttons renderer */
function renderPageButtons(currentPage, totalPages, goToPage) {
    if (!totalPages || totalPages <= 1) return null;
    const buttons = [];
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages - 1, currentPage + half);
    if (currentPage - start < half) end = Math.min(totalPages - 1, end + (half - (currentPage - start)));
    if (end - currentPage < half) start = Math.max(0, start - (half - (end - currentPage)));
    for (let i = start; i <= end; i++) {
        buttons.push(
            <Button key={i} variant={i === currentPage ? undefined : 'outline'} onClick={() => goToPage(i)} aria-label={`ページ ${i + 1} を表示`}>
                {i + 1}
            </Button>
        );
    }
    return buttons;
}

/* CONSTANTS */
const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];
const CARD_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];
const DEFAULT_PAGE_SIZE = 20;

/* Main component */
function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
    const [restoringId, setRestoringId] = useState(null);

    // dialogs
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [restoreDialogUser, setRestoreDialogUser] = useState(null);
    const [restoreError, setRestoreError] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetUser, setDeleteTargetUser] = useState(null);
    const [hideToggleLoading, setHideToggleLoading] = useState(false);
    const [hideToggleError, setHideToggleError] = useState(null);

    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successDialogMessage, setSuccessDialogMessage] = useState('');
    const [pendingSuccessMessage, setPendingSuccessMessage] = useState('');

    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

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

    const goToPage = (page) => {
        if (page < 0 || (totalPages > 0 && page >= totalPages)) return;
        setCurrentPage(page);
        fetchUsers(page, pageSize, searchQuery);
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

    // リアルタイム検索（デバウンス処理）
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT') return;
            setCurrentPage(0);
            fetchUsers(0, pageSize, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    useEffect(() => {
        if (!deleteDialogOpen && !restoreDialogOpen && pendingSuccessMessage) {
            const t = setTimeout(() => {
                setSuccessDialogMessage(pendingSuccessMessage);
                setPendingSuccessMessage('');
                setSuccessDialogOpen(true);
            }, 180);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [deleteDialogOpen, restoreDialogOpen, pendingSuccessMessage]);

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

    /* API helpers (kept inline for clarity) */
    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetchWithCreds('/api/app');
            if (!res.ok) { setCurrentUserRole(null); return null; }
            const d = await res.json();
            const role = d?.user?.role ?? null;
            setCurrentUserRole(role || null);
            return role;
        } catch {
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
        } catch { /* empty */ }
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
            setHiddenUsers(usersArray);
            setHiddenError(null);
        } catch (err) {
            setHiddenError(err.message || 'エラーが発生しました');
        } finally {
            setHiddenLoading(false);
        }
    };

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

    const openHideToggleDialog = (user) => {
        setDeleteTargetUser(user);
        setHideToggleError(null);
        setDeleteDialogOpen(true);
    };

    const performHideToggle = async () => {
        if (!deleteTargetUser) return;
        if (currentUserRole !== 'ADMIN') {
            setHideToggleError('管理者権限が必要です');
            return;
        }
        const userId = deleteTargetUser.userId ?? deleteTargetUser.id ?? deleteTargetUser.user_id;
        if (userId == null) {
            setHideToggleError('ユーザーIDが取得できません');
            return;
        }

        const targetName = deleteTargetUser.userName ?? deleteTargetUser.name ?? deleteTargetUser.fullName ?? String(userId);
        const willHide = !deleteTargetUser.hidden;

        setHideToggleLoading(true);
        try {
            const newHidden = !deleteTargetUser.hidden;
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newHidden })
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();

            const msg = willHide ? `${targetName} の削除が完了しました` : `${targetName} の再表示が完了しました`;
            setDeleteDialogOpen(false);
            setTimeout(() => {
                setToastMessage(msg);
                setToastOpen(true);
            }, 180);
        } catch (err) {
            setHideToggleError(err.message || String(err));
        } finally {
            setHideToggleLoading(false);
        }
    };

    const performRestore = async () => {
        if (!restoreDialogUser) return;
        setRestoreError(null);
        const rawId = restoreDialogUser?.userId ?? restoreDialogUser?.id ?? restoreDialogUser?.user_id;
        if (!rawId) {
            setRestoreError('ユーザーIDが取得できませんでした');
            return;
        }
        const idStr = String(rawId);
        if (/^hidden-\d+$/i.test(idStr)) {
            setRestoreError('ローカルプレースホルダーのため復元できません');
            return;
        }
        if (currentUserRole !== 'ADMIN') {
            setRestoreError('管理者権限が必要です');
            return;
        }

        const targetName = restoreDialogUser.userName ?? restoreDialogUser.name ?? restoreDialogUser.fullName ?? idStr;
        setRestoringId(idStr);
        try {
            if (typeof restoreHiddenUser === 'function') {
                await restoreHiddenUser(rawId);
            } else {
                const res = await fetchWithCreds(`/api/users/${idStr}/hidden`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hidden: false }),
                });
                if (!res.ok) {
                    const parsed = await parseResponseBody(res);
                    const msg =
                        (parsed && typeof parsed === 'object' && parsed.message) ? parsed.message :
                            (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
                    throw new Error(msg || '復元に失敗しました');
                }
                await res.json().catch(() => null);
            }
            setHiddenUsers(prev => prev.filter(u => String(u?.userId ?? u?.id ?? u?.user_id) !== idStr));
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();

            const msg = `${targetName} の復元が完了しました`;
            setRestoreDialogOpen(false);
            setTimeout(() => {
                setToastMessage(msg);
                setToastOpen(true);
            }, 180);
        } catch (err) {
            setRestoreError(err.message || String(err));
        } finally {
            setRestoringId(null);
        }
    };

    /* If still loading early return handled above */

    const processedUsers = React.useMemo(() => {
        let list = users.filter((u) => !u.hidden);
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

    if (isStudent) {
        return (
            <div className="user-list-container">
                <Card>
                    <CardHeader><CardTitle>ユーザー一覧</CardTitle></CardHeader>
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

    return (
        <div className="user-list-container">
            <Card>
                <CardHeader><CardTitle id="userlist-heading">ユーザー一覧</CardTitle></CardHeader>
                <CardContent>
                    <div className="mb-6" aria-live="polite" aria-atomic="true">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3" role="tablist" aria-label="役割で絞り込む" onKeyDown={handleCardKeyDown}>
                            <CountCard title="管理者" count={counts.admin} colorClass="bg-red-50" icon={() => <RoleIconSmall role="ADMIN" />} active={roleFilter === 'ADMIN'} innerRef={(el) => (cardRefs.current[0] = el)} onClick={() => setRoleFilter(prev => prev === 'ADMIN' ? 'ALL' : 'ADMIN')} />
                            <CountCard title="教員" count={counts.teacher} colorClass="bg-blue-50" icon={() => <RoleIconSmall role="TEACHER" />} active={roleFilter === 'TEACHER'} innerRef={(el) => (cardRefs.current[1] = el)} onClick={() => setRoleFilter(prev => prev === 'TEACHER' ? 'ALL' : 'TEACHER')} />
                            <CountCard title="学生" count={counts.student} colorClass="bg-green-50" icon={() => <RoleIconSmall role="STUDENT" />} active={roleFilter === 'STUDENT'} innerRef={(el) => (cardRefs.current[2] = el)} onClick={() => setRoleFilter(prev => prev === 'STUDENT' ? 'ALL' : 'STUDENT')} />
                        </div>
                    </div>

                    {String(currentUserRole || '').toUpperCase() === 'ADMIN' && (
                        <div className="mb-4">
                            <Dialog open={openHiddenDialog} onOpenChange={setOpenHiddenDialog}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={() => { setOpenHiddenDialog(true); fetchHiddenUsers(); }}
                                        className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400"
                                        aria-label="非表示ユーザー一覧を開く"
                                    >
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
                                                {hiddenUsers.length === 0 ? (
                                                    <div className="text-sm text-slate-500">非表示ユーザーは存在しません。</div>
                                                ) : (
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
                                                                        <td className="py-2 px-3 align-top">
                                                                            <div className="flex items-center gap-3">
                                                                                <UserBadge email={u?.email} role={u?.role} />
                                                                                <span>{name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-2 px-3 align-top">{u?.email ?? ''}</td>
                                                                        <td className="py-2 px-3 align-top">
                                        <span className="whitespace-nowrap flex items-center gap-2">
                                          <RoleIconSmall role={u?.role} />{roleLabel(u?.role)}
                                        </span>
                                                                        </td>
                                                                        <td className="py-2 px-3 align-top">{created ? new Date(created).toLocaleString('ja-JP') : ''}</td>
                                                                        <td className="py-2 px-3 align-top">
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    if (isPlaceholder) return;
                                                                                    setRestoreDialogUser(u);
                                                                                    setRestoreError(null);
                                                                                    setRestoreDialogOpen(true);
                                                                                }}
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

                    {/* restore dialog */}
                    <Dialog open={restoreDialogOpen} onOpenChange={(v) => {
                        if (!v) {
                            setRestoreDialogOpen(false);
                            setRestoreDialogUser(null);
                            setRestoreError(null);
                        }
                    }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>ユーザーを復元</DialogTitle>
                                <DialogDescription>
                                    {restoreDialogUser ? `${restoreDialogUser.userName ?? restoreDialogUser.name ?? restoreDialogUser.fullName ?? ''} を表示状態に戻しますか？` : ''}
                                </DialogDescription>
                            </DialogHeader>
                            {restoreError && <div className="text-sm text-red-600 mb-2">{restoreError}</div>}
                            <DialogFooter className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => { setRestoreDialogOpen(false); setRestoreDialogUser(null); }} disabled={!!restoringId}>キャンセル</Button>
                                <Button onClick={performRestore} disabled={!!restoringId}>{restoringId ? '復元中…' : '復元'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* delete confirmation dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={(v) => {
                        if (!v) {
                            setDeleteDialogOpen(false);
                            setDeleteTargetUser(null);
                            setHideToggleError(null);
                        }
                    }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{deleteTargetUser?.hidden ? 'ユーザーを再表示' : 'ユーザーを削除(非表示)'}</DialogTitle>
                                <DialogDescription>
                                    {deleteTargetUser ? `${deleteTargetUser.userName ?? deleteTargetUser.name ?? ''} を${deleteTargetUser.hidden ? '再表示しますか？' : '非表示にしますか？'}` : ''}
                                </DialogDescription>
                            </DialogHeader>
                            {hideToggleError && <div className="text-sm text-red-600 mb-2">{hideToggleError}</div>}
                            <DialogFooter className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTargetUser(null); setHideToggleError(null); }} disabled={hideToggleLoading}>キャンセル</Button>
                                <Button variant={deleteTargetUser?.hidden ? 'default' : 'destructive'} onClick={performHideToggle} disabled={hideToggleLoading || !deleteTargetUser}>
                                    {hideToggleLoading ? '処理中…' : (deleteTargetUser?.hidden ? '再表示' : '削除')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* success dialog */}
                    <Dialog open={successDialogOpen} onOpenChange={(v) => {
                        if (!v) {
                            setSuccessDialogOpen(false);
                            setSuccessDialogMessage('');
                            setDeleteTargetUser(null);
                            setRestoreDialogUser(null);
                        }
                    }}>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>操作が完了しました</DialogTitle>
                                <DialogDescription>{successDialogMessage || '操作が完了しました'}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex justify-end gap-2 mt-4">
                                <Button onClick={() => setSuccessDialogOpen(false)}>閉じる</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <form onSubmit={handleSearch} className="search-form flex flex-wrap gap-2 items-center mb-4" aria-labelledby="userlist-heading">
                        <label htmlFor="search-input" className="sr-only">名前またはメールアドレスで検索</label>
                        <div className="mr-2 w-full max-w-xs">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                                <Input
                                    id="search-input"
                                    type="text"
                                    placeholder="名前またはメールアドレスで検索"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input text-sm bg-white pl-8"
                                    aria-label="名前またはメールアドレスで検索"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        aria-label="検索クリア"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"
                                    >
                                        クリア
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    <div role="region" aria-labelledby="userlist-heading">
                        <Table className="user-table" aria-label="ユーザー一覧テーブル">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ユーザー名</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead>権限</TableHead>
                                    <TableHead>作成日時</TableHead>
                                    {String(currentUserRole || '').toUpperCase() === 'ADMIN' && <TableHead>操作</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedUsers.length === 0 ? (
                                    <TableRow><TableCell colSpan={String(currentUserRole || '').toUpperCase() === 'ADMIN' ? 5 : 4} className="no-data text-center">ユーザーが見つかりません</TableCell></TableRow>
                                ) : (
                                    processedUsers.map((user, idx) => {
                                        const uid = user?.userId ?? user?.id ?? user?.user_id ?? `u-${idx}`;
                                        const name = user?.userName ?? user?.name ?? user?.fullName ?? '';
                                        const created = user?.createdAt ?? user?.created_at ?? '';
                                        return (
                                            <TableRow key={uid} tabIndex={0}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserBadge email={user?.email} role={user?.role} />
                                                        <span>{name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{user?.email ?? ''}</TableCell>
                                                <TableCell>
                                                    {String(currentUserRole || '').toUpperCase() === 'ADMIN' ? (
                                                        <Select value={user.role} onValueChange={(value) => handleRoleChange(uid, value)}>
                                                            <SelectTrigger className="w-[180px] role-select">
                                                                <SelectValue placeholder="ロールを選択" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ADMIN"><div className="flex items-center gap-2"><RoleIconSmall role="ADMIN" /> 管理者</div></SelectItem>
                                                                <SelectItem value="TEACHER"><div className="flex items-center gap-2"><RoleIconSmall role="TEACHER" /> 教員</div></SelectItem>
                                                                <SelectItem value="STUDENT"><div className="flex items-center gap-2"><RoleIconSmall role="STUDENT" /> 学生</div></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="whitespace-nowrap flex items-center gap-2" aria-label={`権限: ${roleLabel(user.role)}`}>
                              <RoleIconSmall role={user.role} />{roleLabel(user.role)}
                            </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{created ? new Date(created).toLocaleString('ja-JP') : ''}</TableCell>
                                                {String(currentUserRole || '').toUpperCase() === 'ADMIN' && (
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => openHideToggleDialog(user)}
                                                                aria-label={`${name} を削除(非表示)`}
                                                                className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                                                            >
                                                                {user.hidden ? '表示' : '削除'}
                                                            </Button>
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
                        <div className="flex items-center gap-2" role="navigation" aria-label="ページナビゲーション">
                            {renderPageButtons(currentPage, totalPages, goToPage)}
                        </div>
                        <Button onClick={() => goToPage(currentPage + 1)} disabled={totalPages === 0 || currentPage >= totalPages - 1}>次へ</Button>
                        <div className="ml-4 flex items-center gap-2">
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

            <ToastSingle open={toastOpen} message={toastMessage} onClose={() => setToastOpen(false)} autoHideMs={5000} />
        </div>
    );
}

export default UserList;