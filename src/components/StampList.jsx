import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";

function StampList() {
    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 追加フォーム用
    const [newStampName, setNewStampName] = useState("");
    const [newStampColor, setNewStampColor] = useState(""); // "1"〜"10"
    const [newStampIcon, setNewStampIcon] = useState("");   // "1"〜"20"
    const [addLoading, setAddLoading] = useState(false);
    const [openAddDialog, setOpenAddDialog] = useState(false);

    // 初回ロードで一覧取得
    useEffect(() => {
        fetchStamps();
    }, []);

    const fetchStamps = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/stamp-management");

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

        // 空チェック
        if (!newStampName || !newStampColor || !newStampIcon) {
            setError("スタンプ名・カラー・アイコンをすべて選択してください");
            return;
        }

        // 数値変換
        const colorNum = Number(newStampColor);
        const iconNum = Number(newStampIcon);

        const payload = {
            stampName: newStampName,
            stampColor: colorNum,
            stampIcon: iconNum,
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 成功したらフォームクリア & 再取得
            setNewStampName("");
            setNewStampColor("");
            setNewStampIcon("");
            setOpenAddDialog(false);
            await fetchStamps();
        } catch (err) {
            console.error(err);
            setError("スタンプの追加に失敗しました");
        } finally {
            setAddLoading(false);
        }
    };

    // スタンプ削除
    const handleDeleteStamp = async (stampId) => {
        if (!window.confirm("このスタンプを削除しますか？")) {
            return;
        }

        setError(null);

        try {
            const response = await fetch(`/api/stamp-management/${stampId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 再取得でもよいが、ここではローカル state を更新
            setStamps((prev) => prev.filter((s) => s.stampId !== stampId));
        } catch (err) {
            console.error(err);
            setError("スタンプの削除に失敗しました");
        }
    };

    // カラーとアイコンの候補（コード値を配列化）
    const colorOptions = Array.from({ length: 10 }, (_, i) => i + 1);
    const iconOptions = Array.from({ length: 20 }, (_, i) => i + 1);

    return (
        <section className="py-4">
            <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base text-slate-800">
                            スタンプ一覧
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                            登録されているスタンプの情報を確認・編集できます。
                        </CardDescription>
                    </div>

                    {/* 新規追加ダイアログ */}
                    <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="text-xs font-medium">
                                新しいスタンプを追加
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
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="カラーを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map((code) => {
                                                const color = getStampColorByCode(code);
                                                return (
                                                    <SelectItem key={code} value={String(code)}>
                                                        <span
                                                            className="h-3 w-3 rounded-full border border-slate-200"
                                                            style={{ backgroundColor: color.bg }}
                                                        />
                                                        <span className="text-xs">
                                                            {color.label} ({code})
                                                        </span>
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
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="アイコンを選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {iconOptions.map((code) => {
                                                const icon = getStampIconByCode(code);
                                                return (
                                                    <SelectItem key={code} value={String(code)}>
                                                        <span className="text-base">{icon}</span>
                                                        <span className="text-[11px] text-slate-500">
                                                            ({code})
                                                        </span>
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
                </CardHeader>

                <CardContent className="pt-4">
                    {loading && (
                        <div className="text-xs text-slate-500">読み込み中...</div>
                    )}

                    {!loading && error && !openAddDialog && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 mb-3">
                            {error}
                        </div>
                    )}

                    {/* 一覧表示 */}
                    {!loading && stamps.length === 0 && (
                        <div className="text-xs text-slate-500">
                            スタンプが登録されていません。
                        </div>
                    )}

                    {!loading && stamps.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {stamps.map((stamp) => {
                                const color = getStampColorByCode(stamp.stampColor);
                                const icon = getStampIconByCode(stamp.stampIcon);

                                return (
                                    <div
                                        key={stamp.stampId}
                                        className="
                                            flex h-28 flex-col items-center justify-center rounded-2xl
                                            border border-slate-100 bg-slate-50/60
                                            text-slate-700 shadow-sm
                                            hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600
                                            transition-all relative
                                        "
                                        style={{ backgroundColor: color.bg }}
                                    >
                                        {/* 削除ボタン */}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteStamp(stamp.stampId)}
                                            className="absolute right-2 top-2 rounded-full bg-white/80 px-2 text-[10px] text-red-500 border border-red-100 hover:bg-red-50"
                                        >
                                            削除
                                        </button>

                                        {/* アイコン */}
                                        <span className="text-3xl mb-1">
                                            {icon}
                                        </span>

                                        {/* ラベル */}
                                        <span className="text-xs font-medium">
                                            {stamp.stampName}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-3 text-[11px] text-slate-400">
                        スタンプは授業のリアクションに利用されます。変更内容はアプリ全体に反映されます。
                    </p>
                </CardContent>
            </Card>
        </section>
    );
}

export default StampList;