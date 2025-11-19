import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function ClassList() {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 新規作成用
    const [newClassName, setNewClassName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    const fetchClasses = async () => {
        setLoading(true);
        setError(null);
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

    useEffect(() => {
        fetchClasses();
    }, []);

    // クラス新規作成処理
    const handleCreateClass = async (e) => {
        e.preventDefault();
        setCreateError(null);

        if (!newClassName.trim()) {
            setCreateError("クラス名を入力してください");
            return;
        }

        setCreateLoading(true);
        try {
            const res = await fetch("/api/classes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // ← バックエンドの ClassForm に合わせてフィールド名を調整
                    className: newClassName.trim(),
                }),
            });

            if (!res.ok) {
                // バリデーションエラーなど、バックエンドからメッセージが返ってくる場合はそれを優先
                let msg = `クラスの作成に失敗しました: ${res.status}`;
                try {
                    const errJson = await res.json();
                    if (errJson.message) msg = errJson.message;
                } catch {
                    // JSON でない場合はそのまま
                }
                throw new Error(msg);
            }

            const created = await res.json();
            // created は ClassResponse の想定
            // { classId, className, createdAt } など
            setClasses((prev) => [...prev, created]);
            setNewClassName("");
            setOpenCreateDialog(false);
        } catch (err) {
            console.error(err);
            setCreateError(err.message ?? "クラス作成時にエラーが発生しました");
        } finally {
            setCreateLoading(false);
        }
    };

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

    return (
        <section className="py-4">
            <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-800">
                    クラス一覧
                </h2>

                {/* クラス新規作成ダイアログ */}
                <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="text-xs font-medium">
                            新しいクラスを作成
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>新しいクラスを作成</DialogTitle>
                            <DialogDescription className="text-xs">
                                授業で使用するクラスを登録します。クラス名は後から変更できます。
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateClass} className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="new-class-name"
                                    className="text-xs font-medium text-slate-700"
                                >
                                    クラス名
                                </Label>
                                <Input
                                    id="new-class-name"
                                    type="text"
                                    placeholder="例: 情報処理Ⅰ"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="text-sm"
                                />
                                {createError && (
                                    <p className="text-[11px] text-red-600">
                                        {createError}
                                    </p>
                                )}
                            </div>

                            <DialogFooter className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() => {
                                        setOpenCreateDialog(false);
                                        setCreateError(null);
                                    }}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createLoading}
                                    className="text-xs font-medium"
                                >
                                    {createLoading ? "作成中..." : "作成"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {(!classes || classes.length === 0) ? (
                <p className="text-sm text-slate-500">
                    クラスが登録されていません。
                </p>
            ) : (
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
                                    onClick={() => navigate(`/classes/${c.classId}/rooms`)}
                                >
                                    授業に参加 →
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}