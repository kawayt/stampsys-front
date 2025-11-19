import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RoomList() {
    const { classId } = useParams();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRooms = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/rooms/${encodeURIComponent(classId)}`);
            if (!res.ok) {
                throw new Error(`ルーム一覧の取得に失敗しました: ${res.status}`);
            }
            const data = await res.json();
            setRooms(data || []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ルーム一覧取得時にエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [classId]);

    if (loading) {
        return <div className="py-8 text-sm text-slate-600">読み込み中...</div>;
    }

    if (error) {
        return (
            <div className="py-8 text-sm text-red-600">
                エラー: {error}
                <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        戻る
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <section className="py-4">
            <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-800">ルーム一覧（クラスID: {classId}）</h2>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate(-1)}
                >
                    クラス一覧へ戻る
                </Button>
            </div>

            {(!rooms || rooms.length === 0) ? (
                <p className="text-sm text-slate-500">
                    このクラスに紐づくルームは登録されていません。
                </p>
            ) : (
                <div className="space-y-4">
                    {rooms.map((r) => (
                        <Card
                            key={r.roomId}
                            className="rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] bg-white/95"
                        >
                            <CardContent className="flex items-center justify-between px-8 py-5">
                                {/* 左側：アイコン + 情報 */}
                                <div className="flex items-center gap-4">
                                    {/* アイコン部分（ダミー） */}
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
                                            r.active
                                                ? "bg-orange-100 text-orange-500"
                                                : "bg-slate-100 text-slate-400"
                                        }`}
                                    >
                                        ⌂
                                    </div>

                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-800">
                                                {r.roomName}
                                            </p>

                                            {/* active が false のときだけ「終了」ラベル */}
                                            {!r.active && (
                                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 border border-red-100">
                                                    終了
                                                </span>
                                            )}
                                        </div>

                                        {r.createdAt && (
                                            <p className="mt-1 text-[11px] text-slate-400">
                                                作成日時: {new Date(r.createdAt).toLocaleString("ja-JP")}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 右側：ボタン／矢印 */}
                                <div className="flex items-center gap-3">
                                    <Button
                                        size="sm"
                                        className={
                                            r.active
                                                ? "text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-4"
                                                : "text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-4"
                                        }
                                        disabled={!r.active}
                                        onClick={() => {
                                            if (r.active) {
                                                // ★ active なルームだけ詳細ページに遷移
                                                navigate(`/rooms/${r.roomId}`);
                                            }
                                        }}
                                    >
                                        {r.active ? "入室" : "履歴"}
                                    </Button>
                                    <span
                                        className={
                                            r.active
                                                ? "text-orange-400 text-lg"
                                                : "text-slate-300 text-lg"
                                        }
                                    >
                    →
                  </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}