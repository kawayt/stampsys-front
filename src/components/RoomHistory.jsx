import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchStampActivity } from "../api/StampActivity";
import { fetchStampLogs } from "../api/stampLogs";
import { getStampColorByCode, getStampIconByCode } from "../lib/StampDefinition";
import NotesList from "@/components/NoteList";

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
    Button,
} from "@/components/ui/button";
import {
    Input,
} from "@/components/ui/input";
import {
    Label,
} from "@/components/ui/label";
import {
    Checkbox,
} from "@/components/ui/checkbox";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

import { ArrowLeft } from "lucide-react";

const INTERVAL_OPTIONS = [
    { value: "1 minute", label: "1分" },
    { value: "5 minutes", label: "5分" },
    { value: "15 minutes", label: "15分" },
    { value: "30 minutes", label: "30分" },
    { value: "1 hour", label: "1時間" },
];

function parseIntervalToMs(interval) {
    if (!interval) return 5 * 60 * 1000;
    if (interval.includes("minute")) {
        const n = Number(interval.split(" ")[0]);
        return n * 60 * 1000;
    }
    if (interval.includes("hour")) {
        const n = Number(interval.split(" ")[0]);
        return n * 60 * 60 * 1000;
    }
    return 5 * 60 * 1000;
}

// datetime-local (yyyy-MM-ddTHH:mm) -> ISO8601 (+09:00 付与)
function toIsoWithOffset(datetimeLocal) {
    if (!datetimeLocal) return undefined;
    return `${datetimeLocal}:00+09:00`;
}

// ISO8601 文字列 → datetime-local 用文字列 (ローカルタイム)
function toDatetimeLocal(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());

    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
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
    const navigate = useNavigate();

    const [interval, setInterval] = useState("5 minutes");
    const [activeTab, setActiveTab] = useState("graph"); // 'graph' | 'logs'
    const [start, setStart] = useState(""); // datetime-local
    const [end, setEnd] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null); // { timeline, totals, series }

    // 追加: ルーム名ステート
    const [roomName, setRoomName] = useState("");

    const [showAllKinds, setShowAllKinds] = useState(true);
    const [showTotal, setShowTotal] = useState(false);
    const [selectedKinds, setSelectedKinds] = useState([]); // ["Good","Great",...]

    // 生ログ用 state
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState("");
    const [logsLimit, setLogsLimit] = useState(100);
    const [logsOffset, setLogsOffset] = useState(0);

    // --- 追加: group フィルタ用 state ---
    const [showAllGroups, setShowAllGroups] = useState(true);
    const [selectedGroups, setSelectedGroups] = useState([]); // ["名古屋", ...]
    // ------------------------------------------------

    // roomId が変わったら状態リセット
    useEffect(() => {
        setInterval("5 minutes");
        setActiveTab("graph");
        setStart("");
        setEnd("");
        setShowAllKinds(true);
        setShowTotal(false);
        setSelectedKinds([]);
        setData(null);
        setError("");
        setLogs([]);
        setLogsError("");
        setLogsLoading(false);
        setLogsLimit(100);
        setLogsOffset(0);

        // reset group filters too
        setShowAllGroups(true);
        setSelectedGroups([]);
        // reset room name
        setRoomName("");
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

            // 追加: resp に roomName/room_name/name があれば roomName にセット
            const name = resp?.roomName ?? resp?.room_name ?? resp?.name ?? "";
            setRoomName(name);

            // 初回（開始・終了が未指定）のみ、デフォルトで範囲をセット
            if (
                !start &&
                !end &&
                resp &&
                Array.isArray(resp.timeline) &&
                resp.timeline.length > 0
            ) {
                const first = resp.timeline[0];
                const last = resp.timeline[resp.timeline.length - 1];
                setStart(toDatetimeLocal(first));
                setEnd(toDatetimeLocal(last));
            }

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

    // マウント時に一度自動取得
    useEffect(() => { handleFetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleResetSelection = () => {
        setInterval("5 minutes");
        setActiveTab("graph");
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

        // reset group selection
        setShowAllGroups(true);
        setSelectedGroups([]);

        if (data && Array.isArray(data.timeline) && data.timeline.length > 0) {
            const first = data.timeline[0];
            const last = data.timeline[data.timeline.length - 1];
            setStart(toDatetimeLocal(first));
            setEnd(toDatetimeLocal(last));
        } else {
            setStart("");
            setEnd("");
        }
    };

    const handleToggleKind = (kind) => {
        setSelectedKinds((prev) =>
            prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
        );
    };

    // --- 追加: group 用ユーティリティ ---
    const availableGroups = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        const s = new Set();
        for (const r of logs) {
            const g = r.groupName ?? r.group_name ?? null;
            if (g) s.add(g);
        }
        return Array.from(s).sort();
    }, [logs]);

    // 初回ロード後に availableGroups がある場合、selectedGroups を既定で全選択にする
    useEffect(() => {
        if (availableGroups.length > 0 && selectedGroups.length === 0) {
            setSelectedGroups(availableGroups);
            setShowAllGroups(false); // default to using explicit selection (all)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableGroups]);

    const handleToggleGroup = (group) => {
        setSelectedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
        );
    };
    // ------------------------------------------------

    // series からスタンプ名一覧（NO_STAMP を除外）
    const stampTypes = useMemo(() => {
        if (!data?.series) return [];
        return data.series
            .filter((s) => s.stampName !== "NO_STAMP")
            .map((s) => s.stampName);
    }, [data]);

    // スタンプ名 → カラーコード(bg) のマップ
    const stampColorMap = useMemo(() => {
        if (!data?.series) return {};
        const map = {};
        for (const s of data.series) {
            if (s.stampName === "NO_STAMP") continue;
            const color = getStampColorByCode(s.stampColor);
            map[s.stampName] = color.icon;
        }
        return map;
    }, [data]);

    // スタンプ名 → 表示情報（背景色・アイコン）マップ
    const stampDisplayMap = useMemo(() => {
        if (!data?.series) return {};
        const map = {};
        for (const s of data.series) {
            if (s.stampName === "NO_STAMP") continue;
            const color = getStampColorByCode(s.stampColor);
            const { Icon } = getStampIconByCode(s.stampIcon);
            map[s.stampName] = {
                bg: color.bg,
                iconColor: color.icon,
                icon: Icon,
            };
        }
        return map;
    }, [data]);

    // ChartContainer 用の設定（凡例・ツールチップの色指定）
    const chartConfig = useMemo(() => {
        const cfg = {};
        for (const name of stampTypes) {
            cfg[name] = {
                label: name,
                color: stampColorMap[name] || "#6b7280",
            };
        }
        cfg.total = { label: "合計", color: "#0ea5e9" };
        return cfg;
    }, [stampTypes, stampColorMap]);

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

    // --- 生ログ取得処理 ---
    // stampIcon/stampColor はバックエンドが返す場合に備えて追加で正規化
    const normalizeLogRow = (r) => ({
        // stamp_log 側で camelCase や snake_case どちらでも受け取れるように
        id: r.stampLogId ?? r.stamp_log_id ?? r.id ?? r.log_id ?? r.logId ?? null,
        userId: r.userId ?? r.user_id ?? r.user ?? null,
        senderName: r.senderName ?? r.sender_name ?? r.displayName ?? r.userName ?? null,
        stampId: r.stampId ?? r.stamp_id ?? r.stamp ?? null,
        // stampName, stampIcon, stampColor: snake_case でも camelCase でも拾う
        stampName: r.stampName ?? r.stamp_name ?? null,
        stampIcon: r.stampIcon ?? r.stamp_icon ?? null,
        stampColor: r.stampColor ?? r.stamp_color ?? null,
        sentAt: r.sentAt ?? r.sent_at ?? r.timestamp ?? null,
        // --- 追加: group 情報を正規化して保持 ---
        groupId: r.groupId ?? r.group_id ?? null,
        groupName: r.groupName ?? r.group_name ?? null,
    });

    const loadLogs = async () => {
        setLogsLoading(true);
        setLogsError("");
        try {
            const resp = await fetchStampLogs(roomId, {
                start: toIsoWithOffset(start),
                end: toIsoWithOffset(end),
                limit: logsLimit,
                offset: logsOffset,
            });
            const list = Array.isArray(resp) ? resp.map(normalizeLogRow) : [];
            setLogs(list);
        } catch (e) {
            console.error(e);
            setLogsError(e.message || "ログの取得に失敗しました");
        } finally {
            setLogsLoading(false);
        }
    };

    // 生ログを表示するタブになったときにロード
    useEffect(() => {
        if (activeTab === "logs") loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, logsLimit, logsOffset, start, end, interval]);

    // --- interval ごとにグルーピングする処理（スタンプごと・送信者ごとに分離） ---
    const groupedLogs = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        const intervalMs = parseIntervalToMs(interval);
        // sort by time ascending
        const sorted = [...logs].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

        const groups = new Map(); // bucketStartMs -> { bucketStartMs, entries: Map<entryKey, entry>, firstTs, lastTs }

        for (const row of sorted) {
            // --- 追加: groupName によるフィルタ ---
            if (!showAllGroups) {
                const gName = row.groupName ?? null;
                if (!gName || !selectedGroups.includes(gName)) {
                    continue;
                }
            }
            // フィルタ: showAllKinds が false の場合、selectedKinds に含まれないスタンプは無視する
            if (!showAllKinds) {
                const stampName = row.stampName ?? null;
                // もし stampName が無ければ（IDしかない等）除外してしまう選択にしています。
                if (!stampName || !selectedKinds.includes(stampName)) {
                    continue;
                }
            }

            const ts = new Date(row.sentAt).getTime();
            if (Number.isNaN(ts)) continue;
            const bucket = Math.floor(ts / intervalMs) * intervalMs;
            let g = groups.get(bucket);
            if (!g) {
                g = {
                    bucketStartMs: bucket,
                    firstTs: ts,
                    lastTs: ts,
                    entries: new Map(), // key: `${stampKey}||${senderKey}`
                };
                groups.set(bucket, g);
            } else {
                if (ts < g.firstTs) g.firstTs = ts;
                if (ts > g.lastTs) g.lastTs = ts;
            }

            const stampKey = row.stampName ?? `stamp-${row.stampId}`;
            const senderKey = row.senderName ?? `user-${row.userId}`;

            const entryKey = `${stampKey}||${senderKey}`;
            const existing = g.entries.get(entryKey);
            if (existing) {
                existing.count += 1;
                // if icon/color missing but row has them, prefer row values
                if (existing.icon == null && row.stampIcon != null) existing.icon = row.stampIcon;
                if (existing.color == null && row.stampColor != null) existing.color = row.stampColor;
            } else {
                g.entries.set(entryKey, {
                    key: entryKey,
                    stampName: row.stampName ?? null,
                    stampId: row.stampId ?? null,
                    senderName: row.senderName ?? senderKey,
                    count: 1,
                    icon: row.stampIcon ?? null,
                    color: row.stampColor ?? null,
                });
            }
        }

        // convert to array sorted by bucket
        const arr = Array.from(groups.values())
            .sort((a, b) => a.bucketStartMs - b.bucketStartMs)
            .map((g) => {
                const entries = Array.from(g.entries.values())
                    // stable sort: by stampName then senderName for consistent display
                    .sort((a, b) => {
                        const an = (a.stampName ?? "").toString();
                        const bn = (b.stampName ?? "").toString();
                        if (an < bn) return -1;
                        if (an > bn) return 1;
                        const sa = (a.senderName ?? "").toString();
                        const sb = (b.senderName ?? "").toString();
                        if (sa < sb) return -1;
                        if (sa > sb) return 1;
                        return 0;
                    });
                return {
                    bucketStartMs: g.bucketStartMs,
                    firstTs: g.firstTs,
                    lastTs: g.lastTs,
                    entries,
                };
            });

        return arr;
    }, [logs, interval, stampDisplayMap, showAllKinds, selectedKinds, showAllGroups, selectedGroups]);
    // --- グルーピング処理終わり ---

    function formatDateTime(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return String(iso);
        return d.toLocaleString();
    }

    // helper: スタンプピルを返す（entry 単位）
    const renderStampPill = (e) => {
        const stampKey = e.stampName ?? `stamp-${e.stampId}`;
        const display = stampDisplayMap?.[stampKey] ?? null;

        const colorFromEntry = e.color ?? null;
        const iconCodeFromEntry = e.icon ?? null;

        let bg = display?.bg ?? "#f9fafb";
        let iconColor = display?.iconColor ?? "#4b5563";
        let IconComponent = display?.icon ?? null;

        if (colorFromEntry != null) {
            const c = getStampColorByCode(colorFromEntry);
            bg = c.bg;
            iconColor = c.icon;
        }

        if (iconCodeFromEntry != null) {
            const { Icon } = getStampIconByCode(iconCodeFromEntry);
            IconComponent = Icon;
        }

        const text = e.stampName ?? `stamp-${e.stampId ?? ""}`;

        return (
            <div
                key={e.key}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1 border border-slate-100 shadow-sm text-slate-700"
                style={{ backgroundColor: bg, color: iconColor }}
                title={text}
            >
                {IconComponent && (
                    <IconComponent className="h-4 w-4" />
                )}
                <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">{text}</span>
                    <span className="text-xs text-slate-600">{e.senderName}</span>
                </div>
                {e.count > 1 && (
                    <span className="ml-2 text-xs bg-white/40 text-slate-700 px-1 rounded">
                        {e.count}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 py-4">
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

            {/* ヘッダ */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">スタンプ履歴 - ルーム{roomId}</h2>
                    {roomName && (
                        <p className="mt-1 text-xl font-bold">{roomName}</p>
                    )}
                </div>

                {/* タブ切替（画面中央付近、タイトルの右側） */}
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-auto"
                >
                    <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="graph" className="px-3 py-1 text-sm">
                            グラフ
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="px-3 py-1 text-sm">
                            ログ
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* 条件入力 */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <Label className="text-sm font-medium" htmlFor="interval-select">
                        表示間隔
                    </Label>
                    <Select
                        value={interval}
                        onValueChange={setInterval}
                    >
                        <SelectTrigger
                            id="interval-select"
                            className="border rounded px-2 py-1 text-sm w-[140px]"
                        >
                            <SelectValue placeholder="interval" />
                        </SelectTrigger>
                        <SelectContent>
                            {INTERVAL_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label className="text-sm font-medium" htmlFor="start-datetime">
                        開始時刻（オプション）
                    </Label>
                    <Input
                        id="start-datetime"
                        type="datetime-local"
                        className="border rounded px-2 py-1 text-sm w-[220px]"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-sm font-medium" htmlFor="end-datetime">
                        終了時刻（オプション）
                    </Label>
                    <Input
                        id="end-datetime"
                        type="datetime-local"
                        className="border rounded px-2 py-1 text-sm w-[220px]"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        className="px-3 py-1 text-sm"
                        onClick={handleFetch}
                        disabled={loading}
                    >
                        {loading ? "取得中..." : "取得"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="px-3 py-1 text-sm"
                        onClick={handleResetSelection}
                    >
                        リセット
                    </Button>
                </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {/* タブ切替に応じて表示を切り替え */}
            {activeTab === "graph" && (
                <>
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
                                        config={chartConfig}
                                        style={{ minHeight: 240, minWidth: 0 }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="timeLabel" />
                                                <YAxis allowDecimals={false} />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                {visibleStampTypes.map((kind) => (
                                                    <Line
                                                        key={kind}
                                                        type="monotone"
                                                        dataKey={kind}
                                                        stroke={stampColorMap[kind] || "#6b7280"}
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                        isAnimationActive={false}
                                                    />
                                                ))}
                                                {showTotal && (
                                                    <Line
                                                        type="monotone"
                                                        dataKey="total"
                                                        stroke="#000000"
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
                                <CardTitle>表示設定</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="show-all-kinds"
                                        checked={showAllKinds}
                                        onCheckedChange={(v) => setShowAllKinds(Boolean(v))}
                                    />
                                    <Label htmlFor="show-all-kinds" className="text-sm font-normal">
                                        すべてのスタンプを表示
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="show-total"
                                        checked={showTotal}
                                        onCheckedChange={(v) => setShowTotal(Boolean(v))}
                                    />
                                    <Label htmlFor="show-total" className="text-sm font-normal">
                                        合計スタンプ数を表示
                                    </Label>
                                </div>

                                <div className="border-t pt-2 space-y-1">
                                    {stampTypes.map((kind) => {
                                        const display = stampDisplayMap[kind];
                                        const IconComponent = display?.icon;
                                        return (
                                            <div
                                                key={kind}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`stamp-kind-${kind}`}
                                                        checked={
                                                            showAllKinds || selectedKinds.includes(kind)
                                                        }
                                                        disabled={showAllKinds}
                                                        onCheckedChange={() => handleToggleKind(kind)}
                                                    />
                                                    <Label
                                                        htmlFor={`stamp-kind-${kind}`}
                                                        className="text-sm font-normal"
                                                    >
                                                            <span
                                                                className="
                                                                    inline-flex items-center gap-1
                                                                    rounded-xl pl-1 pr-2 py-1
                                                                    border border-slate-100
                                                                    shadow-sm
                                                                    text-slate-700
                                                                "
                                                                style={{
                                                                    backgroundColor:
                                                                        display?.bg ?? "#f9fafb",
                                                                    color: display?.iconColor ?? "#4b5563",
                                                                }}
                                                            >
                                                                {IconComponent && (
                                                                    <IconComponent className="h-4 w-4" />
                                                                )}
                                                                <span className="text-xs font-medium">
                                                                    {kind}
                                                                </span>
                                                            </span>
                                                    </Label>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                        {totalPerKind[kind] ?? 0}
                                                    </span>
                                            </div>
                                        );
                                    })}
                                </div>

                            </CardContent>
                        </Card>
                    </div>

                    {/* ルームに残したメモ一覧 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>このルームのメモ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <NotesList roomId={Number(roomId)} />
                        </CardContent>
                    </Card>
                </>
            )}

            {activeTab === "logs" && (
                <Card>
                    <CardHeader>
                        <CardTitle>スタンプログ（{interval} ごとにまとめて表示）</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* ログ用のフィルタUI: グラフ側の選択状態を保持 */}
                        <div className="mb-3 border-b pb-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="logs-show-all-kinds"
                                        checked={showAllKinds}
                                        onCheckedChange={(v) => setShowAllKinds(Boolean(v))}
                                    />
                                    <Label htmlFor="logs-show-all-kinds" className="text-sm font-normal">
                                        すべてのスタンプを表示
                                    </Label>
                                </div>
                            </div>

                            {!showAllKinds && (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                    {stampTypes.map((kind) => {
                                        const display = stampDisplayMap[kind];
                                        const IconComponent = display?.icon;
                                        return (
                                            <label key={kind} className="inline-flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedKinds.includes(kind)}
                                                    onChange={() => handleToggleKind(kind)}
                                                />
                                                <span
                                                    className="inline-flex items-center gap-1 rounded-xl pl-1 pr-2 py-1 border border-slate-100 shadow-sm text-slate-700"
                                                    style={{
                                                        backgroundColor: display?.bg ?? "#f9fafb",
                                                        color: display?.iconColor ?? "#4b5563",
                                                    }}
                                                >
                                                    {IconComponent && (
                                                        <IconComponent className="h-4 w-4" />
                                                    )}
                                                    <span className="text-xs">{kind}</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* --- 追加: logs タブ側にも group フィルタUI を簡易表示 --- */}
                        <div className="mb-3 border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="logs-show-all-groups"
                                    checked={showAllGroups}
                                    onCheckedChange={(v) => setShowAllGroups(Boolean(v))}
                                />
                                <Label htmlFor="logs-show-all-groups" className="text-sm font-normal">
                                    すべてのグループを表示
                                </Label>
                            </div>
                            {!showAllGroups && (
                                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                    {availableGroups.map((g) => (
                                        <label key={g} className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.includes(g)}
                                                onChange={() => handleToggleGroup(g)}
                                            />
                                            <span className="text-xs">{g}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* --- group filter UI end --- */}

                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm flex items-center gap-2">
                                表示件数:
                                <input
                                    type="number"
                                    value={logsLimit}
                                    onChange={(e) => setLogsLimit(Math.max(1, Number(e.target.value) || 1))}
                                    className="ml-2 w-20 rounded border px-2 py-1 text-sm"
                                />
                            </label>
                            <label className="text-sm flex items-center gap-2">
                                offset:
                                <input
                                    type="number"
                                    value={logsOffset}
                                    onChange={(e) => setLogsOffset(Math.max(0, Number(e.target.value) || 0))}
                                    className="ml-2 w-20 rounded border px-2 py-1 text-sm"
                                />
                            </label>
                            <Button onClick={loadLogs} className="ml-auto text-sm">更新</Button>
                        </div>

                        {logsLoading && <div className="text-sm text-slate-500">読み込み中...</div>}
                        {logsError && <div className="text-sm text-red-600">エラー: {logsError}</div>}

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border-collapse">
                                <thead>
                                <tr>
                                    <th className="border px-2 py-1 text-left">時刻帯</th>
                                    <th className="border px-2 py-1 text-left">スタンプ（アイコン / 名称 / 件数 / 送信者）</th>
                                </tr>
                                </thead>
                                <tbody>
                                {groupedLogs.length === 0 && !logsLoading && (
                                    <tr><td className="p-4" colSpan={2}>データがありません</td></tr>
                                )}
                                {groupedLogs.map((g) => (
                                    <tr key={g.bucketStartMs} className="border-b odd:bg-white even:bg-slate-50 align-top">
                                        <td className="px-2 py-2 align-top w-[160px]">
                                            <div className="text-sm font-medium">{formatDateTime(new Date(g.bucketStartMs).toISOString())}</div>
                                        </td>
                                        <td className="px-2 py-2 align-top">
                                            <div className="flex flex-wrap gap-2">
                                                {g.entries.map((e) => (
                                                    <div key={e.key} className="flex flex-col">
                                                        {renderStampPill(e)}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                variant="outline"
                                className="px-2 py-1 text-sm"
                                onClick={() => setLogsOffset(Math.max(0, logsOffset - logsLimit))}
                                disabled={logsOffset === 0}
                            >
                                前へ
                            </Button>
                            <Button
                                variant="outline"
                                className="px-2 py-1 text-sm"
                                onClick={() => setLogsOffset(logsOffset + logsLimit)}
                            >
                                次へ
                            </Button>
                            <div className="text-sm text-slate-500">表示 {groupedLogs.length} バケット（合計 {logs.length} 件）</div>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

export default RoomHistory;