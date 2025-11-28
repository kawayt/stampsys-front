import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ClassUserManagement } from "@/components/ClassUserManagement";
import { ClassStampManagement } from "@/components/ClassStampManagement";

export function ClassList({ role }) {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 新規作成用
    const [newClassName, setNewClassName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    // 参加処理の状態
    const [joinLoading, setJoinLoading] = useState(false);
    const [joinError, setJoinError] = useState(null);

    // ★ 削除処理の状態
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [deleteTargetClass, setDeleteTargetClass] = useState(null);

    // ユーザー管理ダイアログ
    const [userManagementClass, setUserManagementClass] = useState(null);

    // スタンプ管理ダイアログ
    const [stampManagementClass, setStampManagementClass] = useState(null);

    // role は prop で渡すが、未渡しのケースに備えてローカルにも保持する
    const [currentRole, setCurrentRole] = useState(role ?? null);

    useEffect(() => {
        // prop の role が変わったら反映
        setCurrentRole(role ?? null);
    }, [role]);

    const fetchClasses = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/classes/list");
            if (!res.ok) {
                throw new Error(`Failed to fetch classes: ${res.status}`);
            }
            const data = await res.json();
            setClasses(data || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    // フォールバック: サーバから現在のユーザー role を取得（prop が未渡しのとき）
    const fetchCurrentUserRole = async () => {
        try {
            const res = await fetch("/api/app", { credentials: "include" });
            if (!res.ok) {
                console.warn("failed to fetch app info:", res.status);
                return null;
            }
            const d = await res.json();
            const r = d?.user?.role ?? null;
            setCurrentRole(r);
            return r;
        } catch (err) {
            console.warn("error fetching app info:", err);
            return null;
        }
    };

    // 参加処理 (role によって振り分け)
    const onJoinClass = async (classId) => {
        setJoinError(null);

        let roleToUse = currentRole;
        if (!roleToUse) {
            roleToUse = await fetchCurrentUserRole();
        }

        // TEACHER / ADMIN は従来どおりルーム一覧へ遷移
        if (roleToUse === "TEACHER" || roleToUse === "ADMIN") {
            navigate(`/classes/${classId}`);
            return;
        }

        // STUDENT（または role 不明 -> デフォルト student 扱い）
        setJoinLoading(true);
        try {
            const res = await fetch(`/api/classes/${classId}/active-room`, {
                method: "GET",
                credentials: "include",
            });

            if (res.ok) {
                const body = await res.json();
                const roomId = body?.roomId;
                if (!roomId) {
                    setJoinError("現在利用可能なルームが見つかりませんでした。");
                    return;
                }
                // StampForm のルートに合わせて遷移してください
                navigate(`/rooms/${roomId}`);
            } else if (res.status === 404) {
                const text = await res.text();
                setJoinError(text || "現在ルームが開いていません。教員がルームを開くのを待ってください。");
            } else {
                const text = await res.text();
                setJoinError(text || `参加時にエラーが発生しました (status: ${res.status})`);
            }
        } catch (err) {
            console.error(err);
            setJoinError("参加処理でエラーが発生しました");
        } finally {
            setJoinLoading(false);
        }
    };

    // クラス新規作成処理
    const handleCreateClass = async (e) => {
        e.preventDefault();
        setCreateError(null);

        if (!newClassName.trim()) {
            setCreateError("クラス名を入力してください");
            return;
        }

        setCreateLoading(true);
        try {
            const res = await fetch("/api/classes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // ← バックエンドの ClassForm に合わせてフィールド名を調整
                    className: newClassName.trim(),
                }),
            });

            if (!res.ok) {
                // バリデーションエラーなど、バックエンドからメッセージが返ってくる場合はそれを優先
                let msg = `クラスの作成に失敗しました: ${res.status}`;
                try {
                    const errJson = await res.json();
                    if (errJson.message) msg = errJson.message;
                } catch {
                    // JSON でない場合はそのまま
                }
                throw new Error(msg);
            }

            const created = await res.json();
            // created は ClassResponse の想定
            // { classId, className, createdAt } など
            setClasses((prev) => [...prev, created]);
            setNewClassName("");
            setOpenCreateDialog(false);
        } catch (err) {
            console.error(err);
            setCreateError(err.message ?? "クラス作成時にエラーが発生しました");
        } finally {
            setCreateLoading(false);
        }
    };

    // ★ クラス論理削除処理
    const handleDeleteClass = async () => {
        if (!deleteTargetClass) return;

        setDeleteError(null);
        setDeleteLoadingId(deleteTargetClass.classId);

        try {
            const res = await fetch(`/api/classes/${deleteTargetClass.classId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                let msg = `クラスの削除に失敗しました: ${res.status}`;
                try {
                    const text = await res.text();
                    if (text) msg = text;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            // 成功したらローカル状態から削除
            setClasses((prev) =>
                prev.filter((c) => c.classId !== deleteTargetClass.classId)
            );
            setDeleteTargetClass(null);
        } catch (err) {
            console.error(err);
            setDeleteError(err.message ?? "クラス削除時にエラーが発生しました");
        } finally {
            setDeleteLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="py-8 text-sm text-slate-600">
                読み込み中...
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-sm text-red-600">
                エラー: {error}
            </div>
        );
    }

    return (
        <section className="py-4">
            {/* 削除時のエラーメッセージ */}
            {deleteError && (
                <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
                    {deleteError}
                </div>
            )}

            <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-800">
                    クラス一覧
                </h2>

                {/* クラス新規作成ダイアログ */}
                <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="text-xs font-medium">
                            新しいクラスを作成
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>新しいクラスを作成</DialogTitle>
                            <DialogDescription className="text-xs">
                                授業で使用するクラスを登録します。クラス名は後から変更できます。
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="new-class-name"
                                    className="text-xs font-medium text-slate-700"
                                >
                                    クラス名
                                </Label>
                                <Input
                                    id="new-class-name"
                                    type="text"
                                    placeholder="例: 情報処理Ⅰ"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="text-sm"
                                />
                                {createError && (
                                    <p className="text-[11px] text-red-600">
                                        {createError}
                                    </p>
                                )}
                            </div>

                            <DialogFooter className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => {
                                        setOpenCreateDialog(false);
                                        setCreateError(null);
                                    }}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createLoading}
                                    className="text-xs font-medium"
                                >
                                    {createLoading ? "作成中..." : "作成"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {(!classes || classes.length === 0) ? (
                <p className="text-sm text-slate-500">
                    クラスが登録されていません。
                </p>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {classes.map((c) => (
                        <Card
                            key={c.classId}
                            className="group rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] bg-white/95 cursor-pointer transition hover:bg-slate-50"
                            onClick={() => {
                                if (!joinLoading) {
                                    onJoinClass(c.classId);
                                }
                            }}
                        >
                            <CardContent className="flex h-32 items-center justify-between px-8">
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium text-slate-800">
                                        {c.className}
                                    </p>
                                    {c.createdAt && (
                                        <p className="mt-2 text-[11px] text-slate-400">
                                            作成日時: {new Date(c.createdAt).toLocaleString("ja-JP")}
                                        </p>
                                    )}
                                    {joinLoading && (
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            参加処理中...
                                        </p>
                                    )}
                                </div>

                                <div
                                    className="flex flex-col items-end gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* 3点ドットメニュー */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuLabel className="text-xs">
                                                クラス操作
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-[11px] text-slate-700"
                                                onClick={() => setUserManagementClass(c)}
                                            >
                                                ユーザー管理
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-[11px] text-slate-700"
                                                onClick={() => setStampManagementClass(c)}
                                            >
                                                スタンプ管理
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-[11px] text-red-600 focus:text-red-600"
                                                onClick={() => setDeleteTargetClass(c)}
                                            >
                                                クラスを削除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* クラス削除ダイアログ */}
            <Dialog
                open={!!deleteTargetClass}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTargetClass(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>このクラスを削除しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            「{deleteTargetClass?.className}」を削除します。この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setDeleteTargetClass(null)}
                            disabled={
                                !!deleteTargetClass &&
                                deleteLoadingId === deleteTargetClass.classId
                            }
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="text-xs font-medium"
                            onClick={handleDeleteClass}
                            disabled={
                                !!deleteTargetClass &&
                                deleteLoadingId === deleteTargetClass.classId
                            }
                        >
                            {deleteTargetClass &&
                            deleteLoadingId === deleteTargetClass.classId
                                ? "削除中..."
                                : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ユーザー管理ダイアログ */}
            <Dialog
                open={!!userManagementClass}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserManagementClass(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>クラスに参加するユーザーの管理</DialogTitle>
                        <DialogDescription className="text-xs">
                            このクラスに参加するユーザーを追加・削除できます。
                        </DialogDescription>
                    </DialogHeader>
                    {userManagementClass && (
                        <ClassUserManagement
                            classId={userManagementClass.classId}
                            open={!!userManagementClass}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* スタンプ管理ダイアログ */}
            <Dialog
                open={!!stampManagementClass}
                onOpenChange={(open) => {
                    if (!open) {
                        setStampManagementClass(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>クラスで使用するスタンプの管理</DialogTitle>
                        <DialogDescription className="text-xs">
                            このクラスで使用するスタンプを追加・削除できます。
                        </DialogDescription>
                    </DialogHeader>
                    {stampManagementClass && (
                        <ClassStampManagement
                            classId={stampManagementClass.classId}
                            open={!!stampManagementClass}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* 参加エラーダイアログ (shadcn/ui) */}
            <Dialog
                open={!!joinError}
                onOpenChange={(open) => {
                    if (!open) {
                        setJoinError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ルームに入室できません</DialogTitle>
                        <DialogDescription>
                            {joinError}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setJoinError(null)}
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
