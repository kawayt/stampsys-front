import React, { useEffect, useState } from "react";
import {
    fetchDbTables,
    fetchDbTableColumns,
    fetchDbTableRows,
    createDbRow,
    updateDbRow,
    deleteDbRow,
} from "@/api/adminDb";
import dbAdminConfig from "@/config/dbAdminConfig";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { GenericRowEditor } from "@/components/GenericRowEditor";
import { useNavigate } from "react-router-dom";
// 追加: セル書式化ユーティリティ（true/false -> 有効/無効 等）
import formatCellValue from "@/utils/formatCellValue";

export function DbAdminPage({ currentUserRole }) {
    const navigate = useNavigate();

    const [tables, setTables] = useState([]);
    const [tablesLoading, setTablesLoading] = useState(true);
    const [tablesError, setTablesError] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [columns, setColumns] = useState([]);
    const [columnsLoading, setColumnsLoading] = useState(false);
    const [columnsError, setColumnsError] = useState(null);
    const [rows, setRows] = useState([]);
    const [rowsLoading, setRowsLoading] = useState(false);
    const [rowsError, setRowsError] = useState(null);
    const [limit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // 検索（現在ページ内の絞り込み）
    const [searchQuery, setSearchQuery] = useState("");

    // editor state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState("create");
    const [editorRow, setEditorRow] = useState(null);
    const [editorSubmitting, setEditorSubmitting] = useState(false);
    const [editorError, setEditorError] = useState(null);
    // delete state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetRow, setDeleteTargetRow] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // ▼▼▼ 【設定】編集ボタンを非表示にするテーブル名 ▼▼▼
    const noEditTables = ["stamps_classes", "users_classes"];

    // 権限チェック
    if (currentUserRole && String(currentUserRole).toUpperCase() !== "ADMIN") {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-2xl">
                    <Card className="border-red-100 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-700">アクセス権限がありません</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-red-600">このページは管理者（ADMIN）のみアクセスできます。</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // テーブル一覧取得
    useEffect(() => {
        let cancelled = false;
        async function loadTables() {
            setTablesLoading(true);
            setTablesError(null);
            try {
                const data = await fetchDbTables();
                if (cancelled) return;
                const filtered = (data || []).filter((t) => {
                    const name = (t.tableName || t.name || "").toLowerCase();
                    return name !== "user_visibility";
                });
                setTables(filtered);
                if (filtered && filtered.length > 0) {
                    setSelectedTable((prev) => prev ?? (filtered[0].tableName || filtered[0].name));
                } else {
                    setSelectedTable(null);
                }
            } catch (err) {
                if (cancelled) return;
                setTablesError(err.message || String(err));
            } finally {
                if (!cancelled) setTablesLoading(false);
            }
        }
        loadTables();
        return () => { cancelled = true; };
    }, []);

    // user_visibility除外処理
    useEffect(() => {
        if (!selectedTable) return;
        if (String(selectedTable).toLowerCase() === "user_visibility") {
            const first = tables[0];
            setSelectedTable(first ? (first.tableName || first.name) : null);
        }
    }, [tables, selectedTable]);

    // カラム・データ取得
    useEffect(() => {
        if (!selectedTable) return;
        let cancelled = false;
        async function loadColumns() {
            setColumnsLoading(true);
            setColumnsError(null);
            try {
                const cols = await fetchDbTableColumns(selectedTable);
                if (cancelled) return;
                setColumns(cols || []);
            } catch (err) {
                if (cancelled) return;
                setColumnsError(err.message || String(err));
            } finally {
                if (!cancelled) setColumnsLoading(false);
            }
        }
        async function loadRows() {
            setRowsLoading(true);
            setRowsError(null);
            try {
                const data = await fetchDbTableRows(selectedTable, { limit, offset });
                if (cancelled) return;
                setRows(data.rows || []);
                setTotalCount(data.totalCount ?? 0);
            } catch (err) {
                if (cancelled) return;
                setRowsError(err.message || String(err));
            } finally {
                if (!cancelled) setRowsLoading(false);
            }
        }
        loadColumns();
        loadRows();
        return () => { cancelled = true; };
    }, [selectedTable, limit, offset]);

    // ハンドラ群
    const selectTable = (name) => { setSelectedTable(name); setOffset(0); };
    const canPrev = offset > 0;
    const canNext = offset + limit < totalCount;
    const prev = () => setOffset((p) => Math.max(0, p - limit));
    const next = () => setOffset((p) => p + limit);
    const openCreate = () => { setEditorMode("create"); setEditorRow(null); setEditorError(null); setEditorOpen(true); };
    const openEdit = (r) => { setEditorMode("update"); setEditorRow(r); setEditorError(null); setEditorOpen(true); };

    const handleSubmitEditor = async (payload) => {
        if (!selectedTable) return;
        setEditorSubmitting(true);
        setEditorError(null);
        try {
            if (editorMode === "create") {
                await createDbRow(selectedTable, payload);
            } else {
                const pk = columns.find((c) => c.isPrimaryKey);
                if (!pk) {
                    setEditorError("主キーが見つかりません");
                    return;
                }
                const id = editorRow[pk.name];
                await updateDbRow(selectedTable, id, payload);
            }
            const data = await fetchDbTableRows(selectedTable, { limit, offset });
            setRows(data.rows || []);
            setTotalCount(data.totalCount ?? 0);
            setEditorOpen(false);
        } catch (e) {
            setEditorError(e.message || String(e));
        } finally {
            setEditorSubmitting(false);
        }
    };

    const openDelete = (r) => { setDeleteTargetRow(r); setDeleteError(null); setDeleteDialogOpen(true); };
    const handleConfirmDelete = async () => {
        if (!selectedTable) return;
        const pk = columns.find((c) => c.isPrimaryKey);
        if (!pk) { setDeleteError("主キーが見つかりません"); return; }
        const id = deleteTargetRow[pk.name];
        setDeleteSubmitting(true);
        setDeleteError(null);
        try {
            await deleteDbRow(selectedTable, id);
            const data = await fetchDbTableRows(selectedTable, { limit, offset });
            setRows(data.rows || []);
            setTotalCount(data.totalCount ?? 0);
            setDeleteDialogOpen(false);
        } catch (e) {
            setDeleteError(e.message || String(e));
        } finally {
            setDeleteSubmitting(false);
        }
    };

    const selectedTableConfig = dbAdminConfig[selectedTable] || {};
    const selectedTableLabel = selectedTableConfig.tableLabel || selectedTable || "テーブル未選択";

    // ▼ 編集ボタンを表示するかどうかのフラグ
    const canEdit = selectedTable && !noEditTables.includes(selectedTable);

    // ▼ 一覧に表示するカラム（スタンプテーブルは user_id のみ非表示）
    const visibleColumns = React.useMemo(() => {
        const table = String(selectedTable || "").toLowerCase();
        if (table !== "stamps") return columns;

        const hiddenKeys = new Set(["user_id", "userId", "userid"]);
        return (columns || []).filter((c) => !hiddenKeys.has(c.name));
    }, [columns, selectedTable]);

    // ▼ 検索クエリで現在ページ内の行をフィルタ（並び順は維持）
    const filteredRows = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;

        const cols = columns || [];

        return (rows || []).filter((r) => {
            for (const c of cols) {
                const v = r?.[c.name];
                if (v == null) continue;
                const s = String(v).toLowerCase();
                if (s.includes(q)) return true;
            }
            return false;
        });
    }, [rows, columns, searchQuery]);

    // ▼ 削除ダイアログに出す行プレビュー（テーブルごとに一部キーを非表示）
    const deletePreviewRow = React.useMemo(() => {
        if (!deleteTargetRow) return null;

        const table = String(selectedTable || "").toLowerCase();
        // users / users_classes / stamps ではユーザーID系キーを表示しない
        const shouldHideUserId = table === "users" || table === "users_classes" || table === "stamps";
        if (!shouldHideUserId) return deleteTargetRow;

        const hiddenKeys = new Set([
            "id",
            "userId",
            "user_id",
            "userid",
            "user_id_fk",
        ]);

        const filtered = {};
        for (const [k, v] of Object.entries(deleteTargetRow)) {
            if (hiddenKeys.has(k)) continue;
            filtered[k] = v;
        }
        return filtered;
    }, [deleteTargetRow, selectedTable]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto max-w-7xl px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800">DB 管理</h1>
                            <p className="text-xs text-slate-500">公開スキーマ内のテーブルを閲覧・編集（管理者用）</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate("/classes")}>
                                クラス一覧へ戻る
                            </Button>
                            <div className="text-xs text-slate-500">ADMIN 用ツール</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
                    {/* サイドバー */}
                    <aside>
                        <Card className="bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm">テーブル一覧</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {tablesLoading && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Spinner size="xs" /> 読み込み中…
                                    </div>
                                )}
                                {tablesError && <p className="text-xs text-red-600">{tablesError}</p>}
                                <ul className="space-y-1 max-h-[64vh] overflow-auto text-sm">
                                    {tables.map((t) => {
                                        const name = t.tableName || t.name || "";
                                        const active = name === selectedTable;
                                        const cfg = dbAdminConfig[name] || {};
                                        const displayName = cfg.tableLabel || name;
                                        return (
                                            <li key={name}>
                                                <button
                                                    type="button"
                                                    onClick={() => selectTable(name)}
                                                    className={
                                                        "w-full text-left px-3 py-2 rounded-md transition-colors " +
                                                        (active ? "bg-indigo-600 text-white" : "hover:bg-slate-100 text-slate-700")
                                                    }
                                                >
                                                    {displayName}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* メインコンテンツ */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-sm font-medium">{selectedTableLabel}</h2>
                                <p className="text-xs text-slate-500">
                                    単一主キーのテーブルはフォームで編集できます。慎重に操作してください。
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600">{totalCount === 0 ? "0件" : `${offset + 1}〜${Math.min(offset + limit, totalCount)} / ${totalCount}件`}</span>
                                <Button variant="outline" size="sm" onClick={prev} disabled={!canPrev || rowsLoading}>前へ</Button>
                                <Button variant="outline" size="sm" onClick={next} disabled={!canNext || rowsLoading}>次へ</Button>
                                <Button variant="default" size="sm" onClick={openCreate} disabled={rowsLoading || !selectedTable}>新規行追加</Button>
                            </div>
                        </div>

                        {/* 検索ボックス（現在ページ内の絞り込み） */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-xs text-slate-500">検索:</div>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="このページ内を検索"
                                className="h-8 w-[260px] rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-400"
                            />
                            {searchQuery && (
                                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>クリア</Button>
                            )}
                            <div className="ml-auto text-xs text-slate-500">
                                表示: {filteredRows.length}件
                            </div>
                        </div>

                        <Card className="shadow-sm">
                            <CardContent>
                                {columnsLoading && <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Spinner size="xs" /> カラム取得中…</div>}
                                {columnsError && <p className="text-xs text-red-600 mb-2">{columnsError}</p>}
                                {rowsLoading && <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Spinner size="xs" /> データ取得中…</div>}
                                {rowsError && <p className="text-xs text-red-600 mb-2">{rowsError}</p>}

                                {!selectedTable && <p className="text-xs text-slate-500">左の一覧からテーブルを選択してください</p>}
                                {selectedTable && rows.length === 0 && !rowsLoading && <p className="text-xs text-slate-500">データがありません</p>}

                                {selectedTable && rows.length > 0 && (
                                    <div className="overflow-auto max-h-[60vh]">
                                        <Table className="min-w-full text-sm">
                                            <TableHeader>
                                                <TableRow>
                                                    {visibleColumns.map((c) => {
                                                        const cfg = dbAdminConfig?.[selectedTable] || {};
                                                        const label = cfg.labels?.[c.name] || c.name;
                                                        return <TableHead key={c.name} className="whitespace-nowrap">{label}</TableHead>;
                                                    })}
                                                    <TableHead className="whitespace-nowrap">操作</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRows.map((r, idx) => (
                                                    <TableRow key={idx} className="odd:bg-white even:bg-slate-50">
                                                        {visibleColumns.map((c) => {
                                                            const v = r[c.name];
                                                            const display = formatCellValue(selectedTable, c.name, v);
                                                            return <TableCell key={c.name} className="whitespace-nowrap max-w-[200px] truncate">{String(display)}</TableCell>;
                                                        })}
                                                        <TableCell className="whitespace-nowrap space-x-2">
                                                            {/* ▼ 編集ボタンの表示制御（stamps_classesなどは非表示） */}
                                                            {canEdit && (
                                                                <Button variant="outline" size="sm" onClick={() => openEdit(r)} disabled={rowsLoading}>編集</Button>
                                                            )}
                                                            <Button variant="destructive" size="sm" onClick={() => openDelete(r)} disabled={rowsLoading}>削除</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </main>

            <GenericRowEditor
                open={editorOpen}
                mode={editorMode}
                row={editorRow}
                tableName={selectedTable}
                columns={columns}
                onCancel={() => setEditorOpen(false)}
                onSubmit={handleSubmitEditor}
                submitting={editorSubmitting}
                error={editorError}
            />

            <Dialog open={deleteDialogOpen} onOpenChange={(o) => !deleteSubmitting && setDeleteDialogOpen(o)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm">行を削除</DialogTitle>
                        <DialogDescription className="text-xs">この操作は元に戻せません。選択した行を本当に削除してよろしいですか？</DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-50 border rounded px-3 py-2 text-xs max-h-40 overflow-auto">
                        <pre className="whitespace-pre-wrap">{deletePreviewRow ? JSON.stringify(deletePreviewRow, null, 2) : "（行が選択されていません）"}</pre>
                    </div>
                    {deleteError && <p className="text-xs text-red-600 mt-2">{deleteError}</p>}
                    <DialogFooter className="flex justify-end gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={deleteSubmitting}>キャンセル</Button>
                        <Button variant="destructive" size="sm" onClick={handleConfirmDelete} disabled={deleteSubmitting}>{deleteSubmitting ? "削除中…" : "削除する"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
