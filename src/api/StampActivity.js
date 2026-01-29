export async function fetchStampActivity({ roomId, interval, start, end }) {
    const params = new URLSearchParams();

    if (interval) params.set("interval", interval);
    if (start) params.set("start", start);
    if (end) params.set("end", end);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/stamp-activity?` + params.toString());

    if (!res.ok) {
        throw new Error("スタンプ履歴の取得に失敗しました");
    }

    return res.json(); // StampActivityResponse
}