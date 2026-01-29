const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.headers.get("Content-Type")?.includes("application/json") ? res.json() : null;
}

export async function createNote(noteText, roomId) {
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText, roomId }),
    });
    return handleResponse(res);
}

export async function fetchNotes(roomId, includeHidden = false) {
    const res = await fetch(`${API_BASE_URL}/api/rooms/${encodeURIComponent(roomId)}/notes?includeHidden=${includeHidden}`);
    return handleResponse(res);
}

export async function setHidden(noteId, hidden) {
    const res = await fetch(`${API_BASE_URL}/api/notes/${encodeURIComponent(noteId)}/hidden?hidden=${hidden}`, {
        method: "PATCH",
    });
    return handleResponse(res);
}

// クラスに紐づくルームごとのメモ件数を一括取得
export async function fetchNoteCounts(classId) {
    const res = await fetch(`${API_BASE_URL}/api/classes/${encodeURIComponent(classId)}/rooms/note-counts`, {
        credentials: "include",
    });
    return handleResponse(res);
}