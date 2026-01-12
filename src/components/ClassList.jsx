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
    DropdownMenuGroup,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
    MoreHorizontal,
    Search,
    Plus,
    Stamp,
    Users,
    Trash,
    RotateCcw,
} from "lucide-react";
import { ClassUserManagement } from "@/components/ClassUserManagement";
import { ClassStampManagement } from "@/components/ClassStampManagement";
import { notifySuccess, notifyError } from "@/utils/notify";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

const CLASS_TAB = {
    ACTIVE: "active", // hidden=false
    HIDDEN: "hidden", // hidden=true
};

export function ClassList({ role }) {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // クラス名検索用
    const [searchQuery, setSearchQuery] = useState("");

    // 新規作成用
    const [newClassName, setNewClassName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    // 参加処理の状態
    const [joinLoading, setJoinLoading] = useState(false);
    const [joinError, setJoinError] = useState(null);

    // 削除処理の状態
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [deleteTargetClass, setDeleteTargetClass] = useState(null);

    // ユーザー管理ダイアログ
    const [userManagementClass, setUserManagementClass] = useState(null);

    // スタンプ管理ダイアログ
    const [stampManagementClass, setStampManagementClass] = useState(null);

    // role は prop で渡すが、未渡しのケースに備えてローカルにも保持する
    const [currentRole, setCurrentRole] = useState(role ?? null);
    const [currentUserId, setCurrentUserId] = useState(null);

    // 削除済みクラス一覧（ADMIN のみ）
    const [hiddenClasses, setHiddenClasses] = useState([]);
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenError, setHiddenError] = useState(null);

    // 復元処理 state
    const [restoreProcessingId, setRestoreProcessingId] = useState(null);
    const [restoreError, setRestoreError] = useState(null);

    // タブ state（ADMIN でない場合は実質 ACTIVE 固定）
    const [activeTab, setActiveTab] = useState(CLASS_TAB.ACTIVE);

    useEffect(() => {
        // prop の role が変わったら反映
        setCurrentRole(role ?? null);
    }, [role]);

    const isStudent = currentRole === "STUDENT";
    const isAdmin = currentRole === "ADMIN";

    // サーバから現在のユーザー role / userId を取得
    const fetchCurrentUserInfo = async () => {
        try {
            const res = await fetch("/api/app", { credentials: "include" });
            if (!res.ok) {
                console.warn("failed to fetch app info:", res.status);
                return { role: null, userId: null };
            }
            const d = await res.json();
            const r = d?.user?.role ?? null;
            const uid = d?.user?.userId ?? null;
            setCurrentRole(r);
            setCurrentUserId(uid);
            return { role: r, userId: uid };
        } catch (err) {
            console.warn("error fetching app info:", err);
            return { role: null, userId: null };
        }
    };

    // クラス一覧取得処理を role に応じて出し分け
    const fetchClasses = async () => {
        setLoading(true);
        setError(null);
        try {
            let roleToUse = currentRole;
            let userIdToUse = currentUserId;

            // role / userId がまだわからない場合は /api/app を叩いて取得
            if (!roleToUse || !userIdToUse) {
                const info = await fetchCurrentUserInfo();
                roleToUse = info.role;
                userIdToUse = info.userId;
            }

            let url = "/api/classes/list";

            // STUDENT の場合のみ、自分に紐づくクラスを取得
            if (roleToUse === "STUDENT" && userIdToUse != null) {
                url = `/api/users/${userIdToUse}/classes`;
            }

            const res = await fetch(url, { credentials: "include" });
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

    // 削除済みクラス一覧取得（ADMIN のみ）
    const fetchHiddenClasses = async () => {
        if (!isAdmin) return;
        setHiddenLoading(true);
        setHiddenError(null);
        try {
            const res = await fetch("/api/classes/deleted-list", {
                credentials: "include",
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(
                    text || `削除済みクラス一覧の取得に失敗しました: ${res.status}`
                );
            }
            const data = await res.json();
            setHiddenClasses(data || []);
        } catch (err) {
            console.error(err);
            setHiddenError(
                err.message ?? "削除済みクラス一覧取得時にエラーが発生しました"
            );
            setHiddenClasses([]);
        } finally {
            setHiddenLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
        // 削除済みクラスはタブを開いたときだけ fetchHiddenClasses() を呼ぶ
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 参加処理 (role によって振り分け)
    const onJoinClass = async (classId) => {
        setJoinError(null);

        let roleToUse = currentRole;
        if (!roleToUse) {
            const info = await fetchCurrentUserInfo();
            roleToUse = info.role;
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
                navigate(`/rooms/${roomId}`);
            } else if (res.status === 404) {
                const text = await res.text();
                setJoinError(
                    text ||
                    "現在ルームが開いていません。教員がルームを開くのを待ってください。"
                );
            } else {
                const text = await res.text();
                setJoinError(
                    text ||
                    `参加時にエラーが発生しました (status: ${res.status})`
                );
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
            const msg = "クラス名を入力してください";
            setCreateError(msg);
            notifyError("クラスを作成できませんでした", msg);
            return;
        }

        setCreateLoading(true);
        try {
            const res = await fetch("/api/classes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    className: newClassName.trim(),
                }),
            });

            if (!res.ok) {
                let msg = `クラスを作成できませんでした: ${res.status}`;
                try {
                    const errJson = await res.json();
                    if (errJson.message) msg = errJson.message;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            const created = await res.json();
            setClasses((prev) => [...prev, created]);
            setNewClassName("");
            setOpenCreateDialog(false);

            notifySuccess(
                "クラスを作成しました",
                `クラス名: ${created.className ?? newClassName.trim()}`
            );
        } catch (err) {
            console.error(err);
            const msg = err.message ?? "クラス作成時にエラーが発生しました";
            setCreateError(msg);
            notifyError("クラスを作成できませんでした", msg);
        } finally {
            setCreateLoading(false);
        }
    };

    // クラス論理削除処理
    const handleDeleteClass = async () => {
        if (!deleteTargetClass) return;

        setDeleteError(null);
        setDeleteLoadingId(deleteTargetClass.classId);

        try {
            const res = await fetch(
                `/api/classes/${deleteTargetClass.classId}`,
                {
                    method: "DELETE",
                    credentials: "include",
                }
            );

            if (!res.ok) {
                let msg = `クラスを削除できませんでした: ${res.status}`;
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

            notifySuccess(
                "クラスを削除しました",
                `クラス名: ${deleteTargetClass.className}`
            );

            // ADMIN で削除済みタブを開いている場合は一覧を更新
            if (isAdmin && activeTab === CLASS_TAB.HIDDEN) {
                await fetchHiddenClasses();
            } else {
                setHiddenClasses([]);
            }

            setDeleteTargetClass(null);
        } catch (err) {
            console.error(err);
            const msg = err.message ?? "クラス削除時にエラーが発生しました";
            setDeleteError(msg);
            notifyError("クラスを削除できませんでした", msg);
        } finally {
            setDeleteLoadingId(null);
        }
    };

    // クラス復元処理（ADMINのみ）
    const handleRestoreClass = async (cls) => {
        if (!cls || !cls.classId) return;
        if (!isAdmin) return;

        setRestoreProcessingId(cls.classId);
        setRestoreError(null);

        try {
            const res = await fetch(
                `/api/classes/${encodeURIComponent(cls.classId)}/restore`,
                {
                    method: "PATCH",
                    credentials: "include",
                }
            );

            if (res.ok) {
                // 削除済み一覧から除外
                setHiddenClasses((prev) =>
                    prev.filter((c) => c.classId !== cls.classId)
                );
                // 通常クラス一覧を再取得
                await fetchClasses();

                notifySuccess(
                    "クラスを復元しました",
                    cls.className ? `クラス名: ${cls.className}` : undefined
                );
            } else {
                let message = `クラスの復元に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body &&
                                (body.error ||
                                    body.message ||
                                    JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt || message;
                    }
                } catch {
                    // ignore
                }
                setRestoreError(message);
                notifyError("クラスを復元できませんでした", message);
            }
        } catch (err) {
            console.error(err);
            const message = err.message ?? "通信エラーが発生しました";
            setRestoreError(message);
            notifyError("クラスを復元できませんでした", message);
        } finally {
            setRestoreProcessingId(null);
        }
    };

    // クラス名検索フィルタ
    const filteredClasses = (classes || []).filter((c) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const name = (c.className ?? "").toString().toLowerCase();
        return name.includes(q);
    });

    // 削除済みクラス側のフィルタ
    const filteredHiddenClasses = (hiddenClasses || []).filter((c) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const name = (c.className ?? "").toString().toLowerCase();
        return name.includes(q);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 mt-20 text-sm text-slate-600">
                <Spinner className="size-8" />
                <span>読み込み中</span>
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

    // ADMIN 以外の場合は、実質的に activeTab は常に ACTIVE として扱う
    const effectiveActiveTab = isAdmin ? activeTab : CLASS_TAB.ACTIVE;

    const renderClassCard = (c, { isHiddenTab }) => {
        const isRestoring = restoreProcessingId === c.classId;
        const cardColor = isHiddenTab
            ? "bg-white/95 hover:bg-slate-50"
            : "bg-white/95 hover:bg-slate-50";

        return (
            <Card
                key={c.classId}
                className={`group rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] cursor-pointer transition ${cardColor}`}
                onClick={() => {
                    if (!joinLoading && !isHiddenTab) {
                        onJoinClass(c.classId);
                    }
                }}
            >
                <CardContent className="flex h-32 items-center justify-between px-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <p
                                className={`text-sm font-medium text-slate-800 ${
                                    isHiddenTab
                                        ? "line-through decoration-red-300"
                                        : ""
                                }`}
                            >
                                {c.className}
                            </p>
                            {isHiddenTab && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                                    削除済み
                                </span>
                            )}
                        </div>
                        {c.createdAt && (
                            <p className="mt-2 text-[11px] text-slate-400">
                                作成日時:{" "}
                                {new Date(c.createdAt).toLocaleString("ja-JP")}
                            </p>
                        )}
                        {joinLoading && !isHiddenTab && (
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
                        {!isStudent && (
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
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuGroup>
                                        {/* 削除済みでないクラスの場合のみ、従来のメニューを表示 */}
                                        {!isHiddenTab && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setUserManagementClass(
                                                            c
                                                        )
                                                    }
                                                >
                                                    <Users />
                                                    ユーザー管理
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setStampManagementClass(
                                                            c
                                                        )
                                                    }
                                                >
                                                    <Stamp />
                                                    スタンプ管理
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuGroup>

                                    {/* 削除・復元操作 */}
                                    {!isHiddenTab && (
                                        <DropdownMenuSeparator />
                                    )}
                                    <DropdownMenuGroup>
                                        {/* 通常クラス: 削除 */}
                                        {!isHiddenTab && (
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    setDeleteTargetClass(c)
                                                }
                                            >
                                                <Trash />
                                                クラスを削除
                                            </DropdownMenuItem>
                                        )}
                                        {/* 削除済みクラス: 復元（ADMINのみ） */}
                                        {isHiddenTab && isAdmin && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleRestoreClass(c)
                                                }
                                                disabled={isRestoring}
                                            >
                                                <RotateCcw />
                                                {isRestoring
                                                    ? "復元中..."
                                                    : "クラスを復元"}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <section className="py-4">
            {/* 削除時のエラーメッセージ */}
            {deleteError && (
                <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
                    {deleteError}
                </div>
            )}
            {/* 削除済み関連のエラー（ADMIN & 削除済みタブ） */}
            {isAdmin &&
                effectiveActiveTab === CLASS_TAB.HIDDEN &&
                restoreError && (
                    <p className="text-[11px] text-red-600 mb-2">
                        {restoreError}
                    </p>
                )}
            {isAdmin &&
                effectiveActiveTab === CLASS_TAB.HIDDEN &&
                hiddenError && (
                    <p className="text-[11px] text-red-600 mb-2">
                        {hiddenError}
                    </p>
                )}

            <div className="mb-6 flex items-center justify-between gap-4">
                {/* 見出し：ADMIN は Select でタブ切り替え */}
                <div>
                    {isAdmin ? (
                        <Select
                            value={effectiveActiveTab}
                            onValueChange={async (val) => {
                                setActiveTab(val);
                                if (
                                    val === CLASS_TAB.HIDDEN &&
                                    (!hiddenClasses ||
                                        hiddenClasses.length === 0) &&
                                    !hiddenLoading
                                ) {
                                    await fetchHiddenClasses();
                                }
                            }}
                        >
                            <SelectTrigger
                                className="
                                    inline-flex h-auto items-center gap-1 border-0
                                    bg-transparent px-0 py-0 shadow-none
                                    text-lg font-semibold text-slate-800
                                    focus:ring-0 focus:ring-offset-0
                                "
                            >
                                <SelectValue
                                    placeholder="クラス一覧"
                                    aria-label="クラス一覧タブ切り替え"
                                >
                                    {effectiveActiveTab === CLASS_TAB.HIDDEN
                                        ? "削除済みのクラス"
                                        : "クラス一覧"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={CLASS_TAB.ACTIVE}>
                                    クラス一覧
                                </SelectItem>
                                <SelectItem value={CLASS_TAB.HIDDEN}>
                                    削除済みのクラス
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <h2 className="text-lg font-semibold text-slate-800">
                            クラス一覧
                        </h2>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* 検索ボックス */}
                    <div className="mr-2 w-full max-w-xs">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="クラス名で検索"
                                className="text-sm bg-white pl-8"
                                aria-label="クラス名で検索"
                            />
                            {searchQuery && (
                                <button
                                    aria-label="検索クリア"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"
                                >
                                    クリア
                                </button>
                            )}
                        </div>
                    </div>

                    {/* クラス新規作成ダイアログ（学生以外／通常タブのみ意味がある） */}
                    {!isStudent && (
                        <Dialog
                            open={openCreateDialog}
                            onOpenChange={(open) => {
                                setOpenCreateDialog(open);
                                if (!open) {
                                    setCreateError(null);
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="text-xs font-medium">
                                    <Plus className="h-4 w-4" />
                                    <span>クラスを作成</span>
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>新しいクラスを作成</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        授業で使用するクラスを登録します。クラス名は後から変更できます。
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    onSubmit={handleCreateClass}
                                    className="space-y-4"
                                >
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
                                            onChange={(e) =>
                                                setNewClassName(
                                                    e.target.value
                                                )
                                            }
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
                                            {createLoading
                                                ? "作成中..."
                                                : "作成"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* タブごとの一覧 */}
            {effectiveActiveTab === CLASS_TAB.ACTIVE ? (
                    !filteredClasses || filteredClasses.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            クラスが見つかりませんでした。
                        </p>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredClasses.map((c) =>
                                renderClassCard(c, { isHiddenTab: false })
                            )}
                        </div>
                    )
                ) : // ここに到達するのは ADMIN かつ HIDDEN タブ選択時のみ
                hiddenLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 mt-8 text-sm text-slate-600">
                        <Spinner className="size-6" />
                        <span>削除済みクラスを読み込み中</span>
                    </div>
                ) : !filteredHiddenClasses ||
                filteredHiddenClasses.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        削除済みクラスはありません
                    </p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredHiddenClasses.map((c) =>
                            renderClassCard(c, { isHiddenTab: true })
                        )}
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
                                deleteLoadingId ===
                                deleteTargetClass.classId
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
                                deleteLoadingId ===
                                deleteTargetClass.classId
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
                <DialogContent className="sm:max-w-2xl">
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
                            userId={currentUserId}
                            open={!!stampManagementClass}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* 参加エラーダイアログ */}
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
                        <DialogDescription>{joinError}</DialogDescription>
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