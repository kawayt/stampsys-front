import React, { useEffect, useState } from "react";
import { fetchNotes, setHidden } from "../api/notes";

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
        <div className="notes-list-root">
            <div className="notes-controls">
                <label className="notes-include-hidden">
                    <input
                        type="checkbox"
                        checked={includeHidden}
                        onChange={(e) => setIncludeHidden(e.target.checked)}
                    />
                    非表示のメモも表示
                </label>
            </div>

            {error && <div className="notes-error">{error}</div>}

            <ul className="notes-list">
                {notes.length === 0 && !loading ? (
                    <li className="notes-empty">メモはまだありません。</li>
                ) : (
                    notes.map((n) => (
                        <li className="notes-item" key={n.noteId}>
                            <div className="notes-text">{n.noteText}</div>
                            <div className="notes-meta">
                <span className="notes-time">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </span>
                                {n.hidden ? (
                                    <span className="notes-hidden-label">（非表示）</span>
                                ) : (
                                    <button className="notes-hide-btn" onClick={() => hideNote(n.noteId)}>
                                        非表示にする
                                    </button>
                                )}
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}