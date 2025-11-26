import React, { useState } from "react";
import { createNote } from "../api/notes";

/**
 * Props:
 * - roomId: number (required)
 * - onCreated: function(note) optional callback when note created
 */
export default function NoteForm({ roomId, onCreated }) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e && e.preventDefault();
        if (!roomId) {
            alert("roomId が指定されていません");
            return;
        }
        if (!text.trim()) return;
        setLoading(true);
        try {
            const created = await createNote(text.trim(), roomId);
            setText("");
            if (onCreated) onCreated(created);
        } catch (err) {
            console.error(err);
            alert("メモの作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="notes-form" onSubmit={submit}>
      <textarea
          className="notes-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="授業メモを入力（例: 今日の板書・補足事項）"
      />
            <div className="notes-actions">
                <button type="submit" disabled={loading || !text.trim()}>
                    {loading ? "保存中..." : "保存"}
                </button>
            </div>
        </form>
    );
}