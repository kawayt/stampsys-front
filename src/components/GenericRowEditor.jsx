import React, { useEffect, useMemo, useState } from "react";
import dbAdminConfig from "@/config/dbAdminConfig";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchDbTableRows, fetchDbTableColumns } from "@/api/adminDb";

/**
 * GenericRowEditor (改善版)
 *
 * Props:
 * - open
 * - mode: "create" | "update"
 * - row: object | null
 * - tableName: string (必須 — 編集対象のテーブル名)
 * - columns: [{ name, dataType, isNullable, isPrimaryKey, columnDefault }, ...]
 * - onCancel, onSubmit, submitting, error
 *
 * 特徴:
 * - tableName を使って dbAdminConfig の設定 (readonly / editable / lookups) を反映する
 * - lookups では table/label を優先的に使用し、選択肢ラベルは "id — label" の形で表示
 * - *_id の数値変換は列の dataType を参照して行う
 */
export function GenericRowEditor({
                                     open,
                                     mode,
                                     row,
                                     tableName,
                                     columns = [],
                                     onCancel,
                                     onSubmit,
                                     submitting,
                                     error,
                                 }) {
    const [form, setForm] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [lookupOptions, setLookupOptions] = useState({}); // { tableName: [{value,label,raw}, ...] }

    const tableCfg = dbAdminConfig?.[tableName] || {};
    const readonlyFromCfg = new Set(tableCfg.readonly || []);
    const explicitEditableSet = tableCfg.editable ? new Set(tableCfg.editable) : null;
    const lookupCfg = tableCfg.lookups || {}; // colName -> { table, label }

    const editableColumns = useMemo(() => {
        return columns.filter((c) => {
            // PK always not editable
            if (c.isPrimaryKey) return false;
            // config readonly
            if (readonlyFromCfg.has(c.name)) return false;
            // explicit editable list: only allow those
            if (explicitEditableSet) return explicitEditableSet.has(c.name);
            // sequence default (nextval) -> not editable
            const cd = c.columnDefault ? String(c.columnDefault).toLowerCase() : "";
            if (cd.includes("nextval")) return false;
            return true;
        });
    }, [columns, readonlyFromCfg, explicitEditableSet]);

    useEffect(() => {
        if (!open) return;
        const base = {};
        editableColumns.forEach((c) => {
            const val = row ? row[c.name] : null;
            base[c.name] = val === undefined ? null : val;
        });
        setForm(base);
        setFieldErrors({});
        setLookupOptions({});

        // prefetch lookups for *_id columns (or those configured)
        editableColumns.forEach((c) => {
            if (/_id$/.test(c.name) || lookupCfg[c.name]) {
                const cfg = lookupCfg[c.name];
                const table = cfg?.table ?? (c.name.replace(/_id$/, "") + "s");
                fetchLookupOptions(table, c.name);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, row, columns, tableName]);

    // Fetch options for a lookup table and optionally tie to column name for label preferences
    async function fetchLookupOptions(tableNameToFetch, columnName) {
        try {
            // Determine label candidate and pk via metadata if possible
            let pkKey = null;
            let labelCandidates = ["name", "title", "room_name", "class_name", "user_name", "email", "label"];
            try {
                const colsMeta = await fetchDbTableColumns(tableNameToFetch);
                if (Array.isArray(colsMeta)) {
                    const pk = colsMeta.find((c) => c.isPrimaryKey);
                    if (pk) pkKey = pk.name;
                    const presentNames = colsMeta.map((c) => c.name);
                    labelCandidates = ["name", "title", "room_name", "class_name", "user_name", "email", "label", ...presentNames];
                }
            } catch (e) {
                // ignore meta failure; fallback to defaults
            }

            const data = await fetchDbTableRows(tableNameToFetch, { limit: 500, offset: 0 });
            const rowsData = data.rows || [];

            const opts = rowsData.map((r) => {
                let effectivePk = pkKey;
                if (!effectivePk) {
                    effectivePk = Object.keys(r).find((k) => k === "id" || /_id$/.test(k)) || Object.keys(r)[0];
                }
                const value = r[effectivePk];

                // If config provides label column for the columnName, use it
                let labelText = "";
                const colLookupCfg = columnName ? lookupCfg[columnName] : null;
                if (colLookupCfg?.label && typeof colLookupCfg.label === "string" && r.hasOwnProperty(colLookupCfg.label)) {
                    labelText = String(r[colLookupCfg.label]);
                } else {
                    for (const cand of labelCandidates) {
                        if (typeof cand === "string" && r.hasOwnProperty(cand) && r[cand] !== null && r[cand] !== undefined) {
                            labelText = String(r[cand]);
                            break;
                        }
                    }
                }

                if (!labelText) {
                    const fallbackParts = [];
                    if (r[effectivePk] !== undefined) fallbackParts.push(String(r[effectivePk]));
                    const maybeName = Object.keys(r).find((k) => /name|title|label|email/i.test(k) && r[k]);
                    if (maybeName) fallbackParts.push(String(r[maybeName]));
                    labelText = fallbackParts.length > 0 ? fallbackParts.join(" - ") : JSON.stringify(r);
                }

                const finalLabel = `${String(value)} — ${labelText}`;
                return { value, label: finalLabel, raw: r };
            });

            setLookupOptions((s) => ({ ...s, [tableNameToFetch]: opts }));
        } catch (e) {
            setLookupOptions((s) => ({ ...s, [tableNameToFetch]: [] }));
        }
    }

    function handleChange(name, v) {
        setForm((f) => ({ ...f, [name]: v }));
        setFieldErrors((fe) => ({ ...fe, [name]: undefined }));
    }

    function toLocalDatetimeInput(value) {
        if (!value) return "";
        try {
            const d = new Date(value);
            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            return iso;
        } catch (e) {
            return "";
        }
    }

    function fromLocalDatetimeInput(value) {
        if (!value) return null;
        const d = new Date(value);
        return d.toISOString();
    }

    async function handleSubmit() {
        // client-side validation for NOT NULL
        const errs = {};
        editableColumns.forEach((c) => {
            if (!c.isNullable) {
                const v = form[c.name];
                if (v === null || typeof v === "undefined" || v === "") {
                    errs[c.name] = "必須項目です";
                }
            }
        });
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            return;
        }

        // build payload: convert types accordingly
        const payload = {};
        for (const c of editableColumns) {
            let v = form[c.name];
            const dt = (c.dataType || "").toLowerCase();
            if (v === null || typeof v === "undefined" || v === "") {
                payload[c.name] = null;
                continue;
            }

            // If the column is configured as a lookup, ensure we use numeric when appropriate
            const cfg = lookupCfg[c.name];

            // foreign key numeric conversion: *_id with integer-like type
            if (/_id$/.test(c.name) && (dt.includes("int") || dt.includes("bigint"))) {
                const n = typeof v === "number" ? v : Number(v);
                payload[c.name] = Number.isNaN(n) ? v : n;
                continue;
            }

            if (dt.includes("json")) {
                try {
                    payload[c.name] = JSON.parse(v);
                } catch (e) {
                    payload[c.name] = v;
                }
            } else if (dt.includes("timestamp") || dt.includes("date") || dt.includes("time")) {
                payload[c.name] = fromLocalDatetimeInput(v);
            } else if (dt.includes("boolean")) {
                payload[c.name] = !!v;
            } else if (dt.includes("integer") || dt.includes("numeric") || dt.includes("decimal") || dt.includes("bigint")) {
                if (typeof v === "string") {
                    const num = Number(v);
                    payload[c.name] = Number.isNaN(num) ? v : num;
                } else {
                    payload[c.name] = v;
                }
            } else {
                payload[c.name] = v;
            }
        }

        await onSubmit(payload);
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !submitting && !o && onCancel()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-sm">{mode === "create" ? "新規行の追加" : "行の編集"}</DialogTitle>
                    <DialogDescription className="text-xs">
                        フォームで値を編集してください。自動管理カラム（created_at 等）は編集不可です。
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-2 max-h-[60vh] overflow-auto">
                    {editableColumns.map((c) => {
                        const dt = (c.dataType || "").toLowerCase();
                        const value = form[c.name];
                        const key = c.name;

                        // lookup select for foreign keys (respect config)
                        if (/_id$/.test(key) || lookupCfg[key]) {
                            const cfg = lookupCfg[key];
                            const inferred = key.replace(/_id$/, "");
                            const table = cfg?.table ?? inferred + "s";
                            const opts = lookupOptions[table] || [];
                            return (
                                <label className="flex flex-col gap-1 text-xs" key={key}>
                                    <span className="font-medium text-sm">{key}</span>
                                    <div className="flex gap-2">
                                        <select
                                            className="border rounded px-2 py-1 flex-1 text-sm"
                                            value={value ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value === "" ? null : e.target.value;
                                                handleChange(key, v);
                                            }}
                                            disabled={submitting}
                                        >
                                            <option value="">（未選択）</option>
                                            {opts.map((o) => (
                                                <option key={String(o.value)} value={o.value ?? ""}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Button variant="outline" size="sm" onClick={() => fetchLookupOptions(table, key)} disabled={submitting}>
                                            更新
                                        </Button>
                                    </div>
                                    {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
                                </label>
                            );
                        }

                        if (dt.includes("boolean")) {
                            return (
                                <label key={key} className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={!!value} onChange={(e) => handleChange(key, e.target.checked)} disabled={submitting} />
                                    <span>{key}</span>
                                </label>
                            );
                        }

                        if (dt.includes("timestamp") || dt.includes("date") || dt.includes("time")) {
                            return (
                                <label className="flex flex-col gap-1 text-xs" key={key}>
                                    <span className="font-medium text-sm">{key}</span>
                                    <input type="datetime-local" className="border rounded px-2 py-1 text-sm" value={toLocalDatetimeInput(value)} onChange={(e) => handleChange(key, e.target.value)} disabled={submitting} />
                                    {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
                                </label>
                            );
                        }

                        if (dt.includes("json")) {
                            return (
                                <label className="flex flex-col gap-1 text-xs" key={key}>
                                    <span className="font-medium text-sm">{key}</span>
                                    <textarea className="w-full min-h-[80px] border rounded px-2 py-1 font-mono text-xs" value={typeof value === "object" ? JSON.stringify(value, null, 2) : value ?? ""} onChange={(e) => handleChange(key, e.target.value)} disabled={submitting} />
                                    {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
                                </label>
                            );
                        }

                        if (dt.includes("int") || dt.includes("numeric") || dt.includes("decimal") || dt.includes("bigint")) {
                            return (
                                <label className="flex flex-col gap-1 text-xs" key={key}>
                                    <span className="font-medium text-sm">{key}</span>
                                    <input type="number" className="border rounded px-2 py-1 text-sm" value={value ?? ""} onChange={(e) => handleChange(key, e.target.value)} disabled={submitting} />
                                    {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
                                </label>
                            );
                        }

                        // default: text
                        return (
                            <label className="flex flex-col gap-1 text-xs" key={key}>
                                <span className="font-medium text-sm">{key}</span>
                                <input type="text" className="border rounded px-2 py-1 text-sm" value={value ?? ""} onChange={(e) => handleChange(key, e.target.value)} disabled={submitting} />
                                {fieldErrors[key] && <p className="text-xs text-red-600">{fieldErrors[key]}</p>}
                            </label>
                        );
                    })}
                </div>

                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

                <DialogFooter className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
                        キャンセル
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "送信中…" : "保存"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}