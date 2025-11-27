import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";

/**
 * クラスに参加するユーザーの追加・削除を行う管理コンポーネント
 *
 * props:
 * - classId: number | string
 */
export function ClassUserManagement({ classId }) {
    const [usersInClass, setUsersInClass] = useState([]); // 追加済みユーザー（List<UserDto>）
    const [usersNotInClass, setUsersNotInClass] = useState([]); // 未追加ユーザー（List<UserDto>）

    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const [openDialog, setOpenDialog] = useState(false);

    // 共通の認証リダイレクト処理
    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

    // ユーザー一覧を取得
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

            const inClass = await inRes.json(); // List<UserDto>
            const notInClass = await notInRes.json(); // List<UserDto>

            setUsersInClass(inClass || []);
            setUsersNotInClass(notInClass || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ユーザー一覧取得時にエラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    // ユーザーをクラスに追加
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

    // ユーザーをクラスから削除
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

            // removeUserFromClass は削除成功で 204、存在しない場合は 404、その他 5xx
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
        if (openDialog) {
            // ダイアログを開いたタイミングで最新の一覧を取得
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDialog, classId]);

    // UserDto の表示用フォーマット
    const renderUserLabel = (user) => {
        // userName (role) - email のように表示
        const namePart = user.userName || `ユーザーID: ${user.userId}`;
        const rolePart = user.role ? ` (${user.role})` : "";
        const emailPart = user.email ? ` - ${user.email}` : "";

        return `${namePart}${rolePart}${emailPart}`;
    };

    return (
        <Dialog
            open={openDialog}
            onOpenChange={(open) => {
                setOpenDialog(open);
                if (!open) {
                    setError(null);
                    setProcessing(false);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="text-xs font-medium"
                >
                    ユーザー管理
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>クラスに参加するユーザーの管理</DialogTitle>
                    <DialogDescription className="text-xs">
                        このクラスに参加するユーザーを追加・削除できます。
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="mb-2 text-xs text-red-600">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p className="text-xs text-slate-500">
                        ユーザー情報を読み込み中です...
                    </p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* クラスに追加済みユーザー */}
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">
                                参加中のユーザー
                            </p>
                            {usersInClass.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                    右列からユーザーを追加してください。
                                </p>
                            ) : (
                                <ul className="space-y-1 max-h-[400px] overflow-auto pr-1">
                                    {usersInClass.map((u) => (
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

                        {/* クラスに未追加ユーザー */}
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">
                                追加できるユーザー
                            </p>
                            {usersNotInClass.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                    ユーザーはありません。
                                </p>
                            ) : (
                                <ul className="space-y-1 max-h-[400px] overflow-auto pr-1">
                                    {usersNotInClass.map((u) => (
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
            </DialogContent>
        </Dialog>
    );
}
