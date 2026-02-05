import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Search,
    StickyNote,
    MoreHorizontal,
    Plus,
    Stamp,
    Users,
    DoorOpen,
    DoorClosed,
    History,
    Trash,
} from "lucide-react";
import { ClassStampManagement } from "./ClassStampManagement";
import { ClassUserManagement } from "./ClassUserManagement";
import { fetchNoteCounts, fetchNotes } from "@/api/notes.js";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { notifySuccess, notifyError } from "@/utils/notify";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const ROOM_TAB = {
    ACTIVE: "active", // hidden=false
    HIDDEN: "hidden", // hidden=true
};

export function RoomList({ userId, role }) {
    const isAdmin = role === "ADMIN";

    const { classId } = useParams();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [classInfo, setClassInfo] = useState(null);

    // search
    const [searchQuery, setSearchQuery] = useState("");

    // カウント用state
    const [countsMap, setCountsMap] = useState({}); // { [roomId]: count }
    const [countsLoading, setCountsLoading] = useState(true);
    const [countsError, setCountsError] = useState(null);

    // ルームごとのメモ件数（クラス単位で一括取得）
    const [noteCountsMap, setNoteCountsMap] = useState({}); // { [roomId]: noteCount }
    const [noteCountsLoading, setNoteCountsLoading] = useState(true);
    const [noteCountsError, setNoteCountsError] = useState(null);

    // 個別ルームのメモ本文を遅延取得してキャッシュするための state
    const [notesByRoom, setNotesByRoom] = useState({}); // { [roomId]: [{noteId,noteText,...}] }
    const [notesLoadingMap, setNotesLoadingMap] = useState({}); // { [roomId]: boolean }

    //  現在ホバーしているルームのキー
    const [hoveredRoom, setHoveredRoom] = useState(null);

    // ルーム作成用 state
    const [creating, setCreating] = useState(false);
    const [createRoomName, setCreateRoomName] = useState("");
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState(null);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);

    // ルーム終了用 state
    const [openCloseDialog, setOpenCloseDialog] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null); // { roomId, roomName }
    const [closeProcessing, setCloseProcessing] = useState(false);
    const [closeError, setCloseError] = useState(null);

    // 削除（非表示）用 state
    const [openHideDialog, setOpenHideDialog] = useState(false);
    const [hideSelectedRoom, setHideSelectedRoom] = useState(null); // { roomId, roomName }
    const [hideProcessing, setHideProcessing] = useState(false);
    const [hideError, setHideError] = useState(null);

    // 削除済みルーム（hidden=true）用 state（ADMIN のみ利用）
    const [hiddenRooms, setHiddenRooms] = useState([]);
    const [hiddenLoading, setHiddenLoading] = useState(false);
    const [hiddenError, setHiddenError] = useState(null);

    // 復元処理 state
    const [restoreProcessingId, setRestoreProcessingId] = useState(null);
    const [restoreError, setRestoreError] = useState(null);

    // タブ state（ADMIN でない場合は実質 ACTIVE 固定）
    const [activeTab, setActiveTab] = useState(ROOM_TAB.ACTIVE);

    // スタンプ管理 / ユーザー管理ダイアログの open state
    const [openStampDialog, setOpenStampDialog] = useState(false);
    const [openUserDialog, setOpenUserDialog] = useState(false);

    // ヘルパー: 認証リダイレクトの簡易チェック
    const handleAuthRedirectIfNeeded = async (res) => {
        if (res.status === 401 || res.redirected) {
            window.location.href = "/oauth2/authorization/microsoft";
            return true;
        }
        return false;
    };

    const fetchRooms = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/rooms/${encodeURIComponent(classId)}`,
                {
                    credentials: "include",
                }
            );
            if (await handleAuthRedirectIfNeeded(res)) return;
            if (!res.ok) {
                throw new Error(
                    `ルーム一覧の取得に失敗しました: ${res.status}`
                );
            }
            const data = await res.json();
            setClassInfo(data?.classInfo ?? null);
            setRooms(data?.rooms ?? []);
        } catch (err) {
            console.error(err);
            setError(err.message ?? "ルーム一覧取得時にエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const fetchHiddenRooms = async () => {
        // ADMIN 以外は API 自体を呼ばない
        if (!isAdmin) return;

        setHiddenLoading(true);
        setHiddenError(null);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/rooms/${encodeURIComponent(classId)}?hidden=true`,
                {
                    credentials: "include",
                }
            );
            if (await handleAuthRedirectIfNeeded(res)) return;
            if (!res.ok) {
                throw new Error(
                    `削除済みルーム一覧の取得に失敗しました: ${res.status}`
                );
            }
            const data = await res.json();
            setHiddenRooms(data?.rooms ?? []);
        } catch (err) {
            console.error(err);
            setHiddenError(
                err.message ??
                "削除済みルーム一覧取得時にエラーが発生しました"
            );
            setHiddenRooms([]);
        } finally {
            setHiddenLoading(false);
        }
    };

    const fetchCounts = async () => {
        setCountsLoading(true);
        setCountsError(null);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/classes/${encodeURIComponent(
                    classId
                )}/rooms/stamp-counts`,
                {
                    credentials: "include",
                }
            );
            if (await handleAuthRedirectIfNeeded(res)) return;
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(
                    text ||
                    `stamp-counts の取得に失敗しました: ${res.status}`
                );
            }
            const arr = await res.json();
            // build map
            const map = {};
            (arr || []).forEach((it) => {
                const id = it.roomId ?? it.room_id ?? it.room ?? it.id;
                const cnt = it.count ?? it.cnt ?? it.counts ?? 0;
                if (id != null) map[String(id)] = Number(cnt);
            });
            setCountsMap(map);
        } catch (err) {
            console.error("fetchCounts error:", err);
            setCountsError(
                err.message ?? "合計スタンプ取得時にエラーが発生しました"
            );
            setCountsMap({});
        } finally {
            setCountsLoading(false);
        }
    };

    // クラス内のルームごとのメモ件数を一括取得
    const fetchNoteCountsForClass = async () => {
        setNoteCountsLoading(true);
        setNoteCountsError(null);
        try {
            const arr = await fetchNoteCounts(classId);
            const map = {};
            (arr || []).forEach((it) => {
                const id = it.roomId ?? it.room_id ?? it.room ?? it.id;
                const cnt = it.noteCount ?? it.count ?? 0;
                if (id != null) map[String(id)] = Number(cnt);
            });
            setNoteCountsMap(map);
        } catch (err) {
            console.error("fetchNoteCountsForClass error:", err);
            setNoteCountsError(
                err.message ?? "メモ数取得時にエラーが発生しました"
            );
            setNoteCountsMap({});
        } finally {
            setNoteCountsLoading(false);
        }
    };

    // ホバーで個別ルームのメモ一覧を遅延取得してキャッシュする
    const fetchNotesForRoom = async (roomId) => {
        const key = String(roomId);
        if (!key) return;
        if (notesByRoom[key] || notesLoadingMap[key]) return; // キャッシュ済み or 読み込み中ならスキップ
        setNotesLoadingMap((prev) => ({ ...prev, [key]: true }));
        try {
            const arr = await fetchNotes(roomId, false); // includeHidden = false
            setNotesByRoom((prev) => ({ ...prev, [key]: arr || [] }));
        } catch (err) {
            console.error("fetchNotesForRoom error:", err);
            setNotesByRoom((prev) => ({ ...prev, [key]: [] }));
        } finally {
            setNotesLoadingMap((prev) => ({ ...prev, [key]: false }));
        }
    };

    const hideTimeoutRef = useRef(null);

    const openPopover = (key) => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setHoveredRoom(key);
    };

    const scheduleClosePopover = (delay = 150) => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            setHoveredRoom(null);
            hideTimeoutRef.current = null;
        }, delay);
    };

    // クリーンアップ（コンポーネントアンマウント時）
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        };
    }, []);

    // 検索クエリが入力されたら、表示中クラスの各ルームについてメモをまとめて取得（未取得分のみ）
    useEffect(() => {
        const q = searchQuery.trim();
        if (!q) return;

        (rooms || []).forEach((r) => {
            const roomKey = String(
                r.roomId ?? r.room_id ?? r.id ?? r.room ?? ""
            );
            if (roomKey) {
                fetchNotesForRoom(roomKey);
            }
        });
        // searchQuery / rooms の変化に応じてだけ動かしたいので exhaustive-deps は無効化
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, rooms]);

    // ルーム作成関数
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setCreateError(null);
        setCreateSuccess(null);

        if (!createRoomName.trim()) {
            setCreateError("ルーム名を入力してください");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    classId: Number(classId),
                    roomName: createRoomName.trim(),
                }),
            });

            if (!res.ok) {
                let msg = `HTTP error! status: ${res.status}`;
                try {
                    const text = await res.text();
                    if (text) msg = text;
                } catch {
                    // ignore
                }
                throw new Error(msg);
            }

            await res.json();

            const createdName = createRoomName.trim();
            setCreateSuccess("ルームを作成しました");
            setCreateRoomName("");
            setOpenCreateDialog(false);
            await fetchRooms();
            await fetchCounts();
            await fetchNoteCountsForClass();

            // 成功トースト
            notifySuccess("ルームを作成しました", `ルーム名: ${createdName}`);
        } catch (err) {
            console.error(err);
            const fallback = "ルームを作成できませんでした";
            const message = err.message ?? fallback;
            setCreateError(message);

            // 失敗時のみトースト
            notifyError("ルームを作成できませんでした", message);
        } finally {
            setCreating(false);
        }
    };

    // ルーム終了ダイアログを開く（対象ルームをセット）
    const openCloseRoomDialog = (room) => {
        setSelectedRoom(room);
        setCloseError(null);
        setOpenCloseDialog(true);
    };

    // 確認ダイアログで「終了」を押したときの処理
    const handleConfirmClose = async () => {
        if (!selectedRoom || !selectedRoom.roomId) return;
        setCloseProcessing(true);
        setCloseError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/rooms/${encodeURIComponent(selectedRoom.roomId)}/close`,
                {
                    method: "PATCH",
                }
            );

            if (res.status === 204) {
                setRooms((prev) =>
                    prev.map((r) =>
                        r.roomId === selectedRoom.roomId
                            ? { ...r, active: false }
                            : r
                    )
                );
                setOpenCloseDialog(false);

                // 成功トースト
                notifySuccess(
                    "ルームを終了しました",
                    selectedRoom?.roomName
                        ? `ルーム名: ${selectedRoom.roomName}`
                        : undefined
                );

                setSelectedRoom(null);
                // refresh counts because active state change may affect UI
                await fetchCounts();
                await fetchNoteCountsForClass();
            } else {
                let message = `ルームの終了に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body &&
                                (body.error ||
                                    body.message ||
                                    JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt || message;
                    }
                } catch {
                    // ignore parse errors
                }
                setCloseError(message);

                // 失敗トースト
                notifyError("ルームを終了できませんでした", message);
            }
        } catch (err) {
            console.error(err);
            const message = err.message ?? "通信エラーが発生しました";
            setCloseError(message);

            // 失敗トースト
            notifyError("ルームを終了できませんでした", message);
        } finally {
            setCloseProcessing(false);
        }
    };

    // 削除（非表示）ダイアログを開く
    const openHideRoomDialog = (room) => {
        setHideSelectedRoom(room);
        setHideError(null);
        setOpenHideDialog(true);
    };

    // 確認ダイアログで「削除」を押したときの処理（hidden = true にする）
    const handleConfirmHide = async () => {
        if (!hideSelectedRoom || !hideSelectedRoom.roomId) return;
        setHideProcessing(true);
        setHideError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/rooms/${encodeURIComponent(hideSelectedRoom.roomId)}/delete`,
                {
                    method: "PATCH",
                    credentials: "include",
                }
            );

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (res.status === 204) {
                const deletedName = hideSelectedRoom.roomName;
                setRooms((prev) =>
                    prev.filter((r) => r.roomId !== hideSelectedRoom.roomId)
                );
                setOpenHideDialog(false);
                setHideSelectedRoom(null);
                // refresh counts because rooms list changed
                await fetchCounts();
                await fetchNoteCountsForClass();

                // 成功トースト
                notifySuccess(
                    "ルームを削除しました",
                    deletedName ? `ルーム名: ${deletedName}` : undefined
                );

                // 削除済みタブ用一覧を最新化（ADMIN でタブを開いていれば再取得）
                if (isAdmin && activeTab === ROOM_TAB.HIDDEN) {
                    await fetchHiddenRooms();
                } else {
                    setHiddenRooms([]);
                }
            } else {
                let message =
                    "ルームの削除（非表示）に失敗しました: " + res.status;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body &&
                                (body.error ||
                                    body.message ||
                                    JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt || message;
                    }
                } catch {
                    // ignore
                }
                setHideError(message);

                // 失敗トースト
                notifyError("ルームを削除できませんでした", message);
            }
        } catch (err) {
            console.error(err);
            const message = err.message ?? "通信エラーが発生しました";
            setHideError(message);

            // 失敗トースト
            notifyError("ルームを削除できませんでした", message);
        } finally {
            setHideProcessing(false);
        }
    };

    const handleRestoreRoom = async (room) => {
        if (!room || !room.roomId) return;
        if (!isAdmin) return; // ADMIN 以外ならそもそも呼ばれないが一応ガード

        setRestoreProcessingId(room.roomId);
        setRestoreError(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/rooms/${encodeURIComponent(room.roomId)}/restore`,
                {
                    method: "PATCH",
                    credentials: "include",
                }
            );

            if (await handleAuthRedirectIfNeeded(res)) return;

            if (res.status === 204) {
                // 削除済み一覧から除外
                setHiddenRooms((prev) =>
                    prev.filter((r) => r.roomId !== room.roomId)
                );
                // 通常ルーム一覧を再取得
                await fetchRooms();

                notifySuccess(
                    "ルームを復元しました",
                    room.roomName ? `ルーム名: ${room.roomName}` : undefined
                );
            } else {
                let message = `ルームの復元に失敗しました: ${res.status}`;
                try {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        const body = await res.json();
                        message =
                            (body &&
                                (body.error ||
                                    body.message ||
                                    JSON.stringify(body))) ||
                            message;
                    } else {
                        const txt = await res.text();
                        if (txt) message = txt || message;
                    }
                } catch {
                    // ignore
                }
                setRestoreError(message);
                notifyError("ルームを復元できませんでした", message);
            }
        } catch (err) {
            console.error(err);
            const message = err.message ?? "通信エラーが発生しました";
            setRestoreError(message);
            notifyError("ルームを復元できませんでした", message);
        } finally {
            setRestoreProcessingId(null);
        }
    };

    useEffect(() => {
        // 通常ルーム / スタンプ数 / メモ数だけ初期ロード
        fetchRooms();
        fetchCounts();
        fetchNoteCountsForClass();
        // 削除済みルームはタブを開いたときだけ fetchHiddenRooms() を呼ぶ
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

    // ルーム名またはメモで検索フィルタ（通常タブ用）
    const filteredRooms = (rooms || []).filter((r) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();

        const name = (r.roomName ?? r.name ?? r.roomName ?? "")
            .toString()
            .toLowerCase();
        const nameMatches = name.includes(q);

        const roomKey = String(
            r.roomId ?? r.room_id ?? r.id ?? r.room ?? ""
        );
        const notes = notesByRoom[roomKey] || [];
        const noteMatches = notes.some((n) => {
            const text = (n.noteText ?? n.note_text ?? "")
                .toString()
                .toLowerCase();
            return text.includes(q);
        });

        return nameMatches || noteMatches;
    });

    // 削除済みタブ用フィルタ（名前のみ）
    const filteredHiddenRooms = (hiddenRooms || []).filter((r) => {
        if (!searchQuery || !searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        const name = (r.roomName ?? r.name ?? "")
            .toString()
            .toLowerCase();
        return name.includes(q);
    });

    const handleCardClick = (room, { isHiddenTab }) => {
        if (!room || !room.roomId) return;
        if (isHiddenTab) {
            // 削除済みタブ: クリックで履歴へ（ADMIN のみタブに到達可能）
            navigate(`/rooms/${room.roomId}/history`);
        } else {
            // 通常タブ: active なら入室、終了済みなら履歴
            if (room.active) {
                navigate(`/rooms/${room.roomId}`);
            } else {
                navigate(`/rooms/${room.roomId}/history`);
            }
        }
    };

    const navigateToHistory = (room) => {
        if (!room || !room.roomId) return;
        navigate(`/rooms/${room.roomId}/history`);
    };

    const getRoomKey = (room) =>
        String(room.roomId ?? room.room_id ?? room.id ?? room.room ?? "");

    const renderRoomCard = (room, { isHiddenTab }) => {
        const roomKey = getRoomKey(room);
        const total = countsLoading ? "-" : countsMap[roomKey] ?? 0;
        const isActive = !!room.active;
        const isRestoring = restoreProcessingId === room.roomId;

        const cardBase =
            "group rounded-3xl border-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)] cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-400 bg-white";
        const cardColor = isHiddenTab
            ? "bg-white/95 hover:bg-slate-50"
            : isActive
                ? "bg-orange-50/95 hover:bg-orange-100"
                : "bg-white/95 hover:bg-slate-50";

        return (
            <Card
                key={room.roomId}
                className={`${cardBase} ${cardColor}`}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(room, { isHiddenTab })}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(room, { isHiddenTab });
                    }
                }}
            >
                <CardContent className="flex h-32 flex-col justify-center px-8 py-5">
                    {/* 上段：ルーム名とステータス */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="text-left min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <p
                                    className={`text-sm font-medium text-slate-800 line-clamp-3 break-all ${
                                        isHiddenTab
                                            ? "line-through decoration-red-300"
                                            : ""
                                    }`}
                                >
                                    {room.roomName}
                                </p>

                                {/* ステータスバッジ (名前が短いときは横、長いときは折り返して下になる) */}
                                {!isHiddenTab && !isActive && (
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 border border-red-100 shrink-0">
                                        終了
                                    </span>
                                )}
                                {isHiddenTab && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200 shrink-0">
                                        削除済み
                                    </span>
                                )}
                            </div>

                            {room.createdAt && (
                                <p className="mt-1 text-[11px] text-slate-400">
                                    作成日時:{" "}
                                    {new Date(
                                        room.createdAt
                                    ).toLocaleString("ja-JP")}
                                </p>
                            )}
                        </div>

                        {/* 右上：ドロップダウンメニュー（カードクリックと分離） */}
                        <div
                            className="flex items-center gap-2 shrink-0 self-center"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-44"
                                >
                                    <DropdownMenuGroup>
                                        {/* 入室は通常タブかつ active のときのみ */}
                                        {!isHiddenTab && isActive && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    navigate(
                                                        `/rooms/${room.roomId}`
                                                    )
                                                }
                                            >
                                                <DoorOpen />
                                                ルームに入室
                                            </DropdownMenuItem>
                                        )}
                                        {/* 履歴は全タブで表示 */}
                                        <DropdownMenuItem
                                            onClick={() =>
                                                navigateToHistory(room)
                                            }
                                        >
                                            <History />
                                            ルーム履歴
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                        {/* 通常タブ: active -> 終了, !active -> 削除 */}
                                        {!isHiddenTab && isActive && (
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    openCloseRoomDialog({
                                                        roomId: room.roomId,
                                                        roomName:
                                                        room.roomName,
                                                    })
                                                }
                                            >
                                                <DoorClosed />
                                                ルームを終了
                                            </DropdownMenuItem>
                                        )}
                                        {!isHiddenTab && !isActive && (
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    openHideRoomDialog({
                                                        roomId: room.roomId,
                                                        roomName:
                                                        room.roomName,
                                                    })
                                                }
                                            >
                                                <Trash />
                                                ルームを削除
                                            </DropdownMenuItem>
                                        )}

                                        {/* 削除済みタブ: 復元（ADMIN のみ） */}
                                        {isHiddenTab && (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleRestoreRoom(room)
                                                }
                                                disabled={isRestoring}
                                            >
                                                <DoorOpen />
                                                {isRestoring
                                                    ? "復元中..."
                                                    : "ルームを復元"}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* 下段：スタンプ数とメモ数 */}
                    <div className="mt-3 flex items-end gap-6">
                        {/* 合計スタンプ数 */}
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Stamp className="h-5 w-5" />
                            <span className="font-semibold text-sm">
                                {total}
                            </span>
                        </div>
                        {/* メモ数（ポップオーバー付き） */}
                        <div className="relative">
                            <div
                                className="flex items-center gap-1 text-xs text-slate-600"
                                onMouseEnter={() => {
                                    openPopover(roomKey);
                                    fetchNotesForRoom(roomKey);
                                }}
                                onMouseLeave={() => scheduleClosePopover()}
                                onFocus={() => {
                                    openPopover(roomKey);
                                    fetchNotesForRoom(roomKey);
                                }}
                                onBlur={() => scheduleClosePopover()}
                                role="button"
                                tabIndex={-1}
                                aria-describedby={`notes-tooltip-${roomKey}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <StickyNote className="h-5 w-5" />
                                <span className="font-semibold text-sm">
                                    {noteCountsLoading
                                        ? "…"
                                        : noteCountsMap[roomKey] ?? 0}
                                </span>
                            </div>

                            {/* Popover */}
                            {hoveredRoom === roomKey && (
                                <div
                                    id={`notes-tooltip-${roomKey}`}
                                    className="absolute z-50 mt-2 left-0 w-72 max-h-64 overflow-auto rounded-md border border-slate-100 bg-white p-3 text-sm text-slate-700 shadow-lg"
                                    onMouseEnter={() =>
                                        openPopover(roomKey)
                                    }
                                    onMouseLeave={() =>
                                        scheduleClosePopover()
                                    }
                                >
                                    {notesLoadingMap[roomKey] ? (
                                        <div className="text-xs text-slate-500">
                                            読み込み中...
                                        </div>
                                    ) : notesByRoom[roomKey] &&
                                    notesByRoom[roomKey].length > 0 ? (
                                        notesByRoom[roomKey].map((n) => (
                                            <div
                                                key={
                                                    n.noteId ??
                                                    `${n.createdAt}-${Math.random()}`
                                                }
                                                className="mb-2 last:mb-0"
                                            >
                                                <div className="whitespace-pre-wrap break-words text-[13px]">
                                                    {n.noteText ??
                                                        n.note_text ??
                                                        ""}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-500">
                                            メモはありません
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 mt-20 text-sm text-slate-600">
                <Spinner className="size-8" />
                <span>読み込み中</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-sm text-red-600">
                エラー: {error}
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>戻る</span>
                    </Button>
                </div>
            </div>
        );
    }

    // ADMIN 以外の場合は、実質的に activeTab は常に ACTIVE として扱う
    const effectiveActiveTab = isAdmin ? activeTab : ROOM_TAB.ACTIVE;

    return (
        <section className="py-4">
            {/* 戻るボタン */}
            <div className="mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1 px-0 text-xs text-slate-600 hover:text-slate-800"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>クラス一覧へ戻る</span>
                </Button>
            </div>

            {/* クラス名の見出し＋スタンプ/ユーザー管理ボタン */}
            <div className="mb-12 flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 flex-1 min-w-0 break-all mr-4">
                    {classInfo?.className ?? "-"}
                </h1>

                {/* スタンプ管理 / ユーザー管理 ボタングループ */}
                <div className="inline-flex items-center rounded-md border bg-background text-sm shadow-sm overflow-hidden shrink-0">
                    {/* スタンプ管理ダイアログ */}
                    <Dialog
                        open={openStampDialog}
                        onOpenChange={(open) => setOpenStampDialog(open)}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                className="rounded-none border-r text-xs font-medium inline-flex items-center gap-1.5"
                            >
                                <Stamp className="h-4 w-4" />
                                <span>スタンプ管理</span>
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    クラスで使用するスタンプの管理
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    このクラスで使用するスタンプを追加・削除できます。
                                </DialogDescription>
                            </DialogHeader>

                            <ClassStampManagement
                                classId={classId}
                                userId={userId}
                                open={openStampDialog}
                            />
                        </DialogContent>
                    </Dialog>

                    {/* ユーザー管理ダイアログ */}
                    <Dialog
                        open={openUserDialog}
                        onOpenChange={(open) => {setOpenUserDialog(open);}}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                className="rounded-none text-xs font-medium inline-flex items-center gap-1.5"
                            >
                                <Users className="h-4 w-4" />
                                <span>ユーザー管理</span>
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    クラスに参加するユーザーの管理
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    このクラスに参加するユーザーを追加・削除できます。
                                </DialogDescription>
                            </DialogHeader>

                            <ClassUserManagement
                                classId={classId}
                                open={openUserDialog}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator className="mb-6" />

            {/* ルーム一覧タイトル＋Tabs＋検索＋ルーム作成 */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                    {isAdmin ? (
                        <Select
                            value={effectiveActiveTab}
                            onValueChange={(val) => {
                                setActiveTab(val);
                                if (
                                    val === ROOM_TAB.HIDDEN &&
                                    (!hiddenRooms || hiddenRooms.length === 0) &&
                                    !hiddenLoading
                                ) {
                                    fetchHiddenRooms();
                                }
                            }}
                        >
                            <SelectTrigger
                                className="
                                    inline-flex h-auto items-center gap-1 border-0
                                    bg-transparent px-0 py-0 shadow-none
                                    text-lg font-semibold text-slate-800
                                    focus:ring-0 focus:ring-offset-0
                                "
                            >
                                <span>
                                    {effectiveActiveTab === ROOM_TAB.HIDDEN
                                        ? "削除済みのルーム"
                                        : "ルーム一覧"}
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ROOM_TAB.ACTIVE}>
                                    ルーム一覧
                                </SelectItem>
                                <SelectItem value={ROOM_TAB.HIDDEN}>
                                    削除済みのルーム
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <h2 className="text-lg font-semibold text-slate-800">
                            ルーム一覧
                        </h2>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* search input */}
                    <div className="mr-2 w-full max-w-xs">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 w-4 h-4 text-slate-400 -translate-y-1/2 pointer-events-none" />
                            <Input
                                value={searchQuery}
                                onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                }
                                placeholder="ルーム名またはメモで検索"
                                className="text-sm bg-white pl-8"
                                aria-label="ルーム名またはメモで検索"
                            />
                            {searchQuery && (
                                <button
                                    aria-label="検索クリア"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"
                                >
                                    クリア
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ルーム新規作成ダイアログ */}
                    <Dialog
                        open={openCreateDialog}
                        onOpenChange={(open) => {
                            setOpenCreateDialog(open);
                            if (!open) {
                                setCreateError(null);
                                setCreateSuccess(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="text-xs font-medium inline-flex items-center gap-1.5">
                                <Plus className="h-4 w-4" />
                                <span>ルームを作成</span>
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>新しいルームを作成</DialogTitle>
                                <DialogDescription className="text-xs">
                                    授業で使用するルームを登録します。ルーム名は後から変更できます。
                                </DialogDescription>
                            </DialogHeader>

                            <form
                                onSubmit={handleCreateRoom}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="new-room-name"
                                        className="text-xs font-medium text-slate-700"
                                    >
                                        ルーム名
                                    </Label>
                                    <Input
                                        id="new-room-name"
                                        type="text"
                                        placeholder="例: 1限目 / 2限目"
                                        value={createRoomName}
                                        onChange={(e) =>
                                            setCreateRoomName(e.target.value)
                                        }
                                        className="text-sm"
                                    />
                                    {createError && (
                                        <p className="text-[11px] text-red-600">
                                            {createError}
                                        </p>
                                    )}
                                    {createSuccess && (
                                        <p className="text-[11px] text-emerald-600">
                                            {createSuccess}
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
                                            setCreateSuccess(null);
                                        }}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={creating}
                                        className="text-xs font-medium"
                                    >
                                        {creating ? "作成中..." : "作成"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ADMIN かつ 削除済みタブ選択時のエラー表示 */}
            {isAdmin && effectiveActiveTab === ROOM_TAB.HIDDEN && restoreError && (
                <p className="text-[11px] text-red-600 mb-2">{restoreError}</p>
            )}
            {isAdmin && effectiveActiveTab === ROOM_TAB.HIDDEN && hiddenError && (
                <p className="text-[11px] text-red-600 mb-2">{hiddenError}</p>
            )}

            {/* タブごとの一覧 */}
            {effectiveActiveTab === ROOM_TAB.ACTIVE ? (
                    (!filteredRooms || filteredRooms.length === 0) ? (
                        <p className="text-sm text-slate-500">
                            ルームが見つかりません
                        </p>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredRooms.map((r) =>
                                renderRoomCard(r, { isHiddenTab: false })
                            )}
                        </div>
                    )
                ) : // ここに到達するのは ADMIN かつ HIDDEN タブ選択時のみ
                hiddenLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 mt-8 text-sm text-slate-600">
                        <Spinner className="size-6" />
                        <span>削除済みルームを読み込み中</span>
                    </div>
                ) : (!filteredHiddenRooms ||
                    filteredHiddenRooms.length === 0) ? (
                    <p className="text-sm text-slate-500">
                        削除済みルームはありません
                    </p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredHiddenRooms.map((r) =>
                            renderRoomCard(r, { isHiddenTab: true })
                        )}
                    </div>
                )}

            {/* ルーム終了確認ダイアログ */}
            <Dialog
                open={openCloseDialog}
                onOpenChange={(open) => {
                    setOpenCloseDialog(open);
                    if (!open) {
                        setSelectedRoom(null);
                        setCloseError(null);
                        setCloseProcessing(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>ルームを終了しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedRoom
                                ? `「${selectedRoom.roomName}」を終了します。よろしいですか？`
                                : "終了するルームを確認してください。"}
                        </DialogDescription>
                    </DialogHeader>

                    {closeError && (
                        <p className="text-sm text-red-600 mb-2">
                            {closeError}
                        </p>
                    )}

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setOpenCloseDialog(false);
                                setSelectedRoom(null);
                                setCloseError(null);
                            }}
                            disabled={closeProcessing}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            className="text-xs font-medium"
                            onClick={handleConfirmClose}
                            disabled={closeProcessing}
                        >
                            {closeProcessing ? "終了中..." : "終了"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ルーム削除（非表示）確認ダイアログ */}
            <Dialog
                open={openHideDialog}
                onOpenChange={(open) => {
                    setOpenHideDialog(open);
                    if (!open) {
                        setHideSelectedRoom(null);
                        setHideError(null);
                        setHideProcessing(false);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>このルームを削除しますか？</DialogTitle>
                        <DialogDescription className="text-xs">
                            {hideSelectedRoom
                                ? `「${hideSelectedRoom.roomName}」を削除します。この操作は取り消せません。`
                                : "削除するルームを確認してください。"}
                        </DialogDescription>
                    </DialogHeader>

                    {hideError && (
                        <p className="text-sm text-red-600 mb-2">
                            {hideError}
                        </p>
                    )}

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                                setOpenHideDialog(false);
                                setHideSelectedRoom(null);
                                setHideError(null);
                            }}
                            disabled={hideProcessing}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="text-xs font-medium"
                            onClick={handleConfirmHide}
                            disabled={hideProcessing}
                        >
                            {hideProcessing ? "削除中…" : "削除"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}