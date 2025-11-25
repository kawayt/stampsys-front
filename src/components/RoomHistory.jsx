import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStampActivity } from "../api/stampActivity";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

const INTERVAL_OPTIONS = [
    { value: "1 minute", label: "1 minute" },
    { value: "5 minutes", label: "5 minutes" },
    { value: "15 minutes", label: "15 minutes" },
    { value: "30 minutes", label: "30 minutes" },
    { value: "1 hour", label: "1 hour" },
];

// datetime-local (yyyy-MM-ddTHH:mm) -> ISO8601 (+09:00 付与)
function toIsoWithOffset(datetimeLocal) {
    if (!datetimeLocal) return undefined;
    return `${datetimeLocal}:00+09:00`;
}

// "2025-11-25T00:20:00Z" → "00:20"
function formatTimeLabel(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function RoomHistory() {
    const { roomId } = useParams();

    const [interval, setInterval] = useState("5 minutes");
    const [start, setStart] = useState(""); // datetime-local
    const [end, setEnd] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null); // { timeline, totals, series }

    const [showAllKinds, setShowAllKinds] = useState(true);
    const [showTotal, setShowTotal] = useState(false);
    const [selectedKinds, setSelectedKinds] = useState([]); // ["Good","Great",...]

    // roomId が変わったら状態リセット（実際は1つだが保険として残す）
    useEffect(() => {
        setInterval("5 minutes");
        setStart("");
        setEnd("");
        setShowAllKinds(true);
        setShowTotal(false);
        setSelectedKinds([]);
        setData(null);
        setError("");
    }, [roomId]);

    const handleFetch = async () => {
        if (start && end && start > end) {
            setError("開始時刻は終了時刻より前にしてください。");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const resp = await fetchStampActivity({
                roomId,
                interval,
                start: toIsoWithOffset(start),
                end: toIsoWithOffset(end),
            });

            setData(resp);

            if (resp && Array.isArray(resp.series)) {
                const names = resp.series
                    .filter((s) => s.stampName !== "NO_STAMP")
                    .map((s) => s.stampName);
                setSelectedKinds(names);
            }
        } catch (e) {
            console.error(e);
            setError(e.message || "スタンプ履歴の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    const handleResetSelection = () => {
        setInterval("5 minutes");
        setStart("");
        setEnd("");
        setShowAllKinds(true);
        setShowTotal(false);

        if (data?.series) {
            const names = data.series
                .filter((s) => s.stampName !== "NO_STAMP")
                .map((s) => s.stampName);
            setSelectedKinds(names);
        } else {
            setSelectedKinds([]);
        }
    };

    const handleToggleKind = (kind) => {
        setSelectedKinds((prev) =>
            prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
        );
    };

    // series からスタンプ名一覧（NO_STAMP を除外）
    const stampTypes = useMemo(() => {
        if (!data?.series) return [];
        return data.series
            .filter((s) => s.stampName !== "NO_STAMP")
            .map((s) => s.stampName);
    }, [data]);

    // 表示対象のスタンプ種別
    const visibleStampTypes = useMemo(() => {
        if (showAllKinds) return stampTypes;
        return stampTypes.filter((k) => selectedKinds.includes(k));
    }, [showAllKinds, stampTypes, selectedKinds]);

    // recharts 用の配列へ変換
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data.timeline)) return [];

        const { timeline, totals, series } = data;

        return timeline.map((t, idx) => {
            const row = {
                timeLabel: formatTimeLabel(t),
            };

            if (Array.isArray(series)) {
                for (const s of series) {
                    if (s.stampName === "NO_STAMP") continue;
                    const value =
                        Array.isArray(s.values) && s.values.length > idx
                            ? s.values[idx]
                            : 0;
                    row[s.stampName] = value;
                }
            }

            if (Array.isArray(totals) && totals.length > idx) {
                row.total = totals[idx];
            }

            return row;
        });
    }, [data]);

    // スタンプ毎の総数（サイドバー表示用）
    const totalPerKind = useMemo(() => {
        if (!data?.series) return {};
        const result = {};
        for (const s of data.series) {
            if (s.stampName === "NO_STAMP") continue;
            const sum = (s.values || []).reduce((acc, v) => acc + v, 0);
            result[s.stampName] = sum;
        }
        return result;
    }, [data]);

    const hasTableData =
        data &&
        Array.isArray(data.timeline) &&
        data.timeline.length > 0 &&
        Array.isArray(data.series) &&
        data.series.length > 0;

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* ヘッダ */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">スタンプ履歴 - ルーム{roomId}</h2>
            </div>

            {/* 条件入力（roomId セレクト削除済み） */}
            <div className="flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">interval</label>
                    <select
                        className="border rounded px-2 py-1"
                        value={interval}
                        onChange={(e) => setInterval(e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        start (optional)
                    </label>
                    <input
                        type="datetime-local"
                        className="border rounded px-2 py-1"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        end (optional)
                    </label>
                    <input
                        type="datetime-local"
                        className="border rounded px-2 py-1"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        className="border rounded px-3 py-1 bg-blue-600 text-white text-sm"
                        onClick={handleFetch}
                        disabled={loading}
                    >
                        {loading ? "取得中..." : "取得"}
                    </button>
                    <button
                        type="button"
                        className="border rounded px-3 py-1 text-sm"
                        onClick={handleResetSelection}
                    >
                        選択リセット
                    </button>
                </div>
            </div>

            {/* API 説明 */}

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                {/* グラフエリア */}
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>スタンプ履歴グラフ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartData.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                データがありません。条件を指定して「取得」を押してください。
                            </div>
                        ) : (
                            <ChartContainer
                                className="h-80 w-full"
                                config={{
                                    Good: { label: "Good", color: "hsl(var(--chart-1))" },
                                    Great: { label: "Great", color: "hsl(var(--chart-2))" },
                                    Bad: { label: "Bad", color: "hsl(var(--chart-3))" },
                                    total: { label: "合計", color: "hsl(var(--chart-4))" },
                                }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="timeLabel" />
                                        <YAxis allowDecimals={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        {visibleStampTypes.map((kind, index) => (
                                            <Line
                                                key={kind}
                                                type="monotone"
                                                dataKey={kind}
                                                stroke={["#f97316", "#22c55e", "#6b7280"][index % 3]}
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                        {showTotal && (
                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                stroke="#0ea5e9"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                isAnimationActive={false}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>

                {/* スタンプ一覧・設定 */}
                <Card>
                    <CardHeader>
                        <CardTitle>スタンプ一覧</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={showAllKinds}
                                    onChange={(e) => setShowAllKinds(e.target.checked)}
                                />
                                <span>全種類表示</span>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={showTotal}
                                    onChange={(e) => setShowTotal(e.target.checked)}
                                />
                                <span>合計（全スタンプ総数）を表示</span>
                            </label>
                        </div>

                        <div className="border-t pt-2 space-y-1">
                            {stampTypes.map((kind) => (
                                <label
                                    key={kind}
                                    className="flex items-center justify-between gap-2"
                                >
                  <span className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={showAllKinds || selectedKinds.includes(kind)}
                        disabled={showAllKinds}
                        onChange={() => handleToggleKind(kind)}
                    />
                    <span>{kind}</span>
                  </span>
                                    <span className="text-xs text-muted-foreground">
                    ({totalPerKind[kind] ?? 0})
                  </span>
                                </label>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* テーブル表示 */}
            <Card>
                <CardHeader>
                    <CardTitle>スタンプ集計表</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                    {hasTableData ? (
                        <table className="min-w-full text-xs border-collapse">
                            <thead>
                            <tr>
                                <th className="border px-2 py-1 text-left">スタンプ</th>
                                {data.timeline.map((t, idx) => (
                                    <th key={idx} className="border px-2 py-1">
                                        {formatTimeLabel(t)}
                                    </th>
                                ))}
                                <th className="border px-2 py-1">合計</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.series
                                .filter((s) => s.stampName !== "NO_STAMP")
                                .map((s) => (
                                    <tr key={s.stampId}>
                                        <td className="border px-2 py-1">{s.stampName}</td>
                                        {data.timeline.map((_, idx) => (
                                            <td
                                                key={idx}
                                                className="border px-2 py-1 text-right"
                                            >
                                                {s.values?.[idx] ?? 0}
                                            </td>
                                        ))}
                                        <td className="border px-2 py-1 text-right">
                                            {(s.values || []).reduce((acc, v) => acc + v, 0)}
                                        </td>
                                    </tr>
                                ))}
                            <tr>
                                <td className="border px-2 py-1">合計（件数）</td>
                                {data.timeline.map((_, idx) => (
                                    <td
                                        key={idx}
                                        className="border px-2 py-1 text-right"
                                    >
                                        {data.totals?.[idx] ?? 0}
                                    </td>
                                ))}
                                <td className="border px-2 py-1 text-right">
                                    {(data.totals || []).reduce((acc, v) => acc + v, 0)}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            データがありません。
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default RoomHistory;