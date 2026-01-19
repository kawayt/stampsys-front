import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchStampActivity } from "../api/StampActivity";
import { fetchStampLogs } from "../api/stampLogs";
import { getStampColorByCode, getStampIconByCode } from "../lib/StampDefinition";
import NoteForm from "@/components/NoteForm";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

// Chart.js Registration
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- 定数とヘルパー ---

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

function toIsoWithOffset(datetimeLocal) {
    if (!datetimeLocal) return undefined;
    return `${datetimeLocal}:00+09:00`;
}

function toDatetimeLocal(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());

    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function formatTimeLabel(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
}

// --- メインコンポーネント ---

function RoomHistory() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // -- state: フィルタ --
    const [interval, setInterval] = useState("5 minutes");
    const [activeTab, setActiveTab] = useState("graph"); // 'graph' | 'logs'
    const [start, setStart] = useState(""); // datetime-local 形式
    const [end, setEnd] = useState("");
    
    // 入力完了待ちの時刻
    const [debouncedStart, setDebouncedStart] = useState("");
    const [debouncedEnd, setDebouncedEnd] = useState("");

    // -- state: データ取得 --
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null); // { timeline, totals, series, roomName, ... }
    const [roomName, setRoomName] = useState("");

    // -- state: 表示設定 --
    const [showAllKinds, setShowAllKinds] = useState(true);
    const [showTotal, setShowTotal] = useState(false);
    const [selectedKinds, setSelectedKinds] = useState([]); // 表示されるスタンプ名のリスト

    // -- state: ログ --
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState("");
    const [logsLimit, setLogsLimit] = useState(100);
    const [logsOffset, setLogsOffset] = useState(0);

    const [showAllGroups, setShowAllGroups] = useState(true);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // -- 副作用 (Effects) --

    useEffect(() => {
        // roomId変更時に状態をリセット
        setInterval("5 minutes");
        setActiveTab("graph");
        setStart("");
        setEnd("");
        setDebouncedStart("");
        setDebouncedEnd("");
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
        setShowAllGroups(true);
        setSelectedGroups([]);
        setRoomName("");
    }, [roomId]);

    // デバウンス処理: 入力が終わってから debouncedStart/End を更新
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedStart(start);
            setDebouncedEnd(end);
        }, 800);
        return () => clearTimeout(timer);
    }, [start, end]);

    // マウント時および条件変更時にデータを取得
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { handleFetch(); }, [roomId, interval, debouncedStart, debouncedEnd]);

    // activeTabが 'logs' の場合にログを読み込む
    useEffect(() => {
        if (activeTab === "logs") {
            loadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, logsLimit, logsOffset, debouncedStart, debouncedEnd, interval]);

    // -- ハンドラ --

    const handleFetch = async () => {
        // 使用する値はデバウンス済みのもの
        const currentStart = debouncedStart;
        const currentEnd = debouncedEnd;

        if (currentStart && currentEnd && currentStart > currentEnd) {
            setError("開始時刻は終了時刻より前にしてください。");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const resp = await fetchStampActivity({
                roomId,
                interval,
                start: toIsoWithOffset(currentStart),
                end: toIsoWithOffset(currentEnd),
            });

            setData(resp);

            const name = resp?.roomName ?? resp?.room_name ?? resp?.name ?? "";
            setRoomName(name);

            // 範囲が設定されていない場合はデフォルト範囲を設定
            if (!currentStart && !currentEnd && resp && Array.isArray(resp.timeline) && resp.timeline.length > 0) {
                const first = resp.timeline[0];
                const last = resp.timeline[resp.timeline.length - 1];
                setStart(toDatetimeLocal(first));
                setEnd(toDatetimeLocal(last));
                // fetchに使った値も更新されないと不整合になる可能性があるが、
                // 次のデバウンスサイクル・fetchで整合性が取れる
            }

            // 選択された種類を同期
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

    const handleToggleKind = (kind) => {
        setSelectedKinds((prev) =>
            prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
        );
    };

    const handleToggleGroup = (group) => {
        setSelectedGroups((prev) =>
            prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
        );
    };

    // -- ログ読み込み --

    const loadLogs = async () => {
        setLogsLoading(true);
        setLogsError("");
        try {
            const resp = await fetchStampLogs(roomId, {
                start: toIsoWithOffset(debouncedStart),
                end: toIsoWithOffset(debouncedEnd),
                limit: logsLimit,
                offset: logsOffset,
            });
            
            const list = Array.isArray(resp) ? resp.map(r => ({
                id: r.stampLogId ?? r.stamp_log_id ?? r.id,
                userId: r.userId ?? r.user_id ?? r.user,
                senderName: r.senderName ?? r.sender_name ?? r.displayName,
                stampId: r.stampId ?? r.stamp_id,
                stampName: r.stampName ?? r.stamp_name,
                stampIcon: r.stampIcon ?? r.stamp_icon,
                stampColor: r.stampColor ?? r.stamp_color,
                sentAt: r.sentAt ?? r.sent_at ?? r.timestamp,
                groupName: r.groupName ?? r.group_name,
            })) : [];
            
            setLogs(list);
        } catch (e) {
            console.error(e);
            setLogsError(e.message || "ログの取得に失敗しました");
        } finally {
            setLogsLoading(false);
        }
    };

    const availableGroups = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        const s = new Set();
        for (const r of logs) {
            if (r.groupName) s.add(r.groupName);
        }
        return Array.from(s).sort();
    }, [logs]);

    useEffect(() => {
        if (availableGroups.length > 0 && selectedGroups.length === 0) {
            setSelectedGroups(availableGroups);
            setShowAllGroups(true);
        }
    }, [availableGroups]); // eslint-disable-line react-hooks/exhaustive-deps


    // --- グラフデータ準備 (Chart.js) ---

    const stampTypes = useMemo(() => {
        if (!data?.series) return [];
        return data.series
            .filter((s) => s.stampName !== "NO_STAMP")
            .map((s) => s.stampName);
    }, [data]);

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

    const chartJsData = useMemo(() => {
        if (!data || !Array.isArray(data.timeline)) {
            return { labels: [], datasets: [] };
        }

        const labels = data.timeline.map(t => formatTimeLabel(t));
        const datasets = [];

        // 系列データセット
        if (Array.isArray(data.series)) {
            data.series.forEach(s => {
                const name = s.stampName;
                if (name === "NO_STAMP") return;

                // Visibility check
                const isVisible = showAllKinds || selectedKinds.includes(name);
                if (!isVisible) return;

                const color = stampDisplayMap[name]?.iconColor || '#6b7280';

                datasets.push({
                    label: name,
                    data: s.values || [], // array of counts
                    borderColor: color,
                    backgroundColor: color,
                    tension: 0.3, // smooth curves
                    pointRadius: 3,
                    fill: false,
                    borderWidth: 2,
                });
            });
        }

        // 合計データセット
        if (showTotal && Array.isArray(data.totals)) {
            datasets.push({
                label: '合計',
                data: data.totals,
                borderColor: '#000000',
                backgroundColor: '#000000',
                borderDash: [5, 5], // dashed line for total
                tension: 0.3,
                pointRadius: 3,
                fill: false,
                borderWidth: 2,
            });
        }

        return { labels, datasets };
    }, [data, showAllKinds, selectedKinds, showTotal, stampDisplayMap]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // コンテナに合わせるために重要
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                }
            },
            title: {
                display: false,
                text: 'Stamp Activity Chart',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1, // 整数カウント
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // サイドパネルの統計用に種類ごとの合計を計算
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

    // -- ログ用ヘルパー --

    const renderStampPill = (e) => {
        const stampKey = e.stampName || `stamp-${e.stampId}`;
        let bg = "#f9fafb";
        let iconColor = "#4b5563";
        let IconComponent = null;

        if (e.stampName && stampDisplayMap[e.stampName]) {
            const d = stampDisplayMap[e.stampName];
            bg = d.bg;
            iconColor = d.iconColor;
            IconComponent = d.icon;
        } else {
             if (e.color) {
                 const c = getStampColorByCode(e.color);
                 bg = c.bg;
                 iconColor = c.icon;
             }
             if (e.icon) {
                 const { Icon } = getStampIconByCode(e.icon);
                 IconComponent = Icon;
             }
        }
        
        const title = e.stampName || `Stamp ${e.stampId}`;

        return (
            <div
                key={e.key || Math.random()}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1 border border-slate-100 shadow-sm text-slate-700"
                style={{ backgroundColor: bg, color: iconColor }}
                title={title}
            >
                {IconComponent && <IconComponent className="h-4 w-4" />}
                <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">{title}</span>
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

    const groupedLogs = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        const intervalMs = parseIntervalToMs(interval);
        
        const filtered = logs.filter(row => {
            if (!showAllGroups) {
                const g = row.groupName;
                if (!g || !selectedGroups.includes(g)) return false;
            }
            if (!showAllKinds) {
                 const s = row.stampName;
                 if (!s || !selectedKinds.includes(s)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

        const groups = new Map();
        for (const row of filtered) {
            const ts = new Date(row.sentAt).getTime();
            if (isNaN(ts)) continue;
            
            const bucket = Math.floor(ts / intervalMs) * intervalMs;
            
            if (!groups.has(bucket)) {
                groups.set(bucket, {
                    bucketStartMs: bucket,
                    entries: new Map(),
                });
            }
            const g = groups.get(bucket);
            
            const stampKey = row.stampName || `id:${row.stampId}`;
            const userKey = row.senderName || `uid:${row.userId}`;
            const entryKey = `${stampKey}|${userKey}`;
            
            if (g.entries.has(entryKey)) {
                g.entries.get(entryKey).count++;
            } else {
                g.entries.set(entryKey, {
                    key: entryKey,
                    stampName: row.stampName,
                    stampId: row.stampId,
                    senderName: row.senderName,
                    color: row.stampColor,
                    icon: row.stampIcon,
                    count: 1
                });
            }
        }

        return Array.from(groups.values())
            .sort((a, b) => a.bucketStartMs - b.bucketStartMs)
            .map(g => ({
                ...g,
                entries: Array.from(g.entries.values())
            }));

    }, [logs, interval, showAllGroups, selectedGroups, showAllKinds, selectedKinds]);


    return (
        <div className="flex flex-col gap-4 py-4">
            {/* ヘッダー / ナビゲーション */}
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

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">スタンプ履歴 - {roomName && <span>{roomName}</span>}</h2>
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="graph" className="px-3 py-1 text-sm">グラフ</TabsTrigger>
                        <TabsTrigger value="logs" className="px-3 py-1 text-sm">ログ</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* コントロール */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                    <Label className="text-sm font-medium" htmlFor="int-sel">表示間隔</Label>
                    <Select value={interval} onValueChange={setInterval}>
                        <SelectTrigger id="int-sel" className="border bg-white px-2 py-1 text-sm w-35">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INTERVAL_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label className="text-sm font-medium">開始時刻 (任意)</Label>
                    <Input 
                        type="datetime-local" 
                        className="w-55 bg-white" 
                        value={start} 
                        onChange={e => setStart(e.target.value)} 
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-sm font-medium">終了時刻 (任意)</Label>
                    <Input 
                        type="datetime-local" 
                        className="w-55 bg-white" 
                        value={end} 
                        onChange={e => setEnd(e.target.value)} 
                    />
                </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {/* グラフタブ */}
            {activeTab === "graph" && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                    
                    {/* グラフエリア */}
                    <Card className="w-full border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                        <CardHeader>
                            <CardTitle>スタンプ履歴グラフ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(!chartJsData.labels || chartJsData.labels.length === 0) ? (
                                <div className="text-sm text-muted-foreground">
                                    データがありません。条件を指定して「取得」を押してください。
                                </div>
                            ) : (
                                <div className="h-80 w-full" style={{ minHeight: 240 }}>
                                    {/* React Chartjs 2 Line Chart */}
                                    <Line options={chartOptions} data={chartJsData} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 設定サイドパネル */}
                    <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                        <CardHeader><CardTitle>表示設定</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    id="sa-k" 
                                    checked={showAllKinds} 
                                    onCheckedChange={v => setShowAllKinds(!!v)} 
                                />
                                <Label htmlFor="sa-k" className="font-normal">すべてのスタンプを表示</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    id="st-t" 
                                    checked={showTotal} 
                                    onCheckedChange={v => setShowTotal(!!v)} 
                                />
                                <Label htmlFor="st-t" className="font-normal">合計スタンプ数を表示</Label>
                            </div>

                            <div className="border-t pt-2 space-y-1">
                                {stampTypes.map(name => {
                                    const display = stampDisplayMap[name];
                                    const IconC = display?.icon;
                                    const count = totalPerKind[name] || 0;
                                    
                                    return (
                                        <div key={name} className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    checked={showAllKinds || selectedKinds.includes(name)}
                                                    disabled={showAllKinds}
                                                    onCheckedChange={() => handleToggleKind(name)}
                                                />
                                                <div 
                                                    className="inline-flex items-center gap-1 rounded-xl pl-1 pr-2 py-1 border border-slate-100 shadow-sm text-slate-700"
                                                    style={{ 
                                                        backgroundColor: display?.bg || "#f9fafb",
                                                        color: display?.iconColor || "#4b5563"
                                                    }}
                                                >
                                                    {IconC && <IconC className="h-4 w-4" />}
                                                    <span className="text-xs font-medium">{name}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* メモ */}
                    <Card className="border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                        <CardHeader>
                            <CardTitle>このルームのメモ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <NoteForm roomId={Number(roomId)} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ログタブ */}
            {activeTab === "logs" && (
                <Card className="w-full border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardHeader>
                        <CardTitle>スタンプログ</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {/* ログフィルタ */}
                         <div className="mb-4 space-y-4 border-b pb-4">
                            {/* 種類フィルタ */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Checkbox checked={showAllKinds} onCheckedChange={v => setShowAllKinds(!!v)} />
                                    <Label>すべてのスタンプを表示</Label>
                                </div>
                                {!showAllKinds && (
                                    <div className="flex flex-wrap gap-2 pl-6">
                                        {stampTypes.map(name => (
                                            <div key={name} className="flex items-center gap-1 text-sm bg-slate-50 px-2 py-1 rounded border">
                                                <Checkbox
                                                    id={`kind-${name}`}
                                                    checked={selectedKinds.includes(name)}
                                                    onCheckedChange={() => handleToggleKind(name)}
                                                />
                                                <Label htmlFor={`kind-${name}`} className="font-normal cursor-pointer">{name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* グループフィルタ */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Checkbox checked={showAllGroups} onCheckedChange={v => setShowAllGroups(!!v)} />
                                    <Label>すべてのグループを表示</Label>
                                </div>
                                {!showAllGroups && (
                                    <div className="flex flex-wrap gap-2 pl-6">
                                        {availableGroups.map(g => (
                                            <div key={g} className="flex items-center gap-1 text-sm bg-slate-50 px-2 py-1 rounded border">
                                                <Checkbox 
                                                    id={`group-${g}`} 
                                                    checked={selectedGroups.includes(g)} 
                                                    onCheckedChange={() => handleToggleGroup(g)} 
                                                />
                                                <Label htmlFor={`group-${g}`} className="font-normal cursor-pointer">{g}</Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ページネーションコントロール */}
                        <div className="flex items-center gap-3 mb-2 text-sm justify-end">
                            <label>
                                Limit: <input type="number" value={logsLimit} onChange={e => setLogsLimit(Number(e.target.value))} className="border rounded w-16 px-1" />
                            </label>
                            <label>
                                Offset: <input type="number" value={logsOffset} onChange={e => setLogsOffset(Number(e.target.value))} className="border rounded w-16 px-1" />
                            </label>
                            <Button size="sm" onClick={loadLogs}>更新</Button>
                        </div>

                        {logsLoading && <div>Loading...</div>}
                        {logsError && <div className="text-red-600">{logsError}</div>}

                        {/* テーブル */}
                        <div className="overflow-x-auto border rounded-md">
                            <table className="min-w-full text-xs bg-white">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left w-40">時刻帯</th>
                                        <th className="px-3 py-2 text-left">スタンプ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedLogs.length === 0 && !logsLoading && (
                                        <tr><td colSpan={2} className="p-4 text-center text-slate-500">条件に一致するログがありません</td></tr>
                                    )}
                                    {groupedLogs.map(g => (
                                        <tr key={g.bucketStartMs} className="border-t">
                                            <td className="px-3 py-2 align-top text-slate-600 font-medium whitespace-nowrap">
                                                {formatDateTime(new Date(g.bucketStartMs).toISOString())}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex flex-wrap gap-2">
                                                    {g.entries.map(e => (
                                                        <div key={e.key}>{renderStampPill(e)}</div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => setLogsOffset(Math.max(0, logsOffset - logsLimit))} disabled={logsOffset === 0}>
                                Prev
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setLogsOffset(logsOffset + logsLimit)}>
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default RoomHistory;
