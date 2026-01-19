import React, { useState, useEffect, useRef } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { restoreHiddenUser } from '@/api/user.js';
import { Search, Shield, GraduationCap, User, Plus, Filter, Building, Trash2, RotateCw } from 'lucide-react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table';
import { notifySuccess, notifyError } from "@/utils/notify";

const ROLE_ORDER = ['ADMIN', 'TEACHER', 'STUDENT'];
const CARD_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];
const DEFAULT_PAGE_SIZE = 20;

const roleLabel = (role) => {
    if (!role) return '';
    switch (String(role).toUpperCase()) {
        case 'ADMIN': return '管理者';
        case 'TEACHER': return '教員';
        case 'STUDENT': return '学生';
        default: return role;
    }
};

function RoleIconSmall({ role, className = 'h-6 w-6' }) {
    const r = String(role || '').toUpperCase();
    if (r === 'ADMIN') return <Shield className={`${className} text-rose-600`} aria-hidden />;
    if (r === 'TEACHER') return <GraduationCap className={`${className} text-blue-600`} aria-hidden />;
    return <User className={`${className} text-emerald-600`} aria-hidden />;
}

function ToastSingle({ open, message, onClose, autoHideMs = 5000 }) {
    useEffect(() => {
        if (!open || !autoHideMs) return;
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
                position: 'fixed', right: 20, bottom: 24, zIndex: 9999,
                background: 'rgba(17,24,39,0.95)', color: '#fff',
                padding: '12px 16px', borderRadius: 8,
                boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
                cursor: 'pointer', maxWidth: '360px', pointerEvents: 'auto',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>操作が完了しました</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>{message}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>クリックで閉じる</div>
        </div>
    );
}

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
                    <div className="text-sm text-slate-500">
                        {title}{active && <span className="sr-only">、選択中</span>}
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
    if (currentPage - start < half) end = Math.min(totalPages - 1, end + (half - (currentPage - start)));
    if (end - currentPage < half) start = Math.max(0, start - (half - (end - currentPage)));
    for (let i = start; i <= end; i++) {
        buttons.push(
            <Button key={i} variant={i === currentPage ? undefined : 'outline'} onClick={() => goToPage(i)} aria-label={`ページ ${i + 1} を表示`}>
                {i + 1}
            </Button>,
        );
    }
    return buttons;
}

function UserList({ initialCurrentUserRole, onUserUpdate }) {
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
    const [groupMap, setGroupMap] = useState({});
    const [groupList, setGroupList] = useState([]);
    // ▼ 追加: グループごとの人数を保持するステート
    const [groupCounts, setGroupCounts] = useState({});
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [newGroupName, setNewGroupName] = useState('');
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [openGroupManager, setOpenGroupManager] = useState(false);
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenUsers, setHiddenUsers] = useState([]);
    const [hiddenError, setHiddenError] = useState(null);
    const [openHiddenDialog, setOpenHiddenDialog] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState(initialCurrentUserRole || null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const cardRefs = useRef([]);
    const [restoringId, setRestoringId] = useState(null);
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
        const resolvedUrl = typeof url === 'string' && url.startsWith('/api') && API_BASE ? `${API_BASE}${url}` : url;
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

    useEffect(() => { cardRefs.current = cardRefs.current.slice(0, CARD_ROLES.length); }, []);

    const fetchGroups = async () => {
        try {
            const res = await fetchWithCreds('/api/groups');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setGroupList(data);
                    const map = {};
                    data.forEach(g => { map[g.groupId] = g.groupName; });
                    setGroupMap(map);
                }
            }
        } catch (err) {
            console.error("グループ情報の取得に失敗しました", err);
        }
    };

    // ▼ 追加: グループごとの人数を取得する関数
    const fetchGroupCounts = async () => {
        try {
            const res = await fetchWithCreds('/api/users/counts/groups');
            if (res.ok) {
                const data = await res.json();
                // nullキー（未所属）の調整などが必要ならここで行う
                setGroupCounts(data || {});
            }
        } catch (err) {
            console.error("グループ人数の取得に失敗しました", err);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            const role = await fetchCurrentUserRole();
            if (role && String(role).toUpperCase() === 'STUDENT') {
                setLoading(false);
                setError(null);
                return;
            }
            // ▼ 変更: fetchGroupCounts も初期ロードに追加
            await Promise.all([
                fetchUsers(0, pageSize),
                fetchCounts(),
                fetchGroups(),
                fetchGroupCounts()
            ]);
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
    }, [roleFilter, groupFilter]);

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

    // 自分の権限が変化した場合（初期ロードでの不整合検知や、操作による変化）に、
    // 親コンポーネントへ通知してヘッダー等を更新させる
    useEffect(() => {
        // initialRoleと異なる、あるいはnullから値が入った等、変化があった場合に通知
        if (onUserUpdate && currentUserRole && currentUserRole !== initialCurrentUserRole) {
            onUserUpdate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserRole]);

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
            if (!res.ok) {
                setCurrentUserRole(null);
                setCurrentUserId(null);
                return null;
            }
            const d = await res.json();
            const role = d?.user?.role ?? null;
            const uid = d?.user?.userId ?? d?.user?.id ?? null;
            setCurrentUserRole(role || null);
            setCurrentUserId(uid);
            return role;
        } catch {
            setCurrentUserRole(null);
            setCurrentUserId(null);
            return null;
        }
    };

    const fetchUsers = async (page = 0, size = pageSize, query = '') => {
        try {
            setLoading(true);

            // ユーザー一覧取得と並行して、最新の権限状態も確認する（他者による権限変更を反映させるため）
            const roleCheckPromise = fetchCurrentUserRole();

            let url = `/api/users?page=${page}&size=${size}`;
            if (query && query.trim() !== '') url += `&q=${encodeURIComponent(query)}`;
            if (roleFilter && roleFilter !== 'ALL') url += `&role=${encodeURIComponent(roleFilter)}`;
            if (groupFilter && groupFilter !== 'ALL') url += `&groupId=${encodeURIComponent(groupFilter)}`;

            const [res] = await Promise.all([
                fetchWithCreds(url),
                roleCheckPromise
            ]);

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
        if (currentUserRole !== 'ADMIN') {
            notifyError('権限がありません');
            return;
        }

        const previousUsers = [...users];
        const previousRole = currentUserRole;

        setUsers((prevUsers) =>
            prevUsers.map((u) => {
                const uid = u.userId ?? u.id ?? u.user_id;
                if (uid === userId) {
                    return { ...u, role: newRole };
                }
                return u;
            })
        );

        if (userId === currentUserId) {
            setCurrentUserRole(newRole);
        }

        try {
            const res = await fetchWithCreds(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);

            notifySuccess('ロールを変更しました');
            await fetchCounts();
            // ロール変更も集計に影響しうる（所属は変わらないが念のため）
            await fetchGroupCounts();
        } catch (err) {
            setUsers(previousUsers);
            if (userId === currentUserId) {
                setCurrentUserRole(previousRole);
            }
            notifyError(err.message || err);
        }
    };

    const handleGroupChange = async (userId, newGroupIdStr) => {
        if (currentUserRole !== 'ADMIN') {
            notifyError('権限がありません');
            return;
        }

        const previousUsers = [...users];
        const newGroupId = parseInt(newGroupIdStr, 10);
        const apiGroupId = newGroupId === -1 ? null : newGroupId;

        setUsers((prevUsers) =>
            prevUsers.map((u) => (u.userId === userId ? { ...u, groupId: apiGroupId } : u))
        );

        try {
            const res = await fetchWithCreds(`/api/users/${userId}/group`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: apiGroupId }),
            });

            if (!res.ok) {
                const body = await parseResponseBody(res);
                throw new Error(body.message || "更新に失敗しました");
            }
            await res.json().catch(() => null);

            notifySuccess('所属を変更しました');
            await fetchCounts();
            // ▼ 追加: 所属が変わったのでグループ別人数も再取得
            await fetchGroupCounts();

        } catch (err) {
            setUsers(previousUsers);
            notifyError(err.message || err);
        }
    };

    const handleManualRefresh = () => {
        fetchUsers(currentPage, pageSize, searchQuery);
        fetchGroupCounts(); // 手動更新時も人数を更新
        notifySuccess("リストを最新の状態に更新しました");
    };

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;
        setIsAddingGroup(true);
        try {
            const res = await fetchWithCreds('/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName: newGroupName.trim() })
            });
            if (!res.ok) await handleApiError(res);

            setNewGroupName('');
            await fetchGroups();
            await fetchGroupCounts(); // 追加時は人数0だが一応更新
            notifySuccess('新しい所属先を追加しました');
        } catch (err) {
            notifyError(err.message || '追加に失敗しました');
        } finally {
            setIsAddingGroup(false);
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
        const userId =
            deleteTargetUser.userId ??
            deleteTargetUser.id ??
            deleteTargetUser.user_id;
        if (userId == null) {
            setHideToggleError('ユーザーIDを取得できません');
            return;
        }

        const targetName =
            deleteTargetUser.userName ??
            deleteTargetUser.name ??
            deleteTargetUser.fullName ??
            String(userId);
        const willHide = !deleteTargetUser.hidden;

        setHideToggleLoading(true);
        try {
            const newHidden = !deleteTargetUser.hidden;
            const res = await fetchWithCreds(`/api/users/${userId}/hidden`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hidden: newHidden }),
            });
            if (!res.ok) await handleApiError(res);
            await res.json().catch(() => null);

            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            await fetchGroupCounts(); // 削除/復元で人数が変わるため

            const msg = willHide ? `${targetName} を削除しました` : `${targetName} を復元しました`;
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

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm("この所属を削除しますか？\n所属しているユーザーは「未所属」になります。")) return;
        try {
            const res = await fetchWithCreds(`/api/groups/${groupId}`, { method: 'DELETE' });
            if (!res.ok) await handleApiError(res);

            notifySuccess('所属を削除しました');
            await fetchGroups();
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchGroupCounts(); // 削除で人数移動があるため
        } catch (err) {
            notifyError(err.message || '削除に失敗しました');
        }
    };

    const performRestore = async () => {
        if (!restoreDialogUser) return;
        setRestoreError(null);
        const rawId =
            restoreDialogUser?.userId ??
            restoreDialogUser?.id ??
            restoreDialogUser?.user_id;
        if (!rawId) {
            setRestoreError('ユーザーIDを取得できませんでした');
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

        const targetName =
            restoreDialogUser.userName ??
            restoreDialogUser.name ??
            restoreDialogUser.fullName ??
            idStr;
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
                        parsed && typeof parsed === 'object' && parsed.message
                            ? parsed.message
                            : typeof parsed === 'string'
                                ? parsed
                                : JSON.stringify(parsed);
                    throw new Error(msg || '復元できませんでした');
                }
                await res.json().catch(() => null);
            }
            setHiddenUsers((prev) =>
                prev.filter(
                    (u) =>
                        String(u?.userId ?? u?.id ?? u?.user_id) !== idStr,
                ),
            );
            await fetchUsers(currentPage, pageSize, searchQuery);
            await fetchCounts();
            await fetchGroupCounts(); // 復元で人数が変わるため

            const msg = `${targetName} を復元しました`;
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

    const processedUsers = users;

    const isStudent = currentUserRole && String(currentUserRole).toUpperCase() === 'STUDENT';

    const columns = React.useMemo(
        () => [
            {
                accessorKey: 'userName',
                header: () => <span className="ml-2">ユーザー名</span>,
                cell: ({ row }) => {
                    const user = row.original;
                    const name = user?.userName ?? user?.name ?? user?.fullName ?? '';
                    return <div className="flex items-center ml-2 gap-3"><span>{name}</span></div>;
                },
            },
            {
                accessorKey: 'email',
                header: () => <span>メールアドレス</span>,
                cell: ({ row }) => row.original?.email ?? '',
            },
            {
                accessorKey: 'role',
                header: () => <span>権限</span>,
                cell: ({ row }) => {
                    const user = row.original;
                    const uid = user?.userId ?? user?.id ?? user?.user_id;

                    if (String(currentUserRole || '').toUpperCase() === 'ADMIN') {
                        return (
                            <div className="flex items-center">
                                <Select value={user.role} onValueChange={(value) => handleRoleChange(uid, value)}>
                                    <SelectTrigger className="w-[140px] role-select h-8 text-xs">
                                        <SelectValue placeholder="ロールを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">
                                            <div className="flex items-center gap-2">
                                                <RoleIconSmall role="ADMIN" /> 管理者
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="TEACHER">
                                            <div className="flex items-center gap-2">
                                                <RoleIconSmall role="TEACHER" /> 教員
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="STUDENT">
                                            <div className="flex items-center gap-2">
                                                <RoleIconSmall role="STUDENT" /> 学生
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        );
                    }
                    return (
                        <div className="flex items-center">
                            <span className="whitespace-nowrap flex items-center gap-2" aria-label={`権限: ${roleLabel(user.role)}`}>
                                <RoleIconSmall role={user.role} />
                                {roleLabel(user.role)}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: 'group',
                header: () => <span>所属</span>,
                cell: ({ row }) => {
                    const user = row.original;
                    const uid = user?.userId ?? user?.id ?? user?.user_id;
                    const gid = user.groupId;
                    const groupName = groupMap[gid];

                    if (String(currentUserRole || '').toUpperCase() === 'ADMIN') {
                        return (
                            <Select value={gid ? String(gid) : "-1"} onValueChange={(val) => handleGroupChange(uid, val)}>
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue placeholder="未所属" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">未所属</SelectItem>
                                    {groupList.map((g) => (
                                        <SelectItem key={g.groupId} value={String(g.groupId)}>
                                            {g.groupName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        );
                    }

                    if (groupName) {
                        return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {groupName}
                            </span>
                        );
                    }
                    return <span className="text-gray-400 text-xs">未所属</span>;
                },
            },
            {
                accessorKey: 'createdAt',
                header: () => <span>登録日時</span>,
                cell: ({ row }) => {
                    const user = row.original;
                    const created = user?.createdAt ?? user?.created_at ?? '';
                    return created ? new Date(created).toLocaleString('ja-JP') : '';
                },
            },
            ...(String(currentUserRole || '').toUpperCase() === 'ADMIN'
                ? [{
                    id: 'actions',
                    header: () => <span>操作</span>,
                    cell: ({ row }) => {
                        const user = row.original;
                        const name = user?.userName ?? user?.name ?? user?.fullName ?? '';
                        return (
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => openHideToggleDialog(user)}
                                    aria-label={`${name} を削除`}
                                    className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 text-xs"
                                >
                                    {user.hidden ? '表示' : '削除'}
                                </Button>
                            </div>
                        );
                    },
                }]
                : []),
        ],
        [currentUserRole, groupMap, groupList],
    );

    const table = useReactTable({
        data: processedUsers,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (isStudent) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
                <div className="rounded-lg border bg-background p-6 shadow-sm">
                    <h1 className="mb-4 text-lg font-semibold">ユーザー一覧</h1>
                    <Alert variant="destructive">
                        <AlertTitle>エラー</AlertTitle>
                        <AlertDescription>学生はこの機能を使用することはできません</AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    // nullキーは "null" という文字列キーで返ってくる場合と、Mapの仕様による場合がありますが、JSON.stringifyではキーは文字列になります。
    // そのため、groupCounts['null'] か groupCounts[null] をケアしつつ、未所属(-1)は別途対応
    const getCountForGroup = (gid) => {
        // BackendのMap<Integer, Long>はJSON化されるとキーが文字列になります "1": 10
        return groupCounts[gid] || 0;
    };
    const unassignedCount = groupCounts['null'] || groupCounts[null] || 0;

    return (
        <div className="mx-auto space-y-4 py-4">
            {/* タイトル */}
            <div className="space-y-1">
                <h2 id="userlist-heading" className="text-lg font-semibold text-slate-800">
                    すべてのユーザー
                </h2>
            </div>

            {/* サマリーカード */}
            <div className="mb-12" aria-live="polite" aria-atomic="true">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3" role="tablist" aria-label="役割で絞り込む" onKeyDown={handleCardKeyDown}>
                    <CountCard
                        title="管理者"
                        count={counts.admin}
                        colorClass="bg-red-50"
                        icon={() => <RoleIconSmall role="ADMIN" />}
                        active={roleFilter === 'ADMIN'}
                        innerRef={(el) => (cardRefs.current[0] = el)}
                        onClick={() => setRoleFilter((prev) => (prev === 'ADMIN' ? 'ALL' : 'ADMIN'))}
                    />

                    <CountCard
                        title="教員"
                        count={counts.teacher}
                        colorClass="bg-blue-50"
                        icon={() => <RoleIconSmall role="TEACHER" />}
                        active={roleFilter === 'TEACHER'}
                        innerRef={(el) => (cardRefs.current[1] = el)}
                        onClick={() => setRoleFilter((prev) => (prev === 'TEACHER' ? 'ALL' : 'TEACHER'))}
                    />
                    <CountCard
                        title="学生"
                        count={counts.student}
                        colorClass="bg-green-50"
                        icon={() => <RoleIconSmall role="STUDENT" />}
                        active={roleFilter === 'STUDENT'}
                        innerRef={(el) => (cardRefs.current[2] = el)}
                        onClick={() => setRoleFilter((prev) => (prev === 'STUDENT' ? 'ALL' : 'STUDENT'))}
                    />
                </div>
            </div>

            {/* 各種ダイアログ */}
            <Dialog
                open={restoreDialogOpen}
                onOpenChange={(v) => {
                    if (!v) {
                        setRestoreDialogOpen(false);
                        setRestoreDialogUser(null);
                        setRestoreError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ユーザーを復元</DialogTitle>
                        <DialogDescription>
                            {restoreDialogUser
                                ? `${restoreDialogUser.userName ?? restoreDialogUser.name ?? restoreDialogUser.fullName ?? ''} を表示状態に戻しますか？`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    {restoreError && (
                        <div className="text-sm text-red-600 mb-2">
                            {restoreError}
                        </div>
                    )}
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRestoreDialogOpen(false);
                                setRestoreDialogUser(null);
                            }}
                            disabled={!!restoringId}
                        >
                            キャンセル
                        </Button>
                        <Button
                            onClick={performRestore}
                            disabled={!!restoringId}
                        >
                            {restoringId ? '復元中…' : '復元'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(v) => {
                    if (!v) {
                        setDeleteDialogOpen(false);
                        setDeleteTargetUser(null);
                        setHideToggleError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {deleteTargetUser?.hidden
                                ? 'このユーザーを復元しますか？'
                                : 'このユーザーを削除しますか？'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {deleteTargetUser
                                ? `${deleteTargetUser.userName ?? deleteTargetUser.name ?? ''} を${deleteTargetUser.hidden ? '復元します。' : '削除します。'}`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    {hideToggleError && (
                        <div className="text-sm text-red-600 mb-2">
                            {hideToggleError}
                        </div>
                    )}
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setDeleteTargetUser(null);
                                setHideToggleError(null);
                            }}
                            disabled={hideToggleLoading}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant={deleteTargetUser?.hidden ? 'default' : 'destructive'}
                            className="text-xs"
                            onClick={performHideToggle}
                            disabled={hideToggleLoading || !deleteTargetUser}
                        >
                            {hideToggleLoading
                                ? '処理中…'
                                : deleteTargetUser?.hidden
                                    ? '再表示'
                                    : '削除'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={successDialogOpen}
                onOpenChange={(v) => {
                    if (!v) {
                        setSuccessDialogOpen(false);
                        setSuccessDialogMessage('');
                        setDeleteTargetUser(null);
                        setRestoreDialogUser(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>操作が完了しました</DialogTitle>
                        <DialogDescription>
                            {successDialogMessage || '操作が完了しました'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => setSuccessDialogOpen(false)}>
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* フィルタ / 検索バー / 更新ボタン */}
            <form
                onSubmit={handleSearch}
                className="flex flex-wrap items-center justify-between gap-3"
                aria-labelledby="userlist-heading"
            >
                <div className="flex items-center gap-2 w-full max-w-xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                        <Input
                            id="search-input"
                            type="text"
                            placeholder="名前またはメールアドレスで検索"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-sm bg-white pl-8"
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
                    {/* 所属絞り込みフィルタ */}
                    <div className="w-[180px]">
                        <Select
                            value={groupFilter}
                            onValueChange={(val) => setGroupFilter(val)}
                        >
                            <SelectTrigger className="bg-white">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Filter className="w-4 h-4" />
                                    <SelectValue placeholder="所属で絞り込む" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">すべての所属</SelectItem>
                                {/* ▼ 変更: 未所属のカウント表示 */}
                                <SelectItem value="-1">未所属 ({unassignedCount})</SelectItem>
                                {groupList.map(g => (
                                    /* ▼ 変更: 各グループのカウント表示 */
                                    <SelectItem key={g.groupId} value={String(g.groupId)}>
                                        {g.groupName} ({getCountForGroup(g.groupId)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ★ 手動更新ボタン (管理者のみ表示) */}
                    {String(currentUserRole || '').toUpperCase() === 'ADMIN' && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleManualRefresh}
                            className="bg-white h-9 px-3 text-xs"
                        >
                            <RotateCw className={`w-3.5 h-3.5 mr-2 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                            所属情報を更新
                        </Button>
                    )}
                </div>
            </form>

            {/* データテーブル本体 */}
            <div
                className="rounded-md border bg-background"
                role="region"
                aria-labelledby="userlist-heading"
            >
                <Table className="user-table">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={table
                                        .getVisibleFlatColumns()
                                        .length}
                                    className="h-24 text-center text-sm text-muted-foreground"
                                >
                                    {loading
                                        ? '読み込み中…'
                                        : 'ユーザーが見つかりません'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() ? 'selected' : undefined
                                    }
                                    tabIndex={0}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ページネーション */}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-1">
                <Button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 0}
                    variant="outline"
                >
                    前へ
                </Button>
                <div
                    className="flex items-center gap-2"
                    role="navigation"
                    aria-label="ページナビゲーション"
                >
                    {renderPageButtons(currentPage, totalPages, goToPage)}
                </div>
                <Button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={
                        totalPages === 0 ||
                        currentPage >= totalPages - 1
                    }
                    variant="outline"
                >
                    次へ
                </Button>
                <div className="ml-4 flex items-center gap-2">
                    <span
                        className="text-sm text-slate-600 mr-2"
                        aria-hidden="true"
                    >
                        表示数
                    </span>
                    <Select
                        id="page-size-select"
                        aria-labelledby="page-size-select-label"
                        value={String(pageSize)}
                        onValueChange={(v) => {
                            const newSize = parseInt(v, 10);
                            setPageSize(newSize);
                            fetchUsers(0, newSize, searchQuery);
                        }}
                    >
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

            <div
                className="user-count mt-1 text-right text-xs text-muted-foreground"
                aria-live="polite"
            >
                表示中: {processedUsers.length}人 / 合計: {totalElements}人
            </div>

            {/* ★ 新規所属追加フォーム & 管理ボタン (管理者のみ表示) */}
            {String(currentUserRole || '').toUpperCase() === 'ADMIN' && (
                <div className="mt-8 pt-6 border-t">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">新しい所属先を追加</h3>
                            <div className="flex gap-2 max-w-md">
                                <Input
                                    placeholder="例: 大阪、福岡"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="bg-white w-[200px]"
                                />
                                <Button
                                    onClick={handleAddGroup}
                                    disabled={isAddingGroup || !newGroupName.trim()}
                                >
                                    {isAddingGroup ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    追加
                                </Button>
                            </div>
                        </div>

                        {/* ★ 所属一覧・削除ダイアログ */}
                        <Dialog open={openGroupManager} onOpenChange={setOpenGroupManager}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="mt-6">
                                    所属リスト管理
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>所属リストの管理</DialogTitle>
                                    <DialogDescription>
                                        登録されている所属一覧です。削除すると、その所属のユーザーは「未所属」になります。
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4 max-h-[60vh] overflow-y-auto border rounded-md">
                                    {groupList.length === 0 ? (
                                        <div className="p-4 text-sm text-slate-500 text-center">所属がありません</div>
                                    ) : (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                            <tr>
                                                <th className="py-2 px-4 font-medium">ID</th>
                                                <th className="py-2 px-4 font-medium">所属名</th>
                                                <th className="py-2 px-4 text-center">人数</th>
                                                <th className="py-2 px-4 text-right">操作</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                            {groupList.map((g) => (
                                                <tr key={g.groupId}>
                                                    <td className="py-2 px-4 text-slate-500">{g.groupId}</td>
                                                    <td className="py-2 px-4 font-medium">{g.groupName}</td>
                                                    <td className="py-2 px-4 text-center text-slate-600">
                                                        {/* ▼ 追加: 管理画面での人数表示 */}
                                                        {getCountForGroup(g.groupId)}人
                                                    </td>
                                                    <td className="py-2 px-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteGroup(g.groupId)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            <span className="sr-only">削除</span>
                                                        </Button></td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="secondary" onClick={() => setOpenGroupManager(false)}>
                                        閉じる
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            )}

            {/* 非表示ユーザー ダイアログ起動ボタン */}
            {String(currentUserRole || '').toUpperCase() === 'ADMIN' && (
                <div className="flex items-center justify-end gap-2 mt-8">
                    <Dialog
                        open={openHiddenDialog}
                        onOpenChange={setOpenHiddenDialog}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setOpenHiddenDialog(true);
                                    fetchHiddenUsers();
                                }}
                                className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 text-xs"
                                aria-label="非表示ユーザー一覧を開く"
                            >
                                削除済みユーザーを表示
                                {hiddenUsers && hiddenUsers.length
                                    ? ` (${hiddenUsers.length}件)`
                                    : ''}
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>
                                    非表示ユーザー
                                    {hiddenUsers ? `（${hiddenUsers.length}人）` : ''}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    復元したいユーザーを選択してください。
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-2">
                                {hiddenLoading && (
                                    <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
                                        <Spinner className="size-8" />
                                        <span>読み込み中</span>
                                    </div>
                                )}
                                {hiddenError && (
                                    <div className="py-2 text-sm text-red-600">
                                        {hiddenError}
                                    </div>
                                )}
                                {!hiddenLoading && !hiddenError && (
                                    <>
                                        {hiddenUsers.length === 0 ? (
                                            <div className="text-sm text-slate-500">
                                                ユーザーが見つかりませんでした。
                                            </div>
                                        ) : (
                                            <div className="overflow-auto max-h-[60vh]">
                                                <table
                                                    className="w-full border-collapse text-sm"
                                                    aria-label="非表示ユーザー一覧"
                                                >
                                                    <thead>
                                                    <tr className="text-left text-xs text-slate-600">
                                                        <th className="py-2 px-3">名前</th>
                                                        <th className="py-2 px-3">
                                                            メールアドレス
                                                        </th>
                                                        <th className="py-2 px-3">
                                                            権限
                                                        </th>
                                                        <th className="py-2 px-3">
                                                            登録日時
                                                        </th>
                                                        <th className="py-2 px-3">
                                                            操作
                                                        </th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {hiddenUsers.map((u, idx) => {
                                                        const uidRaw =
                                                            u?.userId ??
                                                            u?.id ??
                                                            u?.user_id;
                                                        const uid =
                                                            uidRaw != null
                                                                ? String(uidRaw)
                                                                : `hidden-${idx}`;
                                                        const name =
                                                            u?.userName ??
                                                            u?.name ??
                                                            u?.fullName ??
                                                            '';
                                                        const created =
                                                            u?.createdAt ??
                                                            u?.created_at ??
                                                            '';
                                                        const isPlaceholder =
                                                            /^hidden-\d+$/i.test(
                                                                uid,
                                                            );
                                                        return (
                                                            <tr
                                                                key={uid}
                                                                className="border-t"
                                                                tabIndex={0}
                                                            >
                                                                <td className="py-2 px-3 align-top">
                                                                    <div className="flex items-center gap-3">
                                                                        <span>{name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-3 align-top">
                                                                    {u?.email ??
                                                                        ''}
                                                                </td>
                                                                <td className="py-2 px-3 align-top">
                                                                        <span className="whitespace-nowrap flex items-center gap-2">
                                                                            <RoleIconSmall
                                                                                role={u?.role}
                                                                            />
                                                                            {roleLabel(
                                                                                u?.role,
                                                                            )}
                                                                        </span>
                                                                </td>
                                                                <td className="py-2 px-3 align-top">
                                                                    {created
                                                                        ? new Date(
                                                                            created,
                                                                        ).toLocaleString(
                                                                            'ja-JP',
                                                                        )
                                                                        : ''}
                                                                </td>
                                                                <td className="py-2 px-3 align-top">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            if (
                                                                                isPlaceholder
                                                                            )
                                                                                return;
                                                                            setRestoreDialogUser(
                                                                                u,
                                                                            );
                                                                            setRestoreError(
                                                                                null,
                                                                            );
                                                                            setRestoreDialogOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        disabled={
                                                                            restoringId ===
                                                                            uid ||
                                                                            isPlaceholder
                                                                        }
                                                                        aria-label={`ユーザー ${name} を復元`}
                                                                    >
                                                                        {restoringId ===
                                                                        uid
                                                                            ? '復元中…'
                                                                            : isPlaceholder
                                                                                ? '復元不可'
                                                                                : '復元'}
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
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <ToastSingle
                open={toastOpen}
                message={toastMessage}
                onClose={() => setToastOpen(false)}
                autoHideMs={5000}
            />
        </div>
    );
}

export default UserList;