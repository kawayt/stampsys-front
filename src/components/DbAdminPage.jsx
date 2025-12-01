import React, { useEffect, useState } from "react";
import {
    fetchDbTables,
    fetchDbTableColumns,
    fetchDbTableRows,
    createDbRow,
    updateDbRow,
    deleteDbRow,
} from "@/api/adminDb";
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

/**
 * 改良レイアウトの DB 管理ページ（完全版）
 *
 * - tableName を GenericRowEditor に渡す
 * - user_visibility を左メニューから除外するフィルタ追加
 * - 選択テーブルが user_visibility だった場合に自動的に別のテーブルに切替
 * - 編集完了時やヘッダの「クラス一覧へ戻る」ボタンで /classes に戻る機能を追加
 */
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

    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // editor
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState("create");
    const [editorRow, setEditorRow] = useState(null);
    const [editorSubmitting, setEditorSubmitting] = useState(false);
    const [editorError, setEditorError] = useState(null);

    // delete
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetRow, setDeleteTargetRow] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // 管理者ガード（ビュー側）
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

    // 初期: テーブル一覧取得（user_visibility を除外）
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
        return () => {
            cancelled = true;
        };
    }, []);

    // 追加: 選択テーブルが user_visibility になっていたら別へ切替
    useEffect(() => {
        if (!selectedTable) return;
        if (String(selectedTable).toLowerCase() === "user_visibility") {
            const first = tables[0];
            setSelectedTable(first ? (first.tableName || first.name) : null);
        }
    }, [tables, selectedTable]);

    // selectedTable が変わったら columns / rows を取得
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

        return () => {
            cancelled = true;
        };
    }, [selectedTable, limit, offset]);

    const selectTable = (name) => {
        setSelectedTable(name);
        setOffset(0);
    };

    const canPrev = offset > 0;
    const canNext = offset + limit < totalCount;

    const prev = () => setOffset((p) => Math.max(0, p - limit));
    const next = () => setOffset((p) => p + limit);

    const openCreate = () => {
        setEditorMode("create");
        setEditorRow(null);
        setEditorError(null);
        setEditorOpen(true);
    };
    const openEdit = (r) => {
        setEditorMode("update");
        setEditorRow(r);
        setEditorError(null);
        setEditorOpen(true);
    };

    const handleSubmitEditor = async (payload) => {
        if (!selectedTable) return;
        setEditorSubmitting(true);
        setEditorError(null);
        try {
            if (editorMode === "create") {
                await createDbRow(selectedTable, payload);
            } else {
                const pk = columns.find((c) => c.isPrimaryKey);
                if (!pk) throw new Error("主キーが見つかりません");
                const id = editorRow[pk.name];
                await updateDbRow(selectedTable, id, payload);
            }
            const data = await fetchDbTableRows(selectedTable, { limit, offset });
            setRows(data.rows || []);
            setTotalCount(data.totalCount ?? 0);
            setEditorOpen(false);
            //
            // // 編集完了時にクラス一覧へ戻る（要望により）
            // navigate("/classes");
        } catch (e) {
            setEditorError(e.message || String(e));
        } finally {
            setEditorSubmitting(false);
        }
    };

    const openDelete = (r) => {
        setDeleteTargetRow(r);
        setDeleteError(null);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedTable) return;
        const pk = columns.find((c) => c.isPrimaryKey);
        if (!pk) {
            setDeleteError("主キーが見つかりません");
            return;
        }
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

    // ---- レイアウト: Dashboardに近い max-width コンテナ ----
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto max-w-5xl px-4 py-3">
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

            <main className="mx-auto max-w-5xl px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
                    {/* Left: サイドバー */}
                    <aside>
                        <Card className="bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm">テーブル</CardTitle>
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
                                                    {name}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Right: メイン */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-sm font-medium">{selectedTable || "テーブル未選択"}</h2>
                                <p className="text-xs text-slate-500">
                                    単一主キーのテーブルはフォームで編集できます。慎重に操作してください。
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600">{totalCount === 0 ? "0件" : `${offset + 1}〜${Math.min(offset + limit, totalCount)} / ${totalCount}件`}</span>
                                <Button variant="outline" size="xs" onClick={prev} disabled={!canPrev || rowsLoading}>前へ</Button>
                                <Button variant="outline" size="xs" onClick={next} disabled={!canNext || rowsLoading}>次へ</Button>
                                <Button variant="default" size="xs" onClick={openCreate} disabled={rowsLoading || !selectedTable}>新規行追加</Button>
                            </div>
                        </div>

                        <Card className="shadow-sm">
                            <CardContent>
                                {columnsLoading && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                        <Spinner size="xs" /> カラム取得中…
                                    </div>
                                )}
                                {columnsError && <p className="text-xs text-red-600 mb-2">{columnsError}</p>}
                                {rowsLoading && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                        <Spinner size="xs" /> データ取得中…
                                    </div>
                                )}
                                {rowsError && <p className="text-xs text-red-600 mb-2">{rowsError}</p>}

                                {!selectedTable && <p className="text-xs text-slate-500">左の一覧からテーブルを選択してください</p>}

                                {selectedTable && rows.length === 0 && !rowsLoading && <p className="text-xs text-slate-500">データがありません</p>}

                                {selectedTable && rows.length > 0 && (
                                    <div className="overflow-auto max-h-[60vh]">
                                        <Table className="min-w-full text-sm">
                                            <TableHeader>
                                                <TableRow>
                                                    {columns.map((c) => <TableHead key={c.name}>{c.name}</TableHead>)}
                                                    <TableHead>操作</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map((r, idx) => (
                                                    <TableRow key={idx} className="odd:bg-white even:bg-slate-50">
                                                        {columns.map((c) => {
                                                            const v = r[c.name];
                                                            let display = v;
                                                            if (v === null || typeof v === "undefined") display = "";
                                                            else if (typeof v === "object") display = JSON.stringify(v);
                                                            return <TableCell key={c.name}>{String(display)}</TableCell>;
                                                        })}
                                                        <TableCell className="whitespace-nowrap space-x-2">
                                                            <Button variant="outline" size="xs" onClick={() => openEdit(r)} disabled={rowsLoading}>編集</Button>
                                                            <Button variant="destructive" size="xs" onClick={() => openDelete(r)} disabled={rowsLoading}>削除</Button>
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

            {/* Generic editor */}
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

            {/* delete dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={(o) => !deleteSubmitting && setDeleteDialogOpen(o)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm">行を削除</DialogTitle>
                        <DialogDescription className="text-xs">この操作は元に戻せません。選択した行を本当に削除してよろしいですか？</DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-50 border rounded px-3 py-2 text-xs max-h-40 overflow-auto">
                        <pre className="whitespace-pre-wrap">{deleteTargetRow ? JSON.stringify(deleteTargetRow, null, 2) : "（行が選択されていません）"}</pre>
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