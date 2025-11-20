import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";
import { sendStamp } from "../api/StampSendApi.js";
import { ArrowLeft } from "lucide-react";

function SimpleBarChart({ data }) {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map((d) => d.count || 0)) || 1;

    return (
        <div className="mt-4 space-y-2">
            {data.map((d) => {
                const ratio = (d.count || 0) / maxCount;
                const widthPercent = `${ratio * 100}%`;
                return (
                    <div key={d.stampId ?? d.stampName} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                                <span>{d.icon}</span>
                                <span>{d.stampName}</span>
                            </span>
                            <span>
                                {d.count}回 / {(d.percentage ?? 0).toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-orange-400"
                                style={{ width: widthPercent }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function RoomDetail({ userId, role }) {
    console.log("RoomDetail props:", { userId, role });
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [stamps, setStamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // スタンプ送信用の状態
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");

    // スタンプ集計用の状態（教員・管理者用）
    const [summary, setSummary] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    const isTeacherView = role === "ADMIN" || role === "TEACHER";

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

    const fetchStampSummary = async () => {
        if (!isTeacherView) {
            console.log("skip fetchStampSummary because not teacher view:", { isTeacherView, role });
            return;
        }

        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const url = `/api/rooms/${encodeURIComponent(roomId)}/stamp-summary`;
            console.log("fetchStampSummary URL:", url);
            const res = await fetch(url);
            console.log("fetchStampSummary status:", res.status);
            if (!res.ok) {
                throw new Error(`スタンプ集計の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            console.log("fetchStampSummary raw data:", data);

            const mapped = (data || []).map((d) => {
                const color = getStampColorByCode(d.stampColor);
                const icon = getStampIconByCode(d.stampIcon);
                return {
                    stampId: d.stampId,
                    stampName: d.stampName,
                    stampColor: d.stampColor,
                    stampIcon: d.stampIcon,
                    color,
                    icon,
                    count: d.cnt,
                    percentage: typeof d.pct === "number" ? d.pct : Number(d.pct),
                };
            });
            console.log("fetchStampSummary mapped:", mapped);
            setSummary(mapped);
        } catch (err) {
            console.error("fetchStampSummary error:", err);
            setSummaryError(err.message ?? "スタンプ集計取得時にエラーが発生しました");
        } finally {
            setSummaryLoading(false);
        }
    };

    useEffect(() => {
        fetchStamps();
        fetchStampSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, isTeacherView]);

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
                if (isTeacherView) {
                    fetchStampSummary();
                }
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
                    {isTeacherView && (
                        <p className="mt-1 text-[11px] text-orange-600">
                            教員・管理者権限のため、スタンプ送信状況の集計も表示しています。
                        </p>
                    )}
                </div>
            </div>

            {(!stamps || stamps.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このルームに紐づくスタンプは登録されていません。
                </p>
            ) : (
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent className="pt-4">
                        {/* STUDENT のとき: 従来どおりスタンプ送信ボタンのみ */}

                            <>
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
                            </>


                        {/* ADMIN / TEACHER のとき: スタンプ集計表示 */}
                        {isTeacherView && (
                            <>
                                {summaryLoading && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        集計を読み込み中です...
                                    </p>
                                )}
                                {summaryError && (
                                    <p className="mt-2 text-xs text-red-500">
                                        集計の取得に失敗しました: {summaryError}
                                    </p>
                                )}
                                {!summaryLoading && !summaryError && summary && summary.length > 0 && (
                                    <div className="mt-2">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-1">
                                            スタンプ送信状況（最新）
                                        </h3>
                                        <SimpleBarChart data={summary} />
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </section>
    );
}