import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition";
import { Trash2, Plus } from "lucide-react";

export function ClassStampManagement({ classId }) {
    const [assignedStamps, setAssignedStamps] = useState([]);     // クラスに紐づいているスタンプ
    const [unassignedStamps, setUnassignedStamps] = useState([]); // クラスに紐づいていないスタンプ
    const [stampLoading, setStampLoading] = useState(false);
    const [stampError, setStampError] = useState(null);
    const [stampProcessing, setStampProcessing] = useState(false);

    // Dialog の開閉状態（開いたときに最新を取得したい場合に使う）
    const [open, setOpen] = useState(false);

    // 認証リダイレクトの簡易チェック
    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

    // クラスに紐づく / 紐づかないスタンプ一覧を取得
    const fetchStamps = async () => {
        if (!classId) return;
        setStampLoading(true);
        setStampError(null);
        try {
            const [assignedRes, unassignedRes] = await Promise.all([
                fetch(`/api/stamp-management/class/${encodeURIComponent(classId)}/assigned`, {
                    credentials: "include",
                }),
                fetch(`/api/stamp-management/class/${encodeURIComponent(classId)}/unassigned`, {
                    credentials: "include",
                }),
            ]);

            if (await handleAuthRedirectIfNeeded(assignedRes)) return;
            if (await handleAuthRedirectIfNeeded(unassignedRes)) return;

            if (!assignedRes.ok || !unassignedRes.ok) {
                throw new Error("スタンプ一覧の取得に失敗しました");
            }

            const assigned = await assignedRes.json();
            const unassigned = await unassignedRes.json();

            setAssignedStamps(Array.isArray(assigned) ? assigned : []);
            setUnassignedStamps(Array.isArray(unassigned) ? unassigned : []);
        } catch (err) {
            console.error(err);
            setStampError(err.message ?? "スタンプ一覧取得時にエラーが発生しました");
        } finally {
            setStampLoading(false);
        }
    };

    // クラスにスタンプを割り当てる
    const handleAddStampToClass = async (stampId) => {
        if (!classId || !stampId) return;
        setStampProcessing(true);
        setStampError(null);

        try {
            const res = await fetch("/api/class-stamps", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    classId: Number(classId),
                    stampId: Number(stampId),
                }),
            });

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `スタンプの追加に失敗しました: ${res.status}`);
            }

            await fetchStamps();
        } catch (err) {
            console.error(err);
            setStampError(err.message ?? "スタンプ追加時にエラーが発生しました");
        } finally {
            setStampProcessing(false);
        }
    };

    // クラスからスタンプ割り当てを解除
    const handleRemoveStampFromClass = async (stampId) => {
        if (!classId || !stampId) return;
        setStampProcessing(true);
        setStampError(null);

        try {
            const res = await fetch("/api/class-stamps", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    classId: Number(classId),
                    stampId: Number(stampId),
                }),
            });

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `スタンプの削除に失敗しました: ${res.status}`);
            }

            await fetchStamps();
        } catch (err) {
            console.error(err);
            setStampError(err.message ?? "スタンプ削除時にエラーが発生しました");
        } finally {
            setStampProcessing(false);
        }
    };

    // classId が変わったら一度だけ読み込む
    useEffect(() => {
        if (open) {fetchStamps();}}, [classId, open]);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    fetchStamps();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="text-xs font-medium"
                >
                    スタンプ管理
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>クラスで使用するスタンプの管理</DialogTitle>
                    <DialogDescription className="text-xs">
                        このクラスで使用するスタンプを追加・削除できます。
                    </DialogDescription>
                </DialogHeader>

                {stampError && (
                    <p className="mb-2 text-xs text-red-600">
                        {stampError}
                    </p>
                )}

                {stampLoading ? (
                    <p className="text-xs text-slate-500">
                        スタンプ情報を読み込み中...
                    </p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* クラスに追加済みのスタンプ */}
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">
                                使用中のスタンプ
                            </p>

                            <div className="max-h-[400px] overflow-y-auto pr-1">
                                {assignedStamps.length === 0 ? (
                                    <p className="text-xs text-slate-400">
                                        右列からスタンプを追加してください。
                                    </p>
                                ) : (
                                    <ul className="space-y-1">
                                        {assignedStamps.map((stamp) => {
                                            if (!stamp) return null;
                                            const color = getStampColorByCode(
                                                Number(stamp.stampColor) || 0
                                            );
                                            const icon = getStampIconByCode(
                                                Number(stamp.stampIcon) || 0
                                            );
                                            return (
                                                <li
                                                    key={stamp.stampId}
                                                    className="flex items-center justify-between rounded-lg px-2 py-2"
                                                    style={{ backgroundColor: color.bg }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                    <span className="text-base">
                                                        {icon}
                                                    </span>
                                                        <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-slate-800">
                                                            {stamp.stampName}
                                                        </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={stampProcessing}
                                                        onClick={() =>
                                                            handleRemoveStampFromClass(stamp.stampId)
                                                        }
                                                        className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-white" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* クラスに追加されていないスタンプ */}
                        <div>
                            <p className="mb-1 text-xs font-medium text-slate-600">
                                追加できるスタンプ
                            </p>

                            <div className="max-h-[400px] overflow-y-auto pr-1">
                                {unassignedStamps.length === 0 ? (
                                    <p className="text-xs text-slate-400">
                                        スタンプはありません。
                                    </p>
                                ) : (
                                    <ul className="space-y-1">
                                        {unassignedStamps.map((stamp) => {
                                            if (!stamp) return null;
                                            const color = getStampColorByCode(
                                                Number(stamp.stampColor) || 0
                                            );
                                            const icon = getStampIconByCode(
                                                Number(stamp.stampIcon) || 0
                                            );
                                            return (
                                                <li
                                                    key={stamp.stampId}
                                                    className="flex items-center justify-between rounded-lg px-2 py-2"
                                                    style={{ backgroundColor: color.bg }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                    <span className="text-base">
                                                        {icon}
                                                    </span>
                                                        <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-slate-800">
                                                            {stamp.stampName}
                                                        </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={stampProcessing}
                                                        onClick={() =>
                                                            handleAddStampToClass(stamp.stampId)
                                                        }
                                                        className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4 text-white" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
