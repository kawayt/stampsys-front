import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Trash2, Plus, Search, Filter } from "lucide-react";

export function ClassUserManagement({ classId, open }) {
    const [usersInClass, setUsersInClass] = useState([]);
    const [usersNotInClass, setUsersNotInClass] = useState([]);

    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const [query, setQuery] = useState("");

    // ★追加: グループ関連のステート
    const [groupList, setGroupList] = useState([]);
    const [groupFilter, setGroupFilter] = useState("ALL");

    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

    // ★追加: グループ一覧を取得する関数
    const fetchGroups = async () => {
        try {
            const res = await fetch("/api/groups", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setGroupList(data || []);
            }
        } catch (err) {
            console.error("グループ一覧の取得に失敗しました", err);
        }
    };

    const fetchUsers = async () => {
        if (!classId) return;
        setLoading(true);
        setError(null);

        try {
            const [inRes, notInRes] = await Promise.all([
                fetch(`/api/classes/${encodeURIComponent(classId)}/users/in`, {
                    credentials: "include",
                }),
                fetch(`/api/classes/${encodeURIComponent(classId)}/users/not-in`, {
                    credentials: "include",
                }),
            ]);

            if (await handleAuthRedirectIfNeeded(inRes)) return;
            if (await handleAuthRedirectIfNeeded(notInRes)) return;

            if (!inRes.ok || !notInRes.ok) {
                throw new Error("クラスのユーザー一覧の取得に失敗しました。");
            }

            const inClass = await inRes.json();
            const notInClass = await notInRes.json();

            setUsersInClass(inClass || []);
            setUsersNotInClass(notInClass || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ユーザー一覧取得時にエラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (userId) => {
        if (!classId || !userId) return;
        setProcessing(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/classes/${encodeURIComponent(classId)}/users`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ userId: Number(userId) }),
                }
            );

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `ユーザーの追加に失敗しました: ${res.status}`);
            }

            await fetchUsers();
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ユーザー追加時にエラーが発生しました。");
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveUser = async (userId) => {
        if (!classId || !userId) return;
        setProcessing(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/classes/${encodeURIComponent(classId)}/users/${encodeURIComponent(userId)}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (!res.ok && res.status !== 204) {
                const text = await res.text();
                throw new Error(text || `ユーザーの削除に失敗しました: ${res.status}`);
            }

            await fetchUsers();
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ユーザー削除時にエラーが発生しました。");
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchUsers();
            fetchGroups(); // ★追加: ダイアログが開いたときにグループも取得
        }
    }, [open, classId]);

    // ★修正: 検索クエリとグループフィルタの両方で判定する
    const matchesQuery = (user) => {
        // 1. テキスト検索 (名前 or メール)
        let matchesText = true;
        if (query) {
            const q = query.toLowerCase();
            const name = (user.userName || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            matchesText = name.includes(q) || email.includes(q);
        }

        // 2. グループフィルタ
        let matchesGroup = true;
        if (groupFilter !== "ALL") {
            // "未所属" (-1) の場合
            if (groupFilter === "-1") {
                matchesGroup = !user.groupName;
            } else {
                // 特定のグループIDが選択された場合
                // groupListから選択されたIDに対応する名前を探して比較、あるいは user.groupId があればそれと比較
                // ここでは user.groupName と、groupList内の名前を比較します
                const selectedGroup = groupList.find(g => String(g.groupId) === groupFilter);
                if (selectedGroup) {
                    matchesGroup = user.groupName === selectedGroup.groupName;
                }
            }
        }

        return matchesText && matchesGroup;
    };

    const filteredInClass = usersInClass.filter(matchesQuery);
    const filteredNotInClass = usersNotInClass.filter(matchesQuery);

    return (
        <div>
            {/* ★修正: 検索窓の横にフィルタを追加 (Flexboxで横並び) */}
            <div className="flex items-center gap-2 mb-3">
                <div className="relative w-1/2">
                    <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-300 -translate-y-1/2 pointer-events-none" />
                    <Input
                        placeholder="名前またはメールアドレスで検索"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="text-xs pl-8"
                    />
                </div>

                <div className="w-[140px]">
                    <Select
                        value={groupFilter}
                        onValueChange={(val) => setGroupFilter(val)}
                    >
                        <SelectTrigger className="h-9 text-xs">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Filter className="w-3 h-3" />
                                <SelectValue placeholder="すべて" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">すべて</SelectItem>
                            <SelectItem value="-1">未所属</SelectItem>
                            {groupList.map((g) => (
                                <SelectItem key={g.groupId} value={String(g.groupId)}>
                                    {g.groupName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <p className="mb-2 text-xs text-red-600">
                    {error}
                </p>
            )}

            <div className="grid gap-4 md:grid-cols-2 min-h-[260px]">
                <div className="flex flex-col">
                    <p className="mb-1 text-xs font-medium text-slate-600">
                        参加中のユーザー ({filteredInClass.length}人)
                    </p>
                    <ScrollArea className="h-100 pr-1">
                        {loading ? (
                            <ul className="space-y-1">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <Skeleton
                                        key={`in-skeleton-${idx}`}
                                        className="flex items-center justify-between rounded-lg px-2 py-2 h-14 bg-slate-100"
                                    />
                                ))}
                            </ul>
                        ) : filteredInClass.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                {query || groupFilter !== "ALL" ? "該当するユーザーがいません。" : "右列からユーザーを追加してください。"}
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {filteredInClass.map((u) => (
                                    <li
                                        key={u.userId}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2 h-14"
                                    >
                                        <div className="flex flex-col justify-center overflow-hidden pr-2">
                                            <div className="flex items-center text-xs font-medium text-slate-800 truncate">
                                                <span>{u.userName || `ユーザーID: ${u.userId}`}</span>
                                                {u.groupName && <span className="ml-2 text-[10px] text-slate-500 bg-slate-200 px-1.5 rounded-sm">{u.groupName}</span>}
                                            </div>
                                            {u.email && (
                                                <span className="text-[10px] text-slate-500 truncate">
                                                    {u.email}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => handleRemoveUser(u.userId)}
                                            className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </div>

                <div className="flex flex-col">
                    <p className="mb-1 text-xs font-medium text-slate-600">
                        追加できるユーザー ({filteredNotInClass.length}人)
                    </p>
                    <ScrollArea className="h-100 pr-1">
                        {loading ? (
                            <ul className="space-y-1">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <Skeleton
                                        key={`notin-skeleton-${idx}`}
                                        className="flex items-center justify-between rounded-lg px-2 py-2 h-14 bg-slate-100"
                                    />
                                ))}
                            </ul>
                        ) : filteredNotInClass.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                {query || groupFilter !== "ALL" ? "該当するユーザーがいません。" : "ユーザーはありません。"}
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {filteredNotInClass.map((u) => (
                                    <li
                                        key={u.userId}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2 h-14"
                                    >
                                        <div className="flex flex-col justify-center overflow-hidden pr-2">
                                            <div className="flex items-center text-xs font-medium text-slate-800 truncate">
                                                <span>{u.userName || `ユーザーID: ${u.userId}`}</span>
                                                {u.groupName && <span className="ml-2 text-[10px] text-slate-500 bg-slate-200 px-1.5 rounded-sm">{u.groupName}</span>}
                                            </div>
                                            {u.email && (
                                                <span className="text-[10px] text-slate-500 truncate">
                                                    {u.email}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => handleAddUser(u.userId)}
                                            className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}