/**
 * formatCellValue(tableName, columnKey, value)
 * - フロントの管理画面でセル表示用に値を整形します。
 * - グローバル挙動：
 *   - boolean (true/false または "true"/"false") -> "有効" / "無効"
 *   - ISO 日時文字列 -> ローカル日時表示 (ja-JP)
 *   - オブジェクト -> JSON 文字列 (整形済)
 *   - null/undefined -> 空文字
 *   - それ以外は toString() 表示
 *
 * 注意：
 * - 所属名など別テーブル参照による表示はここでは扱いません（別途ルックアップ処理を行ってください）。
 * - 表示名のマッピング（列名 → 日本語）は src/config/dbAdminConfig.js の labels を利用してください。
 */
export function formatCellValue(tableName, columnKey, value) {
    // Null / undefined
    if (value === null || value === undefined) return '';

    // Boolean (boolean 型)
    if (typeof value === 'boolean') {
        return value ? '有効' : '無効';
    }

    // Boolean を文字列で受け取る場合（DB が 'true'/'false' や 't'/'f' を返すことがある）
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true' || v === 't' || v === '1') return '有効';
        if (v === 'false' || v === 'f' || v === '0') return '無効';
    }

    // Object / Array -> JSON 表示（見やすく）
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 0);
        } catch (e) {
            return String(value);
        }
    }

    // ISO 形式の日付文字列を簡易判定してローカル表示
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        try {
            const d = new Date(value);
            if (!Number.isNaN(d.getTime())) {
                return d.toLocaleString('ja-JP');
            }
        } catch (e) {
            // fallthrough
        }
    }

    // 数値・その他の文字列はそのまま
    return String(value);
}

export default formatCellValue;