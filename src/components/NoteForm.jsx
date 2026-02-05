import React, { useState, useEffect, useRef } from "react";
import { createNote, fetchNotes, setHidden } from "../api/notes";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Trash2, Loader2, ArrowUp, StickyNote, List, Check } from "lucide-react";

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
    const [isSuccess, setIsSuccess] = useState(false);
    const [showList, setShowList] = useState(false);

    // UI State for floating form expanding
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const isExpanded = isFocused || text.length > 0 || isSuccess;

    // --- List State ---
    const [notes, setNotes] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [listError, setListError] = useState(null);

    // --- List Logic ---
    const loadNotes = async () => {
        if (!roomId) return;
        if (notes.length === 0) setLoadingNotes(true); 
        setListError(null);
        try {
            const data = await fetchNotes(roomId);
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
    }, [showList, roomId]);

    // リストが開いている間は自動更新
    useEffect(() => {
        let timer;
        if (showList && autoRefreshIntervalMs > 0) {
            timer = setInterval(loadNotes, autoRefreshIntervalMs);
        }
        return () => clearInterval(timer);
    }, [showList, autoRefreshIntervalMs, roomId]);

    // Input展開時はリストを閉じる
    useEffect(() => {
        if (isExpanded) {
            setShowList(false);
        }
    }, [isExpanded]);

    const hideNote = async (noteId) => {
        if (!window.confirm("このメモを削除しますか？")) return;
        try {
            await setHidden(noteId, true);
            // 直ちにローカルステートから削除
            setNotes((prev) => prev.filter((n) => n.noteId !== noteId));
        } catch (err) {
            console.error(err);
            alert("削除できませんでした");
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
            setIsSuccess(true);
            if (onCreated) onCreated(created);
            // リストが開いている場合は更新
            if (showList) loadNotes();

            // 1秒待ってから折りたたむ
            setTimeout(() => {
                setIsSuccess(false);
                if (textareaRef.current) {
                    textareaRef.current.blur();
                }
            }, 1000);
        } catch (err) {
            console.error(err);
            alert("メモの作成に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div 
            className={`relative bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-2xl rounded-3xl p-2 flex items-end gap-2 transition-all duration-300 ${className}`}
        >
            <Popover open={showList && !isExpanded} onOpenChange={setShowList}>
                {!isExpanded && (
                    <PopoverTrigger asChild>
                        <Button 
                            type="button"
                            variant="ghost" 
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 mb-0.5"
                            title="メモ一覧を表示"
                        >
                            <List className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                )}
                <PopoverContent 
                    className="w-80 sm:w-96 p-0 overflow-hidden" 
                    align="center" 
                    sideOffset={16}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">授業メモ</span>
                        </div>
                    </div>

                    <ScrollArea className="h-[50vh] max-h-100">
                         {loadingNotes && notes.length === 0 && (
                            <div className="flex justify-center py-4 text-slate-400 gap-2 items-center">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">読み込み中...</span>
                            </div>
                        )}

                        {listError && (
                            <Alert variant="destructive" className="m-4 text-xs w-auto">
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

                        <div className="flex flex-col">
                            {notes.map((n, index) => (
                                <React.Fragment key={n.noteId}>
                                    <div className="group relative flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-all pr-6">
                                            {n.noteText}
                                        </div>

                                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>
                                                {n.createdAt && new Date(n.createdAt).toLocaleString([], { 
                                                    year: 'numeric', 
                                                    month: '2-digit', 
                                                    day: '2-digit', 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </span>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => hideNote(n.noteId)}
                                                title="削除する"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {index < notes.length - 1 && <Separator />}
                                </React.Fragment>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            <form 
                className="flex items-end relative" 
                onSubmit={submit}
            >
                <div className={`relative transition-all duration-500 ease-out ${
                    isExpanded 
                        ? "w-[70vw] sm:w-100" 
                        : "w-30"
                }`}>
                    <Textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={1}
                        placeholder="メモを入力…"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className={`py-3 px-4 w-full resize-none rounded-2xl bg-slate-100/80 border-transparent focus:bg-white focus:border-slate-300 transition-all duration-500 ease-out text-sm min-h-11 max-h-50 overflow-hidden ${
                            isExpanded 
                                ? "field-sizing-content pr-12" 
                                : "field-sizing-fixed h-11"
                        }`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                submit(e);
                            }
                        }}
                    />
                    <div className={`absolute bottom-1 right-1 transition-all duration-300 ${
                        isExpanded 
                            ? "opacity-100 scale-100" 
                            : "opacity-0 scale-50 pointer-events-none"
                    }`}>
                        <Button 
                            type="submit" 
                            disabled={submitting || (!text.trim() && !isSuccess)}
                            className={`h-9 w-9 shrink-0 rounded-xl shadow-sm p-0 transition-colors duration-300 ${isSuccess ? "bg-green-500 hover:bg-green-600" : ""}`}
                            size="icon"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isSuccess ? (
                                <Check className="h-5 w-5 text-white" />
                            ) : (
                                <ArrowUp className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
