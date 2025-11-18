// 役割ラベルの共通定義
// 表示用ラベルをここで一元管理します。
export const ROLE_LABEL = {
    ADMIN: '管理者',
    TEACHER: '教員',
    STUDENT: '学生'
};

/**
 * role(enum) -> 表示ラベル
 * 例: 'ADMIN' -> '管理者'
 */
export function roleToLabel(role) {
    return ROLE_LABEL[role] || role || '';
}

/**
 * オプション配列を返す（select に使うとき便利）
 * [{ value: 'ADMIN', label: '管理者' }, ...]
 */
export function roleOptions() {
    return Object.keys(ROLE_LABEL).map(key => ({ value: key, label: ROLE_LABEL[key] }));
}