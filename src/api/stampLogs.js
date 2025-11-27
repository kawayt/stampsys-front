// API helper for stamp logs
// 既存の auth 実装に合わせてヘッダ部分を調整してください。

export async function fetchStampLogs(roomId, { start, end, limit, offset } = {}) {
    if (!roomId) throw new Error('roomId is required');
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    if (limit != null) params.append('limit', String(limit));
    if (offset != null) params.append('offset', String(offset));
    const qs = params.toString();
    const url = `/api/rooms/${encodeURIComponent(roomId)}/stamp-logs${qs ? `?${qs}` : ''}`;

    const headers = { Accept: 'application/json' };
    // トークンの取得方法はプロジェクトに合わせてください
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`fetchStampLogs failed: ${res.status} ${res.statusText} ${body}`);
    }
    return res.json(); // array expected
}