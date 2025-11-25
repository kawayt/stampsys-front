export async function fetchStampActivity({ roomId, interval, start, end }) {
    const params = new URLSearchParams();

    if (interval) params.set("interval", interval);
    if (start) params.set("start", start);
    if (end) params.set("end", end);

    const res = await fetch(`/api/rooms/${roomId}/stamp-activity?` + params.toString());

    if (!res.ok) {
        throw new Error("スタンプ履歴の取得に失敗しました");
    }

    return res.json(); // StampActivityResponse
}