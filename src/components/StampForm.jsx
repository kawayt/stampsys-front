import React, { useState } from "react";
import { sendStamp } from "../api/StampSendApi.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function StampPanel({ userId, roomId }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // スタンプのリスト
    const stamps = [
        { id: 1, emoji: "👍", name: "いいね" },
        { id: 2, emoji: "❤️", name: "ハート" },
        { id: 3, emoji: "😊", name: "笑顔" },
        { id: 4, emoji: "🎉", name: "お祝い" },
    ];

    const handleStampClick = async (stampId) => {
        setLoading(true);
        setMessage("");

        try {
            const result = await sendStamp(userId, stampId, roomId);

            if (result.success) {
                setMessage("✓ スタンプを送信しました！");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("× 送信に失敗しました");
            }
        } catch (err) {
            setMessage("× エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const isSuccess = message.startsWith("✓");

    return (
        <section className="py-4">
            <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-800">
                        スタンプ送信
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        気持ちに近いスタンプを選んで、授業にリアクションしましょう。
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    {/* スタンプグリッド */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {stamps.map((stamp) => (
                            <Button
                                key={stamp.id}
                                type="button"
                                disabled={loading}
                                onClick={() => handleStampClick(stamp.id)}
                                variant="ghost"
                                className="
                  flex h-24 flex-col items-center justify-center rounded-2xl
                  border border-slate-100 bg-slate-50/60
                  text-slate-700 shadow-sm
                  hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600
                  transition-all
                "
                            >
                                <span className="text-3xl mb-1">{stamp.emoji}</span>
                                <span className="text-xs font-medium">{stamp.name}</span>
                            </Button>
                        ))}
                    </div>

                    {/* メッセージ */}
                    {message && (
                        <div
                            className={[
                                "mt-4 rounded-xl px-3 py-2 text-xs font-medium",
                                isSuccess
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-red-50 text-red-700 border border-red-100",
                            ].join(" ")}
                        >
                            {message}
                        </div>
                    )}

                    {/* 補足テキスト */}
                    <p className="mt-3 text-[11px] text-slate-400">
                        スタンプは即時に送信されます。連打しすぎないように注意してください。
                    </p>
                </CardContent>
            </Card>
        </section>
    );
}

export default StampPanel;