import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchStampActivity } from "../api/StampActivity";
import { fetchStampLogs } from "../api/stampLogs";
import { fetchNotes } from "../api/notes";
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
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, Calendar, Stamp, ChevronLeft, ChevronRight, SquarePen, StickyNote } from "lucide-react";

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
    { value: "1 hour", label: "60分" },
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
    
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    
    return `${yyyy}/${MM}/${dd} ${hh}:${mm}`;
}

// --- メインコンポーネント ---

function RoomHistory() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // -- state: フィルタ --
    const [interval, setInterval] = useState("5 minutes");
    // activeTab removed
    
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
    const [notes, setNotes] = useState([]);

    const [selectedGroups, setSelectedGroups] = useState([]);

    // -- 副作用 (Effects) --

    useEffect(() => {
        // roomId変更時に状態をリセット
        setInterval("5 minutes");
        // setActiveTab removed
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
        setSelectedGroups([]);
        setRoomName("");
    }, [roomId]);

    // マウント時および条件変更時にデータを取得
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { handleFetch(); }, [roomId, interval]);

    // ログを読み込む (activeTab依存を削除)
    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logsLimit, logsOffset, interval]);

    // -- ハンドラ --

    const handleFetch = async () => {
        setLoading(true);
        setError("");

        try {
            const resp = await fetchStampActivity({
                roomId,
                interval,
            });

            setData(resp);

            const name = resp?.roomName ?? resp?.room_name ?? resp?.name ?? "";
                    setRoomName(name);

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
            const [resp, notesList] = await Promise.all([
                fetchStampLogs(roomId, {
                    limit: logsLimit,
                    offset: logsOffset,
                }),
                fetchNotes(roomId, true)
            ]);
            
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
            setNotes(Array.isArray(notesList) ? notesList : []);
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

                // Visibility check (showAllKindsフラグを無視してselectedKindsのみで判定)
                const isVisible = selectedKinds.includes(name);
                if (!isVisible) return;

                const color = stampDisplayMap[name]?.iconColor || '#6b7280';

                // 長い名前を省略 (凡例・ツールチップ対策)
                const dispName = name.length > 12 ? name.substring(0, 12) + "…" : name;

                datasets.push({
                    label: dispName,
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

    const stats = useMemo(() => {
        if (!data?.timeline?.length) return null;

        const first = data.timeline[0];
        const last = data.timeline[data.timeline.length - 1];
        if (!first || !last) return null;

        const startTime = new Date(first);
        const endTime = new Date(last);
        const durationMs = endTime.getTime() - startTime.getTime();

        const totalMinutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        
        const durationStr = hours > 0 
            ? `${hours}時間${mins}分` 
            : `${mins}分`;

        const totalCount = Object.values(totalPerKind).reduce((a, b) => a + b, 0);

        return {
            start: formatDateTime(first),
            end: formatDateTime(last),
            duration: durationStr,
            total: totalCount
        };
    }, [data, totalPerKind]);

    // -- ログ用ヘルパー --

    const renderStampPill = (e) => {
        if (e.type === 'note') {
             return (
                 <div 
                    key={e.key || `note-${Math.random()}`}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-slate-200 bg-slate-50 shadow-sm text-slate-800 max-w-full sm:max-w-md md:max-w-lg"
                 >
                    <SquarePen className="h-4 w-4 shrink-0 text-slate-500" />
                    <div className="flex flex-col min-w-0">
                         <span className="text-sm leading-snug whitespace-pre-wrap break-words">{e.content}</span>
                    </div>
                 </div>
             );
        }

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
                className="inline-flex items-center gap-2 rounded-xl px-3 py-1 border border-slate-100 shadow-sm text-slate-700 max-w-[180px]"
                style={{ backgroundColor: bg, color: iconColor }}
                title={title}
            >
                {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium leading-tight line-clamp-1 break-all">{title}</span>
                    <span className="text-xs text-slate-600 line-clamp-1 break-all">{e.senderName}</span>
                </div>
                {e.count > 1 && (
                    <span className="ml-2 text-xs bg-white/40 text-slate-700 px-1 rounded shrink-0">
                        {e.count}
                    </span>
                )}
            </div>
        );
    };

    const groupedLogs = useMemo(() => {
        let allItems = [];
        
        // 1. Logs
        if (logs && logs.length > 0) {
            allItems = logs.map(r => ({ ...r, type: 'stamp', ts: new Date(r.sentAt).getTime() }));
        }
        
        // 2. Notes
        if (notes && notes.length > 0) {
             let rangeStart = 0;
             let rangeEnd = Infinity;

             if (allItems.length > 0) {
                 let min = allItems[0].ts;
                 let max = allItems[0].ts;
                 for (const item of allItems) {
                     if (item.ts < min) min = item.ts;
                     if (item.ts > max) max = item.ts;
                 }
                 rangeStart = min;
                 rangeEnd = max;
             }

             const validNotes = notes
                .map(n => ({
                    type: 'note',
                    id: n.noteId,
                    ts: new Date(n.createdAt).getTime(),
                    content: n.noteText, // noteText is the property name in notes.js
                    createdAt: n.createdAt
                }))
                .filter(n => n.ts >= rangeStart && n.ts <= rangeEnd);
             
             allItems = [...allItems, ...validNotes];
        }

        if (allItems.length === 0) return [];

        const intervalMs = parseIntervalToMs(interval);
        
        const filtered = allItems.filter(row => {
            if (row.type === 'stamp') {
                const g = row.groupName;
                if (g && !selectedGroups.includes(g)) return false;
                
                // 常に選択された種類でフィルタリング
                const s = row.stampName;
                if (s && !selectedKinds.includes(s)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => a.ts - b.ts);

        const groups = new Map();
        for (const row of filtered) {
            const ts = row.ts;
            if (isNaN(ts)) continue;
            
            const bucket = Math.floor(ts / intervalMs) * intervalMs;
            
            if (!groups.has(bucket)) {
                groups.set(bucket, {
                    bucketStartMs: bucket,
                    entries: new Map(),
                });
            }
            const g = groups.get(bucket);
            
            if (row.type === 'note') {
                const entryKey = `note-${row.id}`;
                g.entries.set(entryKey, {
                     key: entryKey,
                     type: 'note',
                     content: row.content,
                     sentAt: row.createdAt
                });
            } else {
                const stampKey = row.stampName || `id:${row.stampId}`;
                const userKey = row.senderName || `uid:${row.userId}`;
                const entryKey = `${stampKey}|${userKey}`;
                
                if (g.entries.has(entryKey)) {
                    g.entries.get(entryKey).count++;
                } else {
                    g.entries.set(entryKey, {
                        key: entryKey,
                        type: 'stamp',
                        stampName: row.stampName,
                        stampId: row.stampId,
                        senderName: row.senderName,
                        color: row.stampColor,
                        icon: row.stampIcon,
                        count: 1
                    });
                }
            }
        }

        return Array.from(groups.values())
            .sort((a, b) => a.bucketStartMs - b.bucketStartMs)
            .map(g => ({
                ...g,
                entries: Array.from(g.entries.values())
            }));

    }, [logs, notes, interval, selectedGroups, selectedKinds]);


    return (
        <div className="flex flex-col gap-4 pt-4 pb-25">
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

            <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-xl font-bold break-all">{roomName}</h2>
                
                {/* 統計情報 */}
                <div className="flex items-center gap-6 text-sm text-slate-600">
                    {stats && (
                        <>
                            <div className="flex items-center gap-1.5" title="データ期間">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">{stats.start} ～ {stats.end}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="総スタンプ数">
                                <Stamp className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">{stats.total.toLocaleString()}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {/* 表示間隔 */}
            <div className="flex">
                <Tabs value={interval} onValueChange={setInterval} className="w-auto">
                    <TabsList className="bg-slate-100">
                        {INTERVAL_OPTIONS.map(o => (
                            <TabsTrigger key={o.value} value={o.value} className="px-3 py-1">
                                {o.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* スタンプ表示設定 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 my-6">
                {stampTypes.map(name => {
                    const display = stampDisplayMap[name];
                    const IconC = display?.icon;
                    const count = totalPerKind[name] || 0;
                    const isSelected = selectedKinds.includes(name);
                    
                    return (
                        <div 
                            key={name} 
                            onClick={() => handleToggleKind(name)}
                            className={`
                                relative flex flex-col items-center justify-center p-3 gap-2
                                rounded-2xl border transition-all cursor-pointer select-none
                                h-24
                                ${isSelected ? 'shadow-sm ring-2 ring-offset-1 ring-slate-400' : 'opacity-60 grayscale bg-slate-50 border-slate-200'}
                            `}
                            style={isSelected ? { 
                                backgroundColor: display?.bg || "#f9fafb",
                                color: display?.iconColor || "#4b5563",
                                borderColor: "transparent"
                            } : {}}
                        >
                            {IconC && <IconC className="h-8 w-8 shrink-0" />}
                            <span className="text-xs font-bold text-center leading-tight line-clamp-1 break-all w-full px-1">{name}</span>
                            
                            <span className="absolute top-1 left-2 text-xs font-bold opacity-80 bg-white/50 px-1.5 rounded-full">
                                {count}
                            </span>
                            
                            {isSelected && (
                                <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Check className="h-3 w-3" strokeWidth={3} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col gap-6">
                
                {/* グラフエリア */}
                <Card className="w-full border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardHeader>
                        <CardTitle>グラフ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(!chartJsData.labels || chartJsData.labels.length === 0) ? (
                            <div className="text-sm text-muted-foreground">
                                データがありません。
                            </div>
                        ) : (
                            <div className="h-96 w-full" style={{ minHeight: 400 }}>
                                {/* React Chartjs 2 Line Chart */}
                                <Line options={chartOptions} data={chartJsData} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ログ一覧 */}
                <Card className="w-full border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] rounded-3xl bg-white/95">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle>ログ</CardTitle>
                        
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            {/* グループフィルタ (ログセクションに移動) */}
                            {availableGroups.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {availableGroups.map(g => {
                                        const isSelected = selectedGroups.includes(g);
                                        return (
                                            <div 
                                                key={g} 
                                                onClick={() => handleToggleGroup(g)}
                                                className={`
                                                    relative flex items-center justify-center px-3 py-1 gap-1
                                                    rounded-lg border transition-all cursor-pointer select-none
                                                    text-xs
                                                    ${isSelected ? 'shadow-sm ring-1 ring-slate-400 bg-white border-transparent' : 'opacity-60 bg-slate-50 border-slate-200 text-slate-500'}
                                                `}
                                            >
                                                <span className="font-bold truncate max-w-24">{g}</span>
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {logsLoading && <div>読み込み中...</div>}
                        {logsError && <div className="text-red-600">{logsError}</div>}

                        {/* リスト (flex) */}
                        <div className="flex flex-col text-xs bg-white">
                            {groupedLogs.length === 0 && !logsLoading && (
                                <div className="p-4 text-center text-slate-500">条件に一致するログがありません</div>
                            )}
                            {groupedLogs.map(g => (
                                <div key={g.bucketStartMs} className="flex flex-col md:flex-row border-t py-2 px-3 gap-1 md:gap-4 md:items-start transition-colors hover:bg-slate-50/50">
                                    <div className="text-slate-600 font-medium whitespace-nowrap shrink-0 md:min-w-35">
                                        {formatDateTime(new Date(g.bucketStartMs).toISOString())}
                                    </div>
                                    <div className="flex flex-wrap gap-2 grow">
                                        {g.entries.map(e => (
                                            <div key={e.key} className={e.type === 'note' ? "w-full my-1" : ""}>
                                                {renderStampPill(e)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Select value={String(logsLimit)} onValueChange={(v) => setLogsLimit(Number(v))}>
                                <SelectTrigger className="w-24 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="50">50件</SelectItem>
                                    <SelectItem value="100">100件</SelectItem>
                                    <SelectItem value="200">200件</SelectItem>
                                    <SelectItem value="300">300件</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-1">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setLogsOffset(Math.max(0, logsOffset - logsLimit))}
                                    disabled={logsOffset === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setLogsOffset(logsOffset + logsLimit)}
                                    disabled={logs.length < logsLimit}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* メモ */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[90vw]">
                    <NoteForm roomId={Number(roomId)} />
                </div>
            </div>
        </div>
    );
}

export default RoomHistory;
