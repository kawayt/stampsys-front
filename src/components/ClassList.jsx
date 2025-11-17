import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClassList() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await fetch("/api/classes/list");
                if (!res.ok) {
                    throw new Error(`Failed to fetch classes: ${res.status}`);
                }
                const data = await res.json();
                setClasses(data || []);
            } catch (err) {
                console.error(err);
                setError(err.message ?? "エラーが発生しました");
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    if (loading) {
        return (
            <div className="py-8 text-sm text-slate-600">
                読み込み中...
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-sm text-red-600">
                エラー: {error}
            </div>
        );
    }

    if (!classes || classes.length === 0) {
        return (
            <div className="py-8">
                <h2 className="mb-2 text-lg font-semibold text-slate-800">
                    クラス一覧
                </h2>
                <p className="text-sm text-slate-500">
                    クラスが登録されていません。
                </p>
            </div>
        );
    }

    return (
        <section className="py-4">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
                クラス一覧
            </h2>

            {/* グリッドレイアウト */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {classes.map((c) => (
                    <Card
                        key={c.classId}
                        className="rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] bg-white/95"
                    >
                        <CardContent className="flex h-32 items-center justify-between px-8">
                            <div>
                                <p className="text-sm font-medium text-slate-800">
                                    {c.className}
                                </p>
                                {c.createdAt && (
                                    <p className="mt-2 text-[11px] text-slate-400">
                                        作成日時: {new Date(c.createdAt).toLocaleString("ja-JP")}
                                    </p>
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                className="text-xs font-medium text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-0"
                            >
                                授業に参加 →
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}