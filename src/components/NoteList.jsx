import React, { useEffect, useState } from "react";
import { fetchNotes, setHidden } from "../api/notes";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { EyeOff, Loader2 } from "lucide-react";

/**
 * Props:
 * - roomId: number (required)
 * - autoRefreshIntervalMs: optional number to auto refresh (null/0 to disable)
 */
export default function NotesList({ roomId, autoRefreshIntervalMs = 0 }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [includeHidden, setIncludeHidden] = useState(false);
    const [error, setError] = useState(null);

    const load = async () => {
        if (!roomId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNotes(roomId, includeHidden);
            setNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError("メモの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        let timer;
        if (autoRefreshIntervalMs > 0) {
            timer = setInterval(load, autoRefreshIntervalMs);
        }
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, includeHidden]);

    const hideNote = async (noteId) => {
        if (!window.confirm("このメモを非表示にしますか？")) return;
        try {
            await setHidden(noteId, true);
            // 即時反映（非表示はデフォルトで除外されるので再取得）
            setNotes((prev) => prev.filter((n) => n.noteId !== noteId));
        } catch (err) {
            console.error(err);
            alert("非表示にできませんでした");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="include-hidden-notes"
                        checked={includeHidden}
                        onCheckedChange={(v) => setIncludeHidden(Boolean(v))}
                    />
                    <Label
                        htmlFor="include-hidden-notes"
                        className="text-xs text-slate-600 cursor-pointer select-none"
                    >
                        非表示のメモも表示
                    </Label>
                </div>

                {loading && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>読み込み中...</span>
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive" className="py-2">
                    <AlertTitle className="text-xs font-semibold">
                        エラーが発生しました
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <ScrollArea className="max-h-80 pr-1">
                {notes.length === 0 && !loading ? (
                    <p className="text-xs text-slate-400">
                        メモはまだありません。
                    </p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {notes.map((n) => (
                            <li
                                key={n.noteId}
                                className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 hover:bg-slate-50 transition-colors"
                            >
                                <div className="text-[13px] leading-snug text-slate-800 whitespace-pre-wrap">
                                    {n.noteText}
                                </div>

                                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                    <div className="flex items-center gap-2">
                                        {n.createdAt && (
                                            <span>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                                        )}
                                        {n.hidden && (
                                            <Badge
                                                variant="outline"
                                                className="border-amber-300 bg-amber-50 text-amber-700 px-1.5 py-0 text-[10px]"
                                            >
                                                非表示
                                            </Badge>
                                        )}
                                    </div>

                                    {!n.hidden && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                            onClick={() => hideNote(n.noteId)}
                                        >
                                            <EyeOff className="h-3.5 w-3.5" />
                                            <span className="sr-only">非表示にする</span>
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </ScrollArea>
        </div>
    );
}