import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Search } from "lucide-react";
import { ClassStampManagement } from "./ClassStampManagement";
import { ClassUserManagement } from "./ClassUserManagement";

export function RoomList() {
    const { classId } = useParams();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // search
    const [searchQuery, setSearchQuery] = useState("");

    // counts state
    const [countsMap, setCountsMap] = useState({}); // { [roomId]: count }
    const [countsLoading, setCountsLoading] = useState(true);
    const [countsError, setCountsError] = useState(null);

    // ルーム作成用 state
    const [creating, setCreating] = useState(false);
    const [createRoomName, setCreateRoomName] = useState("");
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState(null);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    // ルーム終了用 state
    const [openCloseDialog, setOpenCloseDialog] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null); // { roomId, roomName }
    const [closeProcessing, setCloseProcessing] = useState(false);
    const [closeError, setCloseError] = useState(null);

    // 削除（非表示）用 state
    const [openHideDialog, setOpenHideDialog] = useState(false);
    const [hideSelectedRoom, setHideSelectedRoom] = useState(null); // { roomId, roomName }
    const [hideProcessing, setHideProcessing] = useState(false);
    const [hideError, setHideError] = useState(null);

    // --- ヘルパー: 認証リダイレクトの簡易チェック ---
    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

    const fetchRooms = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(classId)}`, {
                credentials: "include",
            });
            if (await handleAuthRedirectIfNeeded(res)) return;
            if (!res.ok) {
                throw new Error(`ルーム一覧の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            setRooms(data || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ルーム一覧取得時にエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        setCountsLoading(true);
        setCountsError(null);
        try {
            const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/rooms/stamp-counts`, {
                credentials: "include",
            });
            if (await handleAuthRedirectIfNeeded(res)) return;
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `stamp-counts の取得に失敗しました: ${res.status}`);
            }
            const arr = await res.json();
            // build map
            const map = {};
            (arr || []).forEach((it) => {
                const id = it.roomId ?? it.room_id ?? it.room ?? it.id;
                const cnt = it.count ?? it.cnt ?? it.counts ?? 0;
                if (id != null) map[String(id)] = Number(cnt);
            });
            setCountsMap(map);
        } catch (err) {
            console.error("fetchCounts error:", err);
            setCountsError(err.message ?? "合計スタンプ取得時にエラーが発生しました");
            setCountsMap({});
        } finally {
            setCountsLoading(false);
        }
    };

    // ルーム作成関数
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!createRoomName.trim()) {
            setCreateError("ルーム名を入力してください");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    classId: Number(classId),
                    roomName: createRoomName.trim(),
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `ルーム作成に失敗しました: ${res.status}`);
            }

            await res.json();

            setCreateSuccess("ルームを作成しました");
            setCreateRoomName("");
            setOpenCreateDialog(false);
            await fetchRooms();
            await fetchCounts();
        } catch (err) {
            console.error(err);
            setCreateError(err.message ?? "ルーム作成時にエラーが発生しました");
        } finally {
            setCreating(false);
        }
    };

    // ルーム終了ダイアログを開く（対象ルームをセット）
    const openCloseRoomDialog = (room) => {
        setSelectedRoom(room);
        setCloseError(null);
        setOpenCloseDialog(true);
    };

    // 確認ダイアログで「終了」を押したときの処理
    const handleConfirmClose = async () => {
        if (!selectedRoom || !selectedRoom.roomId) return;
        setCloseProcessing(true);
        setCloseError(null);

        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(selectedRoom.roomId)}/close`, {
                method: "PATCH",
            });

            if (res.status === 204) {
                setRooms((prev) =>
                    prev.map((r) =>
                        r.roomId === selectedRoom.roomId ? { ...r, active: false } : r
                    )
                );
                setOpenCloseDialog(false);
                setSelectedRoom(null);
                // refresh counts because active state change may affect UI
                await fetchCounts();
            } else {
                let message = `ルームの終了に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body && (body.error || body.message || JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt;
                    }
                } catch {
                    // ignore parse errors
                }
                setCloseError(message);
            }
        } catch (err) {
            console.error(err);
            setCloseError(err.message ?? "通信エラーが発生しました");
        } finally {
            setCloseProcessing(false);
        }
    };

    // 削除（非表示）ダイアログを開く
    const openHideRoomDialog = (room) => {
        setHideSelectedRoom(room);
        setHideError(null);
        setOpenHideDialog(true);
    };

    // 確認ダイアログで「削除」を押したときの処理（hidden = true にする）
    const handleConfirmHide = async () => {
        if (!hideSelectedRoom || !hideSelectedRoom.roomId) return;
        setHideProcessing(true);
        setHideError(null);

        try {
            const res = await fetch(
                `/api/rooms/${encodeURIComponent(hideSelectedRoom.roomId)}/delete`,
                {
                    method: "PATCH",
                    credentials: "include",
                }
            );

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (res.status === 204) {
                setRooms((prev) => prev.filter((r) => r.roomId !== hideSelectedRoom.roomId));
                setOpenHideDialog(false);
                setHideSelectedRoom(null);
                // refresh counts because rooms list changed
                await fetchCounts();
            } else {
                let message = `ルームの削除（非表示）に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body && (body.error || body.message || JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt;
                    }
                } catch {
                    // ignore
                }
                setHideError(message);
            }
        } catch (err) {
            console.error(err);
            setHideError(err.message ?? "通信エラーが発生しました");
        } finally {
            setHideProcessing(false);
        }
    };

    useEffect(() => {
        // load both rooms and counts when classId changes
        fetchRooms();
        fetchCounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

    // filter rooms by name (client side)
    const filteredRooms = (rooms || []).filter((r) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const name = (r.roomName ?? r.name ?? r.roomName ?? "").toString().toLowerCase();
        return name.includes(q);
    });

    if (loading) {
        return <div className="py-8 text-sm text-slate-600">読み込み中...</div>;
    }

    if (error) {
        return (
            <div className="py-8 text-sm text-red-600">
                エラー: {error}
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>戻る</span>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <section className="py-4">
            {/* 戻るボタン */}
            <div className="mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1 px-0 text-xs text-slate-600 hover:text-slate-800"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>クラス一覧へ戻る</span>
                </Button>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-800">
                    ルーム一覧（クラスID: {classId}）
                </h2>

                <div className="flex items-center gap-2">
                    {/* search input */}
                    <div className="flex items-center bg-slate-50 rounded-md px-2 py-1 mr-2">
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ルーム名で検索"
                            className="text-sm bg-transparent border-0 px-0"
                            aria-label="ルーム名で検索"
                        />
                        {searchQuery && (
                            <button
                                aria-label="検索クリア"
                                onClick={() => setSearchQuery("")}
                                className="text-slate-400 ml-2 text-xs"
                            >
                                クリア
                            </button>
                        )}
                    </div>

                    {/* スタンプ管理 */}
                    <ClassStampManagement classId={classId} />

                    {/* ユーザー管理 */}
                    <ClassUserManagement classId={classId} />

                    {/* ルーム新規作成ダイアログ */}
                    <Dialog
                        open={openCreateDialog}
                        onOpenChange={(open) => {
                            setOpenCreateDialog(open);
                            if (!open) {
                                setCreateError(null);
                                setCreateSuccess(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="text-xs font-medium">ルームを作成</Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>新しいルームを作成</DialogTitle>
                                <DialogDescription className="text-xs">
                                    授業で使用するルームを登録します。ルーム名は後から変更できます。
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleCreateRoom} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="new-room-name"
                                        className="text-xs font-medium text-slate-700"
                                    >
                                        ルーム名
                                    </Label>
                                    <Input
                                        id="new-room-name"
                                        type="text"
                                        placeholder="例: 1限目 / 2限目"
                                        value={createRoomName}
                                        onChange={(e) => setCreateRoomName(e.target.value)}
                                        className="text-sm"
                                    />
                                    {createError && (
                                        <p className="text-[11px] text-red-600">{createError}</p>
                                    )}
                                    {createSuccess && (
                                        <p className="text-[11px] text-emerald-600">{createSuccess}</p>
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
                                            setCreateSuccess(null);
                                        }}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button type="submit" disabled={creating} className="text-xs font-medium">
                                        {creating ? "作成中..." : "作成"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {(!filteredRooms || filteredRooms.length === 0) ? (
                <p className="text-sm text-slate-500">このクラスに紐づくルームは登録されていません。</p>
            ) : (
                <div className="space-y-4">
                    {filteredRooms.map((r) => {
                        const roomKey = String(r.roomId ?? r.room_id ?? r.id ?? r.room ?? "");
                        const total = countsLoading ? "読み込み中…" : (countsMap[roomKey] ?? 0);

                        return (
                            <Card
                                key={r.roomId}
                                className="rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] bg-white/95"
                            >
                                <CardContent className="flex items-center justify-between px-8 py-5">
                                    {/* 左側：アイコン + 情報 */}
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
                                                r.active
                                                    ? "bg-orange-100 text-orange-500"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}
                                        >
                                            ⌂
                                        </div>

                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {r.roomName}
                                                </p>

                                                {!r.active && (
                                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 border border-red-100">
                                                        終了
                                                    </span>
                                                )}
                                            </div>

                                            {r.createdAt && (
                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    作成日時:{" "}
                                                    {new Date(r.createdAt).toLocaleString("ja-JP")}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右側：ボタン／合計スタンプ／矢印 */}
                                    <div className="flex items-center gap-3">
                                        <div className="text-right mr-4">
                                            <div className="text-sm text-slate-500">合計スタンプ</div>
                                            <div className="text-2xl font-bold">{total}</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                className={
                                                    r.active
                                                        ? "text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-4"
                                                        : "text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4"
                                                }
                                                onClick={() => {
                                                    if (r.active) {
                                                        // pass roomName as query for easier history search
                                                        navigate(`/rooms/${r.roomId}`);
                                                    } else {
                                                        navigate(
                                                            `/rooms/${r.roomId}/history?q=${encodeURIComponent(
                                                                r.roomName ?? ""
                                                            )}`
                                                        );
                                                    }
                                                }}
                                            >
                                                {r.active ? "入室" : "履歴"}
                                            </Button>

                                            {r.active ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs font-medium px-4"
                                                    onClick={() =>
                                                        openCloseRoomDialog({
                                                            roomId: r.roomId,
                                                            roomName: r.roomName,
                                                        })
                                                    }
                                                >
                                                    終了
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="text-xs font-medium px-4"
                                                    onClick={() =>
                                                        openHideRoomDialog({
                                                            roomId: r.roomId,
                                                            roomName: r.roomName,
                                                        })
                                                    }
                                                >
                                                    削除
                                                </Button>
                                            )}
                                        </div>

                                        <span
                                            className={
                                                r.active
                                                    ? "text-orange-400 text-lg"
                                                    : "text-slate-300 text-lg"
                                            }
                                        >
                                            →
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ルーム終了確認ダイアログ */}
            <Dialog
                open={openCloseDialog}
                onOpenChange={(open) => {
                    setOpenCloseDialog(open);
                    if (!open) {
                        setSelectedRoom(null);
                        setCloseError(null);
                        setCloseProcessing(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ルームを終了しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedRoom
                                ? `「${selectedRoom.roomName}」を終了します。よろしいですか？`
                                : "終了するルームを確認してください。"}
                        </DialogDescription>
                    </DialogHeader>

                    {closeError && (
                        <p className="text-sm text-red-600 mb-2">{closeError}</p>
                    )}

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setOpenCloseDialog(false);
                                setSelectedRoom(null);
                                setCloseError(null);
                            }}
                            disabled={closeProcessing}
                        >
                            戻る
                        </Button>
                        <Button
                            type="button"
                            className="text-xs font-medium"
                            onClick={handleConfirmClose}
                            disabled={closeProcessing}
                        >
                            {closeProcessing ? "終了中..." : "終了する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ルーム削除（非表示）確認ダイアログ */}
            <Dialog
                open={openHideDialog}
                onOpenChange={(open) => {
                    setOpenHideDialog(open);
                    if (!open) {
                        setHideSelectedRoom(null);
                        setHideError(null);
                        setHideProcessing(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>このルームを削除しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            {hideSelectedRoom
                                ? `「${hideSelectedRoom.roomName}」を削除します。この操作は取り消せません。`
                                : "削除するルームを確認してください。"}
                        </DialogDescription>
                    </DialogHeader>

                    {hideError && (
                        <p className="text-sm text-red-600 mb-2">{hideError}</p>
                    )}

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setOpenHideDialog(false);
                                setHideSelectedRoom(null);
                                setHideError(null);
                            }}
                            disabled={hideProcessing}
                        >
                            戻る
                        </Button>
                        <Button
                            type="button"
                            className="text-xs font-medium"
                            onClick={handleConfirmHide}
                            disabled={hideProcessing}
                        >
                            {hideProcessing ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}