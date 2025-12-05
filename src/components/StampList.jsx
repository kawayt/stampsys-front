import { useEffect, useState } from "react";
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
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Search, Plus } from "lucide-react";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";
import { notifySuccess, notifyError } from "@/utils/notify";

/**
 * StampList
 * - 引数に userId を受け取り、新規作成時の POST ボディに必ず userId を含めます。
 * - App 側で <StampList userId={appData.user?.userId} /> のように渡してください。
 * - 既存コードは極力そのままにし、"自分のスタンプのみ" のチェックボックスと取得切替を追加しています。
 */
function StampList({ userId }) {
    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // スタンプ検索用
    const [searchQuery, setSearchQuery] = useState("");

    // 追加フォーム用
    const [newStampName, setNewStampName] = useState("");
    const [newStampColor, setNewStampColor] = useState(""); // "1"〜"10"
    const [newStampIcon, setNewStampIcon] = useState("");   // "1"〜"20"
    const [addLoading, setAddLoading] = useState(false);
    const [openAddDialog, setOpenAddDialog] = useState(false);

    // 削除ダイアログ用
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteTargetStamp, setDeleteTargetStamp] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // 追加: 自分が作成したスタンプのみ表示するフラグ
    const [showMine, setShowMine] = useState(false);

    // 初回ロードで一覧取得
    useEffect(() => {
        fetchStamps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // fetchStamps に mine フラグを追加（既存呼び出しはそのまま動作）
    const fetchStamps = async (mine = false) => {
        setLoading(true);
        setError(null);

        try {
            let url = "/api/stamp-management";
            if (mine) {
                if (!userId) {
                    const msg = "ユーザー情報が取得できていません。自分のスタンプを表示するにはログインが必要です。";
                    setError(msg);
                    setStamps([]);
                    setLoading(false);
                    return;
                }
                url = `/api/stamp-management/mine?userId=${encodeURIComponent(userId)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setStamps(data);
        } catch (err) {
            console.error(err);
            setError("スタンプ一覧の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // スタンプ追加（ダイアログ内フォーム）
    const handleAddStamp = async (e) => {
        e.preventDefault();
        setError(null);

        // userId が無ければ処理を止める（フロント渡しの方式では必須）
        if (!userId) {
            const msg = "ユーザー情報が取得できていません。再度ログインしてください。";
            setError(msg);
            notifyError("スタンプの追加に失敗しました", msg);
            return;
        }

        // 空チェック
        if (!newStampName || !newStampColor || !newStampIcon) {
            const msg = "スタンプ名・カラー・アイコンをすべて選択してください";
            setError(msg);
            notifyError("スタンプの追加に失敗しました", msg);
            return;
        }

        // 数値変換
        const colorNum = Number(newStampColor);
        const iconNum = Number(newStampIcon);

        // ここで userId を必ず含める
        const payload = {
            stampName: newStampName,
            stampColor: colorNum,
            stampIcon: iconNum,
            userId: userId,
        };

        setAddLoading(true);
        try {
            const response = await fetch("/api/stamp-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let msg = `HTTP error! status: ${response.status}`;
                try {
                    const text = await response.text();
                    if (text) msg = text;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            // 成功したらフォームクリア & 再取得
            const addedName = newStampName;
            setNewStampName("");
            setNewStampColor("");
            setNewStampIcon("");
            setOpenAddDialog(false);
            // 現在のフィルタ（showMine）を考慮して再取得
            await fetchStamps(showMine);

            // 追加成功トースト
            notifySuccess("スタンプを追加しました", `スタンプ名: ${addedName}`);
        } catch (err) {
            console.error(err);
            const msg = "スタンプを追加できませんでした";
            setError(msg);

            // 追加失敗トースト
            notifyError("スタンプを追加できませんでした", err.message ?? msg);
        } finally {
            setAddLoading(false);
        }
    };

    // スタンプ削除（API コール本体）
    const handleDeleteStamp = async (stampId) => {
        setError(null);
        setDeleteLoading(true);

        try {
            const response = await fetch(`/api/stamp-management/${stampId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                let msg = `HTTP error! status: ${response.status}`;
                try {
                    const text = await response.text();
                    if (text) msg = text;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            // ローカル state を更新
            const deletedStamp = stamps.find((s) => s.stampId === stampId);
            setStamps((prev) => prev.filter((s) => s.stampId !== stampId));
            setOpenDeleteDialog(false);
            setDeleteTargetStamp(null);

            // 削除成功トースト
            notifySuccess(
                "スタンプを削除しました",
                deletedStamp ? `スタンプ名: ${deletedStamp.stampName}` : undefined
            );
        } catch (err) {
            console.error(err);
            const msg = "スタンプを削除できませんでした";
            setError(msg);

            // 削除失敗トースト
            notifyError("スタンプを削除できませんでした", err.message ?? msg);
        } finally {
            setDeleteLoading(false);
        }
    };

    // カラーとアイコンの候補（コード値を配列化）
    const colorOptions = Array.from({ length: 10 }, (_, i) => i + 1);
    const iconOptions = Array.from({ length: 20 }, (_, i) => i + 1);

    // スタンプ名検索フィルタ
    const filteredStamps = (stamps || []).filter((s) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const name = (s.stampName ?? "").toString().toLowerCase();
        return name.includes(q);
    });

    return (
        <section className="py-4">
            {/* ヘッダー */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        すべてのスタンプ
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* 検索ボックス */}
                    <div className="mr-2 w-full max-w-xs">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="スタンプ名で検索"
                                className="text-sm bg-white pl-8"
                                aria-label="スタンプ名で検索"
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

                    {/* 追加: 自分が作成したスタンプのみ チェックボックス（最小変更で追加） */}
                    <label className="flex items-center gap-2 mr-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showMine}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setShowMine(checked);
                                // チェック状態に応じて API を叩いて切替
                                fetchStamps(checked);
                            }}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">自分が作成したスタンプのみ</span>
                    </label>

                    {/* 新規追加ダイアログトリガー */}
                    <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="text-xs font-medium">
                                <Plus className="h-4 w-4" />
                                <span>スタンプを追加</span>
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>新しいスタンプを追加</DialogTitle>
                                <DialogDescription className="text-xs">
                                    授業で使用するスタンプを追加します。
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleAddStamp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="stamp-name"
                                        className="text-xs font-medium text-slate-700"
                                    >
                                        スタンプ名
                                    </Label>
                                    <Input
                                        id="stamp-name"
                                        type="text"
                                        placeholder="例: いいね！"
                                        value={newStampName}
                                        onChange={(e) => setNewStampName(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-slate-700">
                                        カラー
                                    </Label>
                                    <Select
                                        value={newStampColor}
                                        onValueChange={setNewStampColor}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="カラーを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map((code) => {
                                                const color = getStampColorByCode(code);
                                                return (
                                                    <SelectItem key={code} value={String(code)}>
                                                        <span
                                                            className="mr-2 h-4 w-4 rounded-full border border-slate-200 inline-block"
                                                            style={{ backgroundColor: color.icon }}
                                                        />
                                                        <span>{color.label}</span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-slate-700">
                                        アイコン
                                    </Label>
                                    <Select
                                        value={newStampIcon}
                                        onValueChange={setNewStampIcon}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="アイコンを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {iconOptions.map((code) => {
                                                const { Icon, label } = getStampIconByCode(code);
                                                return (
                                                    <SelectItem key={code} value={String(code)}>
                                                        <Icon className="mr-2 h-4 w-4" />
                                                        <span>{label}</span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {error && (
                                    <p className="text-[11px] text-red-600">
                                        {error}
                                    </p>
                                )}

                                <DialogFooter className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => {
                                            setOpenAddDialog(false);
                                            setError(null);
                                        }}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addLoading}
                                        className="text-xs font-medium"
                                    >
                                        {addLoading ? "追加中..." : "追加"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 本文部分 */}
            {loading && (
                <div className="flex flex-col items-center justify-center gap-2 mt-20 text-sm text-slate-600">
                    <Spinner className="size-8" />
                    <span>読み込み中</span>
                </div>
            )}

            {!loading && error && !openAddDialog && (
                <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                </div>
            )}

            {!loading && filteredStamps.length === 0 && (
                <div className="text-xs text-slate-500">
                    スタンプが見つかりませんでした。
                </div>
            )}

            {!loading && filteredStamps.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {filteredStamps.map((stamp) => {
                        const color = getStampColorByCode(stamp.stampColor);
                        const { Icon } = getStampIconByCode(stamp.stampIcon);

                        return (
                            <div
                                key={stamp.stampId}
                                className="
                                        relative flex h-28 flex-col items-center justify-center
                                        rounded-2xl border border-slate-100
                                        text-slate-700 shadow-sm
                                        hover:shadow-md transition-all
                                    "
                                style={{ backgroundColor: color.bg, color: color.icon }}
                            >
                                {/* 削除ボタン */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteTargetStamp(stamp);
                                        setOpenDeleteDialog(true);
                                    }}
                                    className="absolute right-2 top-2 rounded-full bg-white/80 px-2 text-[10px] text-red-500 border border-red-100 hover:bg-red-50"
                                >
                                    削除
                                </button>

                                {/* アイコン */}
                                <span className="mb-1.5">
                                    <Icon className="h-10 w-10" />
                                </span>

                                {/* ラベル */}
                                <span className="text-sm font-medium">
                                    {stamp.stampName}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 削除確認ダイアログ */}
            <Dialog
                open={openDeleteDialog}
                onOpenChange={(open) => {
                    setOpenDeleteDialog(open);
                    if (!open) {
                        setDeleteTargetStamp(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>このスタンプを削除しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            {deleteTargetStamp && (
                                <>
                                    「{deleteTargetStamp.stampName}」を削除します。
                                    この操作は取り消せません。
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setOpenDeleteDialog(false);
                                setDeleteTargetStamp(null);
                            }}
                            disabled={deleteLoading}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="text-xs font-medium"
                            onClick={() => {
                                if (deleteTargetStamp) {
                                    handleDeleteStamp(deleteTargetStamp.stampId);
                                }
                            }}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? "削除中..." : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

export default StampList;