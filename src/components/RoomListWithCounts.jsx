import React, { useEffect, useState } from 'react';

/**
 * ルーム一覧 + 合計スタンプ表示コンポーネント
 * props:
 *  - classId: number|string (必須)
 *  - fetchRooms: optional function(classId) -> roomsArray (既存 fetch を渡したいとき)
 *  - showDebug: boolean (画面下に API レスポンスを表示する)
 */
export default function RoomListWithCounts({ classId, fetchRooms, showDebug = false }) {
    const [rooms, setRooms] = useState([]);
    const [countsMap, setCountsMap] = useState({}); // { [roomId]: count }
    const [loading, setLoading] = useState(true);
    const [countsLoading, setCountsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [countsError, setCountsError] = useState(null);
    const [rawCounts, setRawCounts] = useState(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const fetchWithCreds = (url, options = {}) => {
        const resolved = (typeof url === 'string' && url.startsWith('/api') && API_BASE) ? `${API_BASE}${url}` : url;
        const opts = { credentials: 'include', headers: { Accept: 'application/json', ...options.headers }, ...options };
        return fetch(resolved, opts);
    };

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setCountsLoading(true);
        setError(null);
        setCountsError(null);

        const load = async () => {
            try {
                // 1) ルーム一覧取得（既存の fetchRooms を渡せばそれを利用）
                let roomsRes;
                if (typeof fetchRooms === 'function') {
                    roomsRes = await fetchRooms(classId);
                } else {
                    const r = await fetchWithCreds(`/api/classes/${classId}/rooms`);
                    if (!r.ok) throw new Error(`rooms fetch failed: ${r.status}`);
                    roomsRes = await r.json();
                }
                if (!mounted) return;
                setRooms(roomsRes || []);
            } catch (err) {
                console.error('rooms fetch error', err);
                if (mounted) setError(err.message || String(err));
            } finally {
                if (mounted) setLoading(false);
            }

            // 2) 合計スタンプ（バッチ API）を取得
            try {
                const cRes = await fetchWithCreds(`/api/classes/${classId}/rooms/stamp-counts`);
                if (!cRes.ok) {
                    const text = await cRes.text().catch(() => '');
                    throw new Error(`stamp-counts API returned ${cRes.status}: ${text}`);
                }
                const countsArray = await cRes.json();
                console.log('stamp-counts response:', countsArray);
                if (!mounted) return;
                setRawCounts(countsArray);
                const map = {};
                (countsArray || []).forEach((it) => {
                    const id = it.roomId ?? it.room_id ?? it.room ?? it.id;
                    const cnt = (it.count ?? it.cnt ?? it.counts ?? 0);
                    if (id != null) {
                        map[String(id)] = Number(cnt);
                    }
                });
                setCountsMap(map);
            } catch (err) {
                console.error('stamp-counts fetch error', err);
                if (mounted) setCountsError(err.message || String(err));
            } finally {
                if (mounted) setCountsLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [classId, fetchRooms]);

    if (loading) return <div className="py-6 text-center text-sm text-slate-600">読み込み中...</div>;
    if (error) return <div className="py-4 text-center text-red-600">ルーム取得エラー: {error}</div>;

    return (
        <div className="room-list">
            {rooms.length === 0 ? <div className="text-sm text-slate-500">ルームが見つかりません</div> : null}
            <div className="space-y-6">
                {rooms.map((room) => {
                    const id = room.id ?? room.roomId ?? room.room_id ?? room.room ?? room.roomId;
                    const count = countsLoading ? '読み込み中…' : (countsMap[String(id)] ?? 0);
                    return (
                        <div key={String(id)} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    {/* アイコン領域（必要なら RoleIcon 等に差し替え） */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l2-2m0 0l7-7 7 7M13 21v-8h4" /></svg>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold">{room.name ?? room.title ?? `ルーム ${id}`}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        作成日時: {room.createdAt ? new Date(room.createdAt).toLocaleString('ja-JP') : (room.created_at ? new Date(room.created_at).toLocaleString('ja-JP') : '')}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-slate-500">合計スタンプ</div>
                                <div className="text-2xl font-bold">{count}</div>
                                <div className="mt-3 flex items-center gap-2 justify-end">
                                    <button className="px-3 py-1 border rounded text-sm text-slate-700 bg-slate-50" onClick={() => { /* 履歴へ遷移 */ }}>履歴</button>
                                    <button className="px-3 py-1 bg-red-500 text-white rounded text-sm" onClick={() => { /* 削除処理 */ }}>削除</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showDebug && (
                <div style={{ marginTop: 20, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
                    <div><strong>debug: countsError</strong>: {countsError ? String(countsError) : 'none'}</div>
                    <div style={{ marginTop: 8 }}><strong>debug: rawCounts</strong>:
                        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(rawCounts, null, 2)}</pre>
                    </div>
                    <div style={{ marginTop: 8 }}><strong>debug: countsMap</strong>:
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(countsMap, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}