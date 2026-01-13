import React, { useState, useEffect } from "react";
import { createNote, fetchNotes, setHidden } from "../api/notes";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EyeOff, Loader2 } from "lucide-react";

/**
 * Props:
 * \- roomId: number (required)
 * \- onCreated: function(note) optional callback when note created
 * \- autoRefreshIntervalMs: optional number to auto refresh (0 to disable)
 */
export default function NoteForm({ roomId, onCreated, autoRefreshIntervalMs = 0 }) {
    // --- Form State ---
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // --- List State ---
    const [notes, setNotes] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [includeHidden, setIncludeHidden] = useState(false);
    const [listError, setListError] = useState(null);

    // --- List Logic ---
    const loadNotes = async () => {
        if (!roomId) return;
        // Don't set loading on auto-refresh to avoid flickering, or handle gracefully
        // For now, simple loading state
        // If we want silent refresh, we might need another flag or check if notes is empty
        if (notes.length === 0) setLoadingNotes(true); 
        setListError(null);
        try {
            const data = await fetchNotes(roomId, includeHidden);
            setNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setListError("メモの取得に失敗しました");
        } finally {
            setLoadingNotes(false);
        }
    };

    useEffect(() => {
        loadNotes();
        let timer;
        if (autoRefreshIntervalMs > 0) {
            timer = setInterval(loadNotes, autoRefreshIntervalMs);
        }
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, includeHidden]);

    const hideNote = async (noteId) => {
        if (!window.confirm("このメモを非表示にしますか？")) return;
        try {
            await setHidden(noteId, true);
            // Remove from local state immediately
            setNotes((prev) => prev.filter((n) => n.noteId !== noteId));
        } catch (err) {
            console.error(err);
            alert("非表示にできませんでした");
        }
    };

    // --- Form Logic ---
    const submit = async (e) => {
        e && e.preventDefault();
        if (!roomId) {
            alert("roomId が指定されていません");
            return;
        }
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            const created = await createNote(text.trim(), roomId);
            setText("");
            if (onCreated) onCreated(created);
            // Refresh list
            loadNotes(); 
        } catch (err) {
            console.error(err);
            alert("メモの作成に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Form Section */}
            <form className="space-y-3" onSubmit={submit}>
                <div className="space-y-2">
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        placeholder="例: 今日の板書・補足事項"
                        className="resize-none"
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={submitting || !text.trim()}>
                        {submitting ? "保存中..." : "保存"}
                    </Button>
                </div>
            </form>

            <div className="h-px bg-slate-200" />

            {/* List Section */}
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

                    {loadingNotes && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>読み込み中...</span>
                        </div>
                    )}
                </div>

                {listError && (
                    <Alert variant="destructive" className="py-2">
                        <AlertTitle className="text-xs font-semibold">
                            エラーが発生しました
                        </AlertTitle>
                        <AlertDescription className="text-xs">
                            {listError}
                        </AlertDescription>
                    </Alert>
                )}

                <ScrollArea className="max-h-80 pr-1">
                    {notes.length === 0 && !loadingNotes ? (
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
        </div>
    );
}
