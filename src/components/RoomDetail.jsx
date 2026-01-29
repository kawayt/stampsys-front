import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition.js";
import { sendStamp } from "../api/StampSendApi.js";
import { ArrowLeft } from "lucide-react";
import NoteForm from "@/components/NoteForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function SimpleBarChart({ data }) {
    const prevCountsRef = useRef({});
    const [flashingItems, setFlashingItems] = useState(new Set());

    useEffect(() => {
        if (!data) return;

        const newFlashing = new Set();
        let hasChange = false;

        data.forEach((d) => {
            const id = d.stampId ?? d.stampName;
            const current = d.count || 0;
            const prev = prevCountsRef.current[id];

            // 初回 (undefined) は除外、値が増えた場合のみフラグを立てる
            if (prev !== undefined && current > prev) {
                newFlashing.add(id);
                hasChange = true;
            }
            prevCountsRef.current[id] = current;
        });

        if (hasChange) {
            setFlashingItems((prev) => {
                const next = new Set(prev);
                newFlashing.forEach((id) => next.add(id));
                return next;
            });

            // 0.5秒後にフラッシュを解除
            const timer = setTimeout(() => {
                setFlashingItems((prev) => {
                    const next = new Set(prev);
                    newFlashing.forEach((id) => next.delete(id));
                    return next;
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [data]);

    if (!data || data.length === 0) return null;

    return (
        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100">
            {data.map((d, i) => {
                const id = d.stampId ?? d.stampName;
                const isNotJoined = d.stampName === "未参加";
                const isFlashing = flashingItems.has(id);

                // 割合に合わせた長さに設定
                const widthPercent = `${d.percentage ?? 0}%`;

                // 未参加の場合はグレー系に固定
                const baseBgColor = isNotJoined ? "#f1f5f9" : (d.color?.bg ?? "#fff");

                // バーの色
                const barColor = isNotJoined
                    ? "#cbd5e1" // slate-300
                    : (d.color?.icon ?? "#fb923c");

                const textColor = isNotJoined
                    ? "#64748b" // slate-500
                    : (d.color?.icon ?? d.color?.fg ?? d.color?.text ?? "inherit");

                // アイコン: 背景色なし(透明)、色のみ適用
                const iconColor = d.color?.icon ?? "#000";

                const IconComponent = d.icon;
                
                // 点滅時のスタイル: フィルタで彩度と明度を操作して「濃く鮮やかに」する
                const rowStyle = {
                    backgroundColor: baseBgColor,
                    filter: isFlashing ? "brightness(0.92) saturate(1.4)" : "none",
                };

                return (
                    <React.Fragment key={id}>
                        {isNotJoined && i > 0 && (
                            <div className="border-t-2 border-dashed border-slate-300" />
                        )}
                        <div
                            className={`flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-2 px-3 py-2 transition-all duration-200 ease-out ${isNotJoined ? "opacity-80" : ""}`}
                            style={rowStyle}
                        >
                            <div className="flex items-center gap-3 flex-1 md:flex-none md:w-44 shrink-0 min-w-0">
                                {isNotJoined ? (
                                    // 未参加の場合はアイコンなし
                                    <div className="h-8 w-8 md:h-10 md:w-10 shrink-0 flex items-center justify-center text-slate-300"></div>
                                ) : (
                                    <div
                                        className="flex items-center justify-center h-8 md:h-10 w-8 md:w-10 shrink-0"
                                        style={{ backgroundColor: "transparent", color: iconColor }}
                                    >
                                        {IconComponent && (
                                            <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
                                        )}
                                    </div>
                                )}
                                <span className="font-medium truncate text-sm md:text-base" style={{ color: textColor }}>
                                    {d.stampName}
                                </span>
                            </div>

                            <div className="order-last md:order-0 w-full md:flex-1 md:w-auto min-w-0">
                                <div className="h-6 md:h-8 w-full rounded-full bg-white/60 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 ease-in-out"
                                        style={{ width: widthPercent, backgroundColor: barColor }}
                                    />
                                </div>
                            </div>

                            <div className="w-auto md:w-28 text-right text-slate-600 shrink-0">
                                <span className="text-base md:text-lg font-semibold mr-1">{d.count}人</span>
                                <span className="text-[10px] md:text-xs text-slate-400">/ {(d.percentage ?? 0).toFixed(1)}%</span>
                            </div>
                        </div>
                    </React.Fragment>
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

    const [sendingStampId, setSendingStampId] = useState(null);
    const [sendSuccess, setSendSuccess] = useState(false); // 送信成功状態
    const [message, setMessage] = useState("");

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);

    const [summary, setSummary] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);

    // 追加: ルーム名を保持するステート
    const [roomName, setRoomName] = useState("");

    const isTeacherView = role === "ADMIN" || role === "TEACHER";

    const sseRef = useRef(null);

    // 送信中のスタンプ情報を取得
    const sendingStamp = useMemo(() => {
        return stamps.find((s) => s.stampId === sendingStampId);
    }, [stamps, sendingStampId]);

    // オーバーレイ表示用のデータを準備
    const overlayData = useMemo(() => {
        if (!sendingStamp) return null;
        const color = getStampColorByCode(sendingStamp.stampColor);
        const { Icon } = getStampIconByCode(sendingStamp.stampIcon);
        return {
            name: sendingStamp.stampName,
            bg: color.bg,
            fg: color.icon,
            IconComponent: Icon
        };
    }, [sendingStamp]);

    const processedSummary = useMemo(() => {
        if (!summary) return [];
        const result = [...summary];

        // 1. stamps の定義順序マップを作成
        const stampOrder = new Map();
        if (Array.isArray(stamps)) {
            stamps.forEach((s, i) => stampOrder.set(String(s.stampId), i));
        }

        // 2. ソート (通常スタンプは定義順、NO_STAMPは最後)
        result.sort((a, b) => {
            const nameA = a.stampName ? String(a.stampName).trim() : "";
            const nameB = b.stampName ? String(b.stampName).trim() : "";
            
            const isNoStampA = nameA === "NO_STAMP";
            const isNoStampB = nameB === "NO_STAMP";

            if (isNoStampA && !isNoStampB) return 1;
            if (!isNoStampA && isNoStampB) return -1;
            if (isNoStampA && isNoStampB) return 0;

            const idA = String(a.stampId);
            const idB = String(b.stampId);

            const idxA = stampOrder.has(idA) ? stampOrder.get(idA) : 9999;
            const idxB = stampOrder.has(idB) ? stampOrder.get(idB) : 9999;
            return idxA - idxB;
        });

        // 3. NO_STAMP の名前変更
        return result.map((d) => {
            const name = d.stampName ? String(d.stampName).trim() : "";
            if (name === "NO_STAMP") {
                return { ...d, stampName: "未参加" };
            }
            return d;
        });
    }, [summary, stamps]);

    // stamps エンドポイントは既存の配列を返す場合と、{ roomName, stamps: [...] } のように
    // room 名を含めて返す場合の両方に対応するようにしています。
    const fetchStamps = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/stamps`);
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
            const url = `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/users/${encodeURIComponent(userId)}/stamp-logs`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`履歴の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            setHistory(data || []);
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
            const url = `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/stamp-summary`;
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
            const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}`);
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

        const url = `${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/stamp-summary/stream`;
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

        setSendingStampId(stampId);
        setSendSuccess(false);
        setMessage("");

        try {
            const result = await sendStamp(userId, stampId, Number(roomId));

            if (result.success) {
                // 送信成功時に成功フラグを立てる
                setSendSuccess(true);

                // 成功演出のために1.5秒ほど待機してからオーバーレイを閉じる
                // メッセージ表示は行わず、オーバーレイ内の演出で完結させる
                await new Promise((resolve) => setTimeout(resolve, 1500));
                
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
            setSendingStampId(null);
            setSendSuccess(false);
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
                    <h2 className="text-xl font-bold">ルーム詳細 - {roomName && <span>{roomName}</span>}</h2>
                </div>
            </div>

            {(!stamps || stamps.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このルームに紐づくスタンプは登録されていません。
                </p>
            ) : !isTeacherView ? (
                // --- 学生（一般ユーザー）向けレイアウト ---
                <div className="flex-1 flex flex-col min-h-[60vh]">
                    {/* スタンプボタン一覧: 画面中央に配置 */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl sm:grid-cols-3 md:grid-cols-4">
                            {stamps.map((s) => {
                                const color = getStampColorByCode(s.stampColor);
                                const { Icon } = getStampIconByCode(s.stampIcon);

                                return (
                                    <button
                                        type="button"
                                        key={s.stampId ?? `${s.stampName}-${s.stampColor}-${s.stampIcon}`}
                                        className="
                                                aspect-square flex flex-col items-center justify-center rounded-2xl
                                                border border-slate-100
                                                shadow-sm
                                                hover:shadow-md hover:scale-105 active:scale-95
                                                transition-all relative
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                            "
                                        style={{
                                            backgroundColor: color.bg,
                                            color: color.icon,
                                        }}
                                        onClick={() => handleStampClick(s.stampId)}
                                        disabled={sendingStampId !== null || !userId}
                                    >
                                        <div className="mb-2 h-12 w-12 flex items-center justify-center">
                                            <Icon className="h-12 w-12" />
                                        </div>
                                        <span className="text-sm font-bold">
                                            {s.stampName}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {message && !sendSuccess && (
                            <div className="mt-8 rounded-full px-6 py-2 text-sm font-bold bg-white/80 backdrop-blur text-red-600 shadow-lg border border-red-100 animate-in slide-in-from-bottom-2">
                                {message}
                            </div>
                        )}
                        
                        <p className="mt-8 text-xs text-slate-400 opacity-70">
                            スタンプをクリックして送信
                        </p>
                    </div>

                    {/* 送信履歴: 画面下部にフローティング */}
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[90vw]">
                         <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-400 hidden sm:block whitespace-nowrap">あなたの履歴</span>
                            
                            {historyLoading ? (
                                <p className="text-xs text-slate-500">...</p>
                            ) : historyError ? (
                                <span className="text-xs text-red-400">×</span>
                            ) : history.length === 0 ? (
                                <span className="text-xs text-slate-400">まだ履歴がありません</span>
                            ) : (
                                <div className="flex -space-x-3 sm:hover:space-x-2 transition-all duration-500 ease-out pl-2">
                                    <TooltipProvider delayDuration={0}>
                                        {history.slice(0, 8).map((h, idx) => {
                                            const color = getStampColorByCode(h.stampColor);
                                            const { Icon } = getStampIconByCode(h.stampIcon);

                                            return (
                                                <Tooltip key={`${h.stampId}-${idx}-${h.sentAt}`}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className="relative h-10 w-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-all duration-300 hover:scale-110 sm:hover:scale-110 hover:z-20"
                                                            style={{
                                                                backgroundColor: color.bg,
                                                                color: color.icon,
                                                                zIndex: 20 - idx,
                                                            }}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{h.stampName}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </TooltipProvider>
                                    {history.length > 8 && (
                                        <div 
                                            className="relative h-10 w-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 transition-all duration-300 hover:scale-110 hover:z-20"
                                            style={{ zIndex: 0 }}
                                        >
                                            +{history.length - 8}
                                        </div>
                                    )}
                                </div>
                            )}
                         </div>
                    </div>
                    {/* フローティング要素の分の余白 */}
                    <div className="h-24"></div>
                </div>
            ) : (
                // --- 教員（管理者）向けレイアウト（既存維持） ---
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent>
                        {summaryLoading && (
                            <p className="mt-2 text-xs text-slate-500">集計を読み込み中...</p>
                        )}
                        {summaryError && (
                            <p className="mt-2 text-xs text-red-500">集計を取得できませんでした: {summaryError}</p>
                        )}
                        {!summaryLoading && !summaryError && processedSummary && processedSummary.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium">スタンプ送信状況（最新）</h3>
                                <SimpleBarChart data={processedSummary} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {isTeacherView && (
                <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardContent>
                        <section>
                            <h3 className="text-lg font-medium">授業メモ</h3>
                            <div className="mt-4">
                                <NoteForm roomId={Number(roomId)} />
                            </div>
                        </section>
                    </CardContent>
                </Card>
            )}
            {/* 送信成功時のオーバーレイアニメーション */}
            {overlayData && sendSuccess && (
                <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div 
                        className="flex h-40 w-40 items-center justify-center rounded-full shadow-2xl animate-in zoom-in duration-300"
                        style={{
                            backgroundColor: overlayData.bg,
                            color: overlayData.fg,
                            boxShadow: `0 0 60px ${overlayData.bg}`,
                        }}
                    >
                        {overlayData.IconComponent && (
                            <overlayData.IconComponent className="h-20 w-20" />
                        )}
                    </div>
                    <div className="mt-8 text-white text-center animate-in slide-in-from-bottom-4 duration-300 delay-100 fill-mode-forwards">
                        <p className="text-3xl font-bold drop-shadow-md">{overlayData.name}</p>
                        <p className="mt-3 text-lg opacity-90 font-medium">
                            送信しました！
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
