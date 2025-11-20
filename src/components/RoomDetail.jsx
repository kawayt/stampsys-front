import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";
import { sendStamp } from "../api/StampSendApi.js";
import { ArrowLeft } from "lucide-react";

export function RoomDetail({ userId }) {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // スタンプ送信用の状態
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");

    const fetchStamps = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/stamps`);
            if (!res.ok) {
                throw new Error(`スタンプ一覧の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            setStamps(data || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "スタンプ一覧取得時にエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStamps();
    }, [roomId]);

    // スタンプをクリックしたときに送信する処理
    const handleStampClick = async (stampId) => {
        if (!userId) {
            setMessage("× ユーザー情報が取得できませんでした");
            return;
        }

        setSending(true);
        setMessage("");

        try {
            const result = await sendStamp(userId, stampId, Number(roomId));

            if (result.success) {
                setMessage("✓ スタンプを送信しました！");
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("× 送信に失敗しました");
            }
        } catch (err) {
            console.error(err);
            setMessage("× エラーが発生しました");
        } finally {
            setSending(false);
        }
    };

    const isSuccess = message.startsWith("✓");

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
                <div className="mt-4 flex gap-2">
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
        <section className="py-4 space-y-4">
            {/* 戻るボタン */}
            <div className="mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1 px-0 text-xs text-slate-600 hover:text-slate-800"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>ルーム一覧へ戻る</span>
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        ルーム詳細（ルームID: {roomId}）
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        このルームに紐づくスタンプ一覧を表示しています。
                    </p>
                </div>
            </div>

            {(!stamps || stamps.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このルームに紐づくスタンプは登録されていません。
                </p>
            ) : (
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {stamps.map((s) => {
                                const color = getStampColorByCode(s.stampColor);
                                const icon = getStampIconByCode(s.stampIcon);

                                return (
                                    <button
                                        type="button"
                                        key={s.stampId ?? `${s.stampName}-${s.stampColor}-${s.stampIcon}`}
                                        className="
                                            flex h-28 flex-col items-center justify-center rounded-2xl
                                            border border-slate-100 bg-slate-50/60
                                            text-slate-700 shadow-sm
                                            hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600
                                            transition-all relative
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        "
                                        style={{ backgroundColor: color.bg }}
                                        onClick={() => handleStampClick(s.stampId)}
                                        disabled={sending || !userId}
                                    >
                                        <span className="text-3xl mb-1">
                                            {icon}
                                        </span>
                                        <span className="text-xs font-medium">
                                            {s.stampName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 送信結果メッセージ */}
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

                        <p className="mt-3 text-[11px] text-slate-400">
                            スタンプは即時に送信されます。連打しすぎないように注意してください。
                        </p>
                    </CardContent>
                </Card>
            )}
        </section>
    );
}