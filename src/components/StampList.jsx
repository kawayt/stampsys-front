import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";

function StampList() {
    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 追加フォーム用
    const [newStampName, setNewStampName] = useState("");
    const [newStampColor, setNewStampColor] = useState(""); // 1〜10
    const [newStampIcon, setNewStampIcon] = useState("");   // 1〜20

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

    // スタンプ追加
    const handleAddStamp = async (e) => {
        e.preventDefault();
        setError(null);

        // 空チェック
        if (!newStampName || !newStampColor || !newStampIcon) {
            setError("スタンプ名・カラー番号・アイコン番号をすべて入力してください");
            return;
        }

        // 数値変換 & 範囲チェック
        const colorNum = Number(newStampColor);
        const iconNum = Number(newStampIcon);

        if (
            Number.isNaN(colorNum) ||
            Number.isNaN(iconNum) ||
            colorNum < 1 ||
            colorNum > 10 ||
            iconNum < 1 ||
            iconNum > 20
        ) {
            setError("カラー番号は1〜10、アイコン番号は1〜20の数値で入力してください");
            return;
        }

        const payload = {
            stampName: newStampName,
            stampColor: colorNum,
            stampIcon: iconNum,
            // stampId はバックエンドで自動採番されるので送らない
        };

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
            await fetchStamps();
        } catch (err) {
            console.error(err);
            setError("スタンプの追加に失敗しました");
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

    return (
        <section className="py-4">
            <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-800">
                        スタンプ一覧
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        登録されているスタンプの情報を確認・編集できます。
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    {loading && (
                        <div className="text-xs text-slate-500">読み込み中...</div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 mb-3">
                            {error}
                        </div>
                    )}

                    {/* 追加フォーム */}
                    <form
                        onSubmit={handleAddStamp}
                        className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                    >
                        <div className="font-medium text-slate-700 mb-1">
                            新しいスタンプを追加
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="text"
                                placeholder="スタンプ名"
                                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                value={newStampName}
                                onChange={(e) => setNewStampName(e.target.value)}
                            />
                            <input
                                type="number"
                                min={1}
                                max={10}
                                placeholder="カラー番号(1〜10)"
                                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                value={newStampColor}
                                onChange={(e) => setNewStampColor(e.target.value)}
                            />
                            <input
                                type="number"
                                min={1}
                                max={20}
                                placeholder="アイコン番号(1〜20)"
                                className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                value={newStampIcon}
                                onChange={(e) => setNewStampIcon(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600 transition"
                            >
                                追加
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            カラー番号(1〜10)、アイコン番号(1〜20)は StampDefinition の定義に対応しています。
                        </p>
                    </form>

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

                                        {/* コード表示（デバッグ用に残しておきたければ） */}
                                        {/* <span className="mt-1 text-[10px] text-slate-500">
                                            C:{stamp.stampColor} / I:{stamp.stampIcon}
                                        </span> */}
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