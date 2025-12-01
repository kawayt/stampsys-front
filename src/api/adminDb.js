// src/api/adminDb.js
import { API_BASE_URL } from "./auth";

/**
 * public スキーマ内のテーブル一覧を取得する。
 * GET /api/admin/db/tables
 */
export async function fetchDbTables() {
    const res = await fetch(`${API_BASE_URL}/api/admin/db/tables`, {
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json();
}

/**
 * 指定テーブルのカラム定義を取得する。
 * GET /api/admin/db/tables/{tableName}/columns
 */
export async function fetchDbTableColumns(tableName) {
    const res = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${encodeURIComponent(
            tableName
        )}/columns`,
        {
            credentials: "include",
        }
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json();
}

/**
 * 指定テーブルの行一覧を取得する。
 * GET /api/admin/db/tables/{tableName}/rows?limit=&offset=
 */
export async function fetchDbTableRows(
    tableName,
    { limit = 50, offset = 0 } = {}
) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const res = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${encodeURIComponent(
            tableName
        )}/rows?${params.toString()}`,
        {
            credentials: "include",
        }
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json();
}

/**
 * 行の新規追加
 * POST /api/admin/db/tables/{tableName}/rows
 */
export async function createDbRow(tableName, payload) {
    const res = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${encodeURIComponent(tableName)}/rows`,
        {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json().catch(() => null);
}

/**
 * 行の更新（単一主キー前提）
 * PUT /api/admin/db/tables/{tableName}/rows/{id}
 */
export async function updateDbRow(tableName, id, payload) {
    const res = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${encodeURIComponent(
            tableName
        )}/rows/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json().catch(() => null);
}

/**
 * 行の削除（単一主キー前提）
 * DELETE /api/admin/db/tables/{tableName}/rows/{id}
 */
export async function deleteDbRow(tableName, id) {
    const res = await fetch(
        `${API_BASE_URL}/api/admin/db/tables/${encodeURIComponent(
            tableName
        )}/rows/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
            credentials: "include",
        }
    );
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }
    return res.json().catch(() => null);
}