import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";
import { sendStamp } from "../api/StampSendApi.js";
import { ArrowLeft } from "lucide-react";
import NoteForm from "@/components/NoteForm";
import NotesList from "@/components/NoteList";

function SimpleBarChart({ data }) {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map((d) => d.count || 0)) || 1;

    return (
        <div className="mt-4 space-y-2">
            {data.map((d) => {
                const ratio = (d.count || 0) / maxCount;
                const widthPercent = `${ratio * 100}%`;
                const barColor = d.color?.icon ?? d.color?.bg ?? "#fb923c";
                const textColor = d.color?.icon ?? d.color?.fg ?? d.color?.text ?? "inherit";

                const iconBg = d.color?.bg ?? "#fff";
                const iconColor = d.color?.icon ?? "#000";

                const IconComponent = d.icon;

                return (
                    <div key={d.stampId ?? d.stampName} className="flex items-center gap-3">
                        <div className="flex items-center gap-3 w-44">
                            <div
                                className="flex items-center justify-center h-10 w-10 rounded-full shrink-0"
                                style={{ backgroundColor: iconBg, color: iconColor }}
                            >
                                {IconComponent && (
                                    <IconComponent className="h-5 w-5" />
                                )}
                            </div>
                            <span className="font-medium truncate" style={{ color: textColor }}>
                                {d.stampName}
                            </span>
                        </div>

                        <div className="flex-1">
                            <div className="h-10 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: widthPercent, backgroundColor: barColor }}
                                />
                            </div>
                        </div>

                        <div className="w-28 text-right text-slate-600">
                            {d.count}回 / {(d.percentage ?? 0).toFixed(1)}%
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

    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState("");

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);

    const [summary, setSummary] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    // 追加: ルーム名を保持するステート
    const [roomName, setRoomName] = useState("");

    // メモ一覧再読み込み用 key
    const [notesKey, setNotesKey] = useState(0);

    const isTeacherView = role === "ADMIN" || role === "TEACHER";

    const sseRef = useRef(null);

    // stamps エンドポイントは既存の配列を返す場合と、{ roomName, stamps: [...] } のように
    // room 名を含めて返す場合の両方に対応するようにしています。
    const fetchStamps = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/stamps`);
            if (!res.ok) {
                throw new Error(`スタンプ一覧の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();

            // もしオブジェクト形式で { roomName, stamps } を返していれば roomName を取り出す
            if (data && !Array.isArray(data) && (data.stamps || data.roomName || data.room_name || data.name)) {
                // roomName の可能なキーを順にチェック
                const name = data.roomName ?? data.room_name ?? data.name;
                if (name) setRoomName(name);
                const stampsArr = Array.isArray(data.stamps) ? data.stamps : [];
                setStamps(stampsArr);
            } else {
                // 単なる配列で返ってくる従来ケース
                setStamps(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
            setError(err.message ?? "スタンプ一覧取得時にエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!userId) {
            setHistory([]);
            return;
        }

        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const url = `/api/rooms/${encodeURIComponent(roomId)}/users/${encodeURIComponent(userId)}/stamp-logs`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`履歴の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            setHistory((data || []).slice(0, 10));
        } catch (err) {
            console.error("fetchHistory error:", err);
            setHistoryError(err.message ?? "履歴取得時にエラーが発生しました");
        } finally {
            setHistoryLoading(false);
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
                const { Icon } = getStampIconByCode(d.stampIcon);
                return {
                    stampId: d.stampId,
                    stampName: d.stampName,
                    stampColor: d.stampColor,
                    stampIcon: d.stampIcon,
                    color,
                    icon: Icon,
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

    // ルーム名だけを取得する汎用的なヘルパー（/api/rooms/:id がある場合に使う）
    const fetchRoomInfo = async () => {
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
            if (!res.ok) {
                // 404 等は想定されるためエラーで止めずに無視（スタンプ取得時に roomName が含まれる可能性がある）
                console.debug("fetchRoomInfo returned non-ok:", res.status);
                return;
            }
            const d = await res.json();
            const name = d?.roomName ?? d?.room_name ?? d?.name;
            if (name) setRoomName(name);
        } catch (err) {
            console.debug("fetchRoomInfo failed:", err);
            // silent
        }
    };

    useEffect(() => {
        // ルーム情報（可能なら）を先に取得しておき、スタンプも取得
        fetchRoomInfo();
        fetchStamps();
        fetchStampSummary();

        if (!isTeacherView) {
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, isTeacherView, userId]);

    // SSE で教員画面用の集計を受け取る（ポーリングの代わり）
    useEffect(() => {
        if (!isTeacherView) return;

        const url = `/api/rooms/${encodeURIComponent(roomId)}/stamp-summary/stream`;
        // close previous if exists
        if (sseRef.current) {
            try { sseRef.current.close(); } catch (e) { /* ignore */ }
            sseRef.current = null;
        }

        const es = new EventSource(url);
        sseRef.current = es;

        es.addEventListener("open", () => {
            console.log("SSE connected to", url);
        });

        es.addEventListener("summary", (e) => {
            try {
                const data = JSON.parse(e.data || "[]");
                const mapped = (data || []).map((d) => {
                    const color = getStampColorByCode(d.stampColor);
                    const { Icon } = getStampIconByCode(d.stampIcon);
                    return {
                        stampId: d.stampId,
                        stampName: d.stampName,
                        stampColor: d.stampColor,
                        stampIcon: d.stampIcon,
                        color,
                        icon: Icon,
                        count: d.cnt,
                        percentage: typeof d.pct === "number" ? d.pct : Number(d.pct),
                    };
                });
                setSummary(mapped);
            } catch (err) {
                console.error("Failed to parse SSE summary data:", err);
            }
        });

        // fallback: also handle default onmessage if needed
        es.onmessage = (e) => {
            // Some servers may send messages without explicit event name
            try {
                const data = JSON.parse(e.data || "[]");
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
                setSummary(mapped);
            } catch (err) {
                // ignore parse errors here
            }
        };

        es.onerror = (err) => {
            console.error("SSE error:", err);
        };

        return () => {
            try { es.close(); } catch (e) { /* ignore */ }
            sseRef.current = null;
        };
    }, [roomId, isTeacherView]);

    const onNoteCreated = (createdNote) => {
        // 作成後に NotesList を再読み込み（key を変えて再マウント）
        setNotesKey((k) => k + 1);
    };

    function extractMessage(err) {
        if (!err) return null;
        if (typeof err === "string") return err;
        if (err.message) return err.message;
        if (err.response && err.response.data) {
            try {
                const d = typeof err.response.data === "string" ? JSON.parse(err.response.data) : err.response.data;
                return d?.message || d?.error || JSON.stringify(d);
            } catch {
                return String(err.response.data);
            }
        }
        return null;
    }

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
                if (!isTeacherView) {
                    fetchHistory().catch((e) => console.error("refresh history failed", e));
                }
                if (isTeacherView) {
                    // SSE があれば自動で集計更新が流れてくるがフォールバックとして取得
                    fetchStampSummary();
                }
            } else {
                setMessage("× 送信に失敗しました");
            }
        } catch (err) {
            console.error("room detail stamp send catch err:", err);
            try { console.log("err keys:", err && Object.keys(err)); } catch (e) { /* ignore */ }
            console.log("err.message:", err && err.message);

            const serverMsg = extractMessage(err);
            const userMessage = serverMsg ? `× ${serverMsg}` : "× エラーが発生しました";
            setMessage(userMessage);
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
                        ルーム詳細 - ルーム{roomId}
                    </h2>
                    {/* ここに room_name を表示 */}
                    {roomName && (
                        <p className="mt-1 text-lg font-semibold text-slate-800">{roomName}</p>
                    )}
                </div>
            </div>

            {(!stamps || stamps.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このルームに紐づくスタンプは登録されていません。
                </p>
            ) : (
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent>
                        {!isTeacherView && (
                            <>
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    {stamps.map((s) => {
                                        const color = getStampColorByCode(s.stampColor);
                                        const { Icon } = getStampIconByCode(s.stampIcon);

                                        return (
                                            <button
                                                type="button"
                                                key={s.stampId ?? `${s.stampName}-${s.stampColor}-${s.stampIcon}`}
                                                className="
                                                        flex h-28 flex-col items-center justify-center rounded-2xl
                                                        border border-slate-100
                                                        text-slate-700 shadow-sm
                                                        hover:shadow-md
                                                        transition-all relative
                                                        disabled:opacity-50 disabled:cursor-not-allowed
                                                    "
                                                style={{
                                                    backgroundColor: color.bg,
                                                    color: color.icon,
                                                }}
                                                onClick={() => handleStampClick(s.stampId)}
                                                disabled={sending || !userId}
                                            >
                                                <span className="mb-1.5">
                                                    <Icon className="h-10 w-10" />
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {s.stampName}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

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

                                <div className="mt-4">
                                    <h3 className="text-sm font-medium text-slate-700 mb-2">あなたが送信したスタンプ</h3>

                                    {historyLoading ? (
                                        <p className="text-xs text-slate-500">履歴を読み込み中...</p>
                                    ) : historyError ? (
                                        <p className="text-xs text-red-500">
                                            履歴を取得できませんでした: {historyError}
                                        </p>
                                    ) : history.length === 0 ? (
                                        <p className="text-xs text-slate-500">
                                            まだ送信したスタンプはありません。
                                        </p>
                                    ) : (
                                        <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
                                            {history.map((h, idx) => {
                                                const color = getStampColorByCode(h.stampColor);
                                                const { Icon } = getStampIconByCode(h.stampIcon);

                                                return (
                                                    <Avatar
                                                        key={`${h.stampId}-${idx}-${h.sentAt}`}
                                                        className="h-10 w-10"
                                                    >
                                                        <AvatarFallback
                                                            className="flex items-center justify-center"
                                                            aria-label={h.stampName}
                                                            style={{
                                                                backgroundColor: color.bg,
                                                                color: color.icon,
                                                            }}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {isTeacherView && (
                            <>
                                {summaryLoading && (
                                    <p className="mt-2 text-xs text-slate-500">集計を読み込み中...</p>
                                )}
                                {summaryError && (
                                    <p className="mt-2 text-xs text-red-500">集計を取得できませんでした: {summaryError}</p>
                                )}
                                {!summaryLoading && !summaryError && summary && summary.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-medium">スタンプ送信状況（最新）</h3>
                                        <SimpleBarChart data={summary} />
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {isTeacherView && (
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent>
                        <section>
                            <h3 className="text-lg font-medium">授業メモ</h3>
                            <NoteForm roomId={Number(roomId)} onCreated={onNoteCreated} />
                        </section>
                    </CardContent>
                </Card>
            )}

            {/* RoomHistory と同様の見た目でメモ一覧を表示 */}
            {isTeacherView && (
                <Card>
                    <CardHeader>
                        <CardTitle>このルームのメモ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <NotesList key={notesKey} roomId={Number(roomId)} />
                    </CardContent>
                </Card>
            )}
        </section>
    );
}