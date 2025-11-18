import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";

function StampList() {
    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStamps = async () => {
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

        fetchStamps();
    }, []);

    return (
        <section className="py-4">
            <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-800">
                        スタンプ一覧
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        登録されているスタンプの情報を確認できます。
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    {loading && (
                        <div className="text-xs text-slate-500">読み込み中...</div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        // StampForm と同じようなグリッドレイアウト
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {stamps.map((stamp) => {
                                const color = getStampColorByCode(stamp.stampColor);
                                const icon = getStampIconByCode(stamp.stampIcon);

                                return (
                                    <div
                                        key={stamp.stampId}
                                        className="
                                            flex h-24 flex-col items-center justify-center rounded-2xl
                                            border border-slate-100 bg-slate-50/60
                                            text-slate-700 shadow-sm
                                            hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600
                                            transition-all
                                        "
                                        style={{ backgroundColor: color.bg }}
                                    >
                                        {/* アイコン（DBの数値 stampIcon から絵文字に変換） */}
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