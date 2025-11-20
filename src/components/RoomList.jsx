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
import { ArrowLeft } from "lucide-react";

export function RoomList() {
    const { classId } = useParams();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const fetchRooms = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(classId)}`);
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
                body: JSON.stringify({
                    classId: Number(classId),
                    roomName: createRoomName.trim(), // RoomForm のフィールド名に合わせて変更してください
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                // バリデーションエラーなどは文字列で返ってくる想定
                throw new Error(text || `ルーム作成に失敗しました: ${res.status}`);
            }

            await res.json(); // created room を使わなくても一応 parse

            setCreateSuccess("ルームを作成しました");
            setCreateRoomName("");
            setOpenCreateDialog(false);
            // 一覧を更新
            await fetchRooms();
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
                // 成功: ローカル state を更新して active = false にする
                setRooms((prev) =>
                    prev.map((r) => (r.roomId === selectedRoom.roomId ? { ...r, active: false } : r))
                );
                setOpenCloseDialog(false);
                setSelectedRoom(null);
            } else {
                // エラーレスポンスを可能な限りパースして表示
                let message = `ルームの終了に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message = (body && (body.error || body.message || JSON.stringify(body))) || message;
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

    useEffect(() => {
        fetchRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

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
                            <Button className="text-xs font-medium">
                                ルームを作成
                            </Button>
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
                                        <p className="text-[11px] text-red-600">
                                            {createError}
                                        </p>
                                    )}
                                    {createSuccess && (
                                        <p className="text-[11px] text-emerald-600">
                                            {createSuccess}
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
                                            setCreateSuccess(null);
                                        }}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={creating}
                                        className="text-xs font-medium"
                                    >
                                        {creating ? "作成中..." : "作成"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {(!rooms || rooms.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このクラスに紐づくルームは登録されていません。
                </p>
            ) : (
                <div className="space-y-4">
                    {rooms.map((r) => (
                        <Card
                            key={r.roomId}
                            className="rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] bg-white/95"
                        >
                            <CardContent className="flex items-center justify-between px-8 py-5">
                                {/* 左側：アイコン + 情報 */}
                                <div className="flex items-center gap-4">
                                    {/* アイコン部分（ダミー） */}
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

                                            {/* active が false のときだけ「終了」ラベル */}
                                            {!r.active && (
                                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 border border-red-100">
                                                    終了
                                                </span>
                                            )}
                                        </div>

                                        {r.createdAt && (
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                作成日時: {new Date(r.createdAt).toLocaleString("ja-JP")}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 右側：ボタン／矢印 */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className={
                                                r.active
                                                    ? "text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-4"
                                                    : "text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4"
                                            }
                                            disabled={!r.active}
                                            onClick={() => {
                                                if (r.active) {
                                                    // ★ active なルームだけ詳細ページに遷移
                                                    navigate(`/rooms/${r.roomId}`);
                                                }
                                            }}
                                        >
                                            {r.active ? "入室" : "履歴"}
                                        </Button>

                                    {/* 追加: 終了ボタン（active のときのみ表示） */}
                                    {r.active && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs font-medium"
                                            onClick={() =>
                                                openCloseRoomDialog({ roomId: r.roomId, roomName: r.roomName })
                                            }
                                        >
                                            終了
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
                    ))}
                </div>
            )}

            {/* ルーム終了確認ダイアログ（共通） */}
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

        </section>
    );
}