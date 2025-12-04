import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Search } from "lucide-react";

export function ClassUserManagement({ classId, open }) {
    const [usersInClass, setUsersInClass] = useState([]);
    const [usersNotInClass, setUsersNotInClass] = useState([]);

    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const [query, setQuery] = useState("");

    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
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
        }
    }, [open, classId]);

    const renderUserLabel = (user) => {
        const namePart = user.userName || `ユーザーID: ${user.userId}`;

        // ★ 削除: ロールは表示しない
        // const rolePart = user.role ? ` (${user.role})` : "";

        const emailPart = user.email ? ` - ${user.email}` : "";

        // ★ 追加: 所属名があれば表示
        const groupPart = user.groupName ? ` [${user.groupName}]` : "";

        // 戻り値に groupPart を含め、rolePart を削除
        return `${namePart}${groupPart}${emailPart}`;
    };

    // 検索クエリに一致するかどうかを判定するヘルパー
    const matchesQuery = (user) => {
        if (!query) return true;
        const q = query.toLowerCase();
        const name = (user.userName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
    };

    const filteredInClass = usersInClass.filter(matchesQuery);
    const filteredNotInClass = usersNotInClass.filter(matchesQuery);

    return (
        <div>
            {/* 検索窓（shadcn/ui の Input を使用） */}
            <div className="mb-3">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                    <Input
                        placeholder="名前またはメールアドレスで検索"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="text-xs pl-8"
                    />
                </div>
            </div>

            {error && (
                <p className="mb-2 text-xs text-red-600">
                    {error}
                </p>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
                    <Spinner className="size-8" />
                    <span>読み込み中</span>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="mb-1 text-xs font-medium text-slate-600">
                            参加中のユーザー
                        </p>
                        {filteredInClass.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                {query ? "該当するユーザーがいません。" : "右列からユーザーを追加してください。"}
                            </p>
                        ) : (
                            <ul className="space-y-1 max-h-[400px] overflow-auto pr-1">
                                {filteredInClass.map((u) => (
                                    <li
                                        key={u.userId}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2"
                                    >
                                        <div className="flex-1 pr-2 text-xs text-slate-800 truncate">
                                            {renderUserLabel(u)}
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
                    </div>

                    <div>
                        <p className="mb-1 text-xs font-medium text-slate-600">
                            追加できるユーザー
                        </p>
                        {filteredNotInClass.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                {query ? "該当するユーザーがいません。" : "ユーザーはありません。"}
                            </p>
                        ) : (
                            <ul className="space-y-1 max-h-[400px] overflow-auto pr-1">
                                {filteredNotInClass.map((u) => (
                                    <li
                                        key={u.userId}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-2"
                                    >
                                        <div className="flex-1 pr-2 text-xs text-slate-800 truncate">
                                            {renderUserLabel(u)}
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
                    </div>
                </div>
            )}
        </div>
    );
}
