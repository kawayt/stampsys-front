import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStampColorByCode, getStampIconByCode } from "@/lib/StampDefinition";
import { Trash2, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ClassStampManagement({ classId, open, userId }) {
    const [assignedStamps, setAssignedStamps] = useState([]);
    const [unassignedStamps, setUnassignedStamps] = useState([]);
    const [stampLoading, setStampLoading] = useState(false);
    const [stampError, setStampError] = useState(null);
    const [stampProcessing, setStampProcessing] = useState(false);
    const [showOnlyMyStamps, setShowOnlyMyStamps] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

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
            setInitialLoading(false);
        }
    };

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

    const filteredUnassignedStamps = useMemo(() => {
        if (!showOnlyMyStamps || !userId) {
            return unassignedStamps;
        }
        return unassignedStamps.filter((stamp) => {
            if (!stamp) return false;
            return String(stamp.userId) === String(userId);
        });
    }, [showOnlyMyStamps, userId, unassignedStamps]);

    useEffect(() => {
        if (open) {
            // 初回オープン時のみ Skeleton を出したいので、フラグは初期値 true のまま
            fetchStamps();
        }
    }, [classId, open]);

    const renderContent = () => (
        <div className="grid gap-4 md:grid-cols-2 min-h-65">
            {/* 使用中のスタンプ */}
            <div className="flex flex-col">
                <p className="mb-1 text-xs font-medium text-slate-600">
                    使用中のスタンプ
                </p>

                <ScrollArea className="h-100 pr-1">
                    {initialLoading ? (
                        <ul className="space-y-1">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <Skeleton
                                    key={`assigned-skeleton-${idx}`}
                                    className="flex items-center justify-between rounded-lg px-2 py-2 h-12 bg-slate-100"
                                />
                            ))}
                        </ul>
                    ) : assignedStamps.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            右列からスタンプを追加してください。
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {assignedStamps.map((stamp) => {
                                if (!stamp) return null;
                                const color = getStampColorByCode(Number(stamp.stampColor) || 0);
                                const { Icon } = getStampIconByCode(Number(stamp.stampIcon) || 0);
                                return (
                                    <li
                                        key={stamp.stampId}
                                        className="flex items-center justify-between rounded-lg px-2 py-2 h-12"
                                        style={{
                                            backgroundColor: color.bg,
                                            color: color.icon,
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex ml-0.5 items-center justify-center">
                                                <Icon className="h-5 w-5" />
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
                                            onClick={() => handleRemoveStampFromClass(stamp.stampId)}
                                            className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>
            </div>

            {/* 追加できるスタンプ */}
            <div className="flex flex-col">
                <p className="mb-1 text-xs font-medium text-slate-600">
                    追加できるスタンプ
                </p>

                <ScrollArea className="h-100 pr-1">
                    {initialLoading ? (
                        <ul className="space-y-1">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <Skeleton
                                    key={`unassigned-skeleton-${idx}`}
                                    className="rounded-lg px-2 py-2 h-12 bg-slate-100"
                                />
                            ))}
                        </ul>
                    ) : filteredUnassignedStamps.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            スタンプはありません。
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {filteredUnassignedStamps.map((stamp) => {
                                if (!stamp) return null;
                                const color = getStampColorByCode(Number(stamp.stampColor) || 0);
                                const { Icon } = getStampIconByCode(Number(stamp.stampIcon) || 0);
                                return (
                                    <li
                                        key={stamp.stampId}
                                        className="flex items-center justify-between rounded-lg px-2 py-2 h-12"
                                        style={{
                                            backgroundColor: color.bg,
                                            color: color.icon,
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex ml-0.5 items-center justify-center">
                                                <Icon className="h-5 w-5" />
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
                                            onClick={() => handleAddStampToClass(stamp.stampId)}
                                            className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4 text-white" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>
            </div>
        </div>
    );

    return (
        <div>
            {stampError && (
                <p className="mb-2 text-xs text-red-600">
                    {stampError}
                </p>
            )}

            {renderContent()}
        </div>
    );
}