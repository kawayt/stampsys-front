import React, { useState } from "react";
import { createNote } from "../api/notes";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * Props:
 * \- roomId: number (required)
 * \- onCreated: function(note) optional callback when note created
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
        <form
            className="space-y-3"
            onSubmit={submit}
        >
            <div className="space-y-2">
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    placeholder="例: 今日の板書・補足事項"
                    className="resize-none"
                />
            </div>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={loading || !text.trim()}
                >
                    {loading ? "保存中..." : "保存"}
                </Button>
            </div>
        </form>
    );
}
