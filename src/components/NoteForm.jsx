import React, { useState, useEffect, useRef } from "react";
import { createNote, fetchNotes, setHidden } from "../api/notes";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EyeOff, Loader2, ArrowUp, StickyNote, ListCollapse } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Props:
 * \- roomId: number (required)
 * \- onCreated: function(note) optional callback when note created
 * \- autoRefreshIntervalMs: optional number to auto refresh (0 to disable)
 * - className: optional string
 */
export default function NoteForm({ roomId, onCreated, autoRefreshIntervalMs = 0, className }) {
    // --- Form State ---
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showList, setShowList] = useState(false);

    // UI State for floating form expanding
    const [isFocused, setIsFocused] = useState(false);
    const isExpanded = isFocused || text.length > 0;

    // --- List State ---
    const [notes, setNotes] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [includeHidden, setIncludeHidden] = useState(false);
    const [listError, setListError] = useState(null);

    const scrollBottomRef = useRef(null);

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
        if (showList) {
            loadNotes();
        }
    }, [showList, roomId, includeHidden]);

    // Auto refresh while list is open
    useEffect(() => {
        let timer;
        if (showList && autoRefreshIntervalMs > 0) {
            timer = setInterval(loadNotes, autoRefreshIntervalMs);
        }
        return () => clearInterval(timer);
    }, [showList, autoRefreshIntervalMs, roomId, includeHidden]);

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
            // If list is open, refresh it
            if (showList) loadNotes();
        } catch (err) {
            console.error(err);
            alert("メモの作成に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={showList} onOpenChange={setShowList}>
                <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
                     <div className="flex items-center justify-between px-4 py-3 border-b bg-white z-10">
                        <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">授業メモ一覧</span>
                        </div>
                        <div className="flex items-center gap-2 mr-6">
                            <Checkbox
                                id="include-hidden-notes"
                                checked={includeHidden}
                                onCheckedChange={(v) => setIncludeHidden(Boolean(v))}
                                className="h-3.5 w-3.5"
                            />
                            <Label
                                htmlFor="include-hidden-notes"
                                className="text-xs text-slate-600 cursor-pointer select-none"
                            >
                                非表示分も
                            </Label>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4 bg-slate-50/30">
                         {loadingNotes && notes.length === 0 && (
                            <div className="flex justify-center py-4 text-slate-400 gap-2 items-center">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">読み込み中...</span>
                            </div>
                        )}

                        {listError && (
                            <Alert variant="destructive" className="mb-4 text-xs">
                                <AlertTitle>エラー</AlertTitle>
                                <AlertDescription>{listError}</AlertDescription>
                            </Alert>
                        )}

                        {!loadingNotes && notes.length === 0 && !listError && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-2">
                                <StickyNote className="h-8 w-8 opacity-20" />
                                <p className="text-xs">メモはまだありません</p>
                            </div>
                        )}

                        <ul className="space-y-3">
                            {notes.map((n) => (
                                <li
                                    key={n.noteId}
                                    className="group relative flex flex-col gap-1 rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-3 shadow-sm transition-all"
                                >
                                    <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                                        {n.noteText}
                                    </div>

                                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                        <div className="flex items-center gap-2">
                                            {n.createdAt && (
                                                <span>
                                                    {new Date(n.createdAt).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                            {n.hidden && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-200 bg-amber-50 text-amber-600 px-1 py-0 text-[9px] h-4"
                                                >
                                                    非表示
                                                </Badge>
                                            )}
                                        </div>

                                        {!n.hidden && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => hideNote(n.noteId)}
                                                title="非表示にする"
                                            >
                                                <EyeOff className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <div 
                className={`bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-2xl rounded-3xl p-2 pl-3 flex items-end gap-2 transition-all duration-300 ${className}`}
            >
                <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 mb-0.5"
                    onClick={() => setShowList(true)}
                    title="メモ一覧を表示"
                >
                    <ListCollapse className="h-5 w-5" />
                </Button>

                <form 
                    className="flex items-end gap-2" 
                    onSubmit={submit}
                >
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={1}
                        placeholder="メモを入力…"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`py-3 px-4 resize-none rounded-2xl bg-slate-100/80 border-transparent focus:bg-white focus:border-slate-300 transition-all duration-500 ease-out text-sm min-h-[44px] max-h-[200px] overflow-hidden ${
                            isExpanded 
                                ? "w-[70vw] sm:w-[500px] field-sizing-content" 
                                : "w-[120px] field-sizing-fixed h-[44px]"
                        }`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                submit(e);
                            }
                        }}
                    />
                    <Button 
                        type="submit" 
                        disabled={submitting || !text.trim()}
                        className="h-11 w-11 shrink-0 rounded-xl shadow-sm p-0 mb-[1px]"
                        size="icon"
                    >
                        {submitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <ArrowUp className="h-6 w-6" />
                        )}
                    </Button>
                </form>
            </div>
        </>
    );
}
