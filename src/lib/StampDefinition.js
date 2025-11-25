// スタンプカラーを定義
const COLOR_MAP = {
    1: { bg: "#ff8c8c", label: "Red" },
    2: { bg: "#ffba74", label: "Orange" },
    3: { bg: "#ffe25f", label: "Yellow" },
    4: { bg: "#bef264", label: "Yellow Green" },
    5: { bg: "#77ffa7", label: "Green" },
    6: { bg: "#81d5ff", label: "Sky Blue" },
    7: { bg: "#6c80ff", label: "Blue" },
    8: { bg: "#c28fff", label: "Purple" },
    9: { bg: "#ff8ccf", label: "Pink" },
    10:{ bg: "#916464", label: "Brown" },
};

const DEFAULT_COLOR = { bg: "#e5e7eb", label: "Default" };

// スタンプアイコンを定義
const ICON_MAP = {
    1: "👍",
    2: "❤️",
    3: "😊",
    4: "🎉",
    5: "👏",
    6: "🤔",
    7: "😮",
    8: "😢",
    9: "👎",
    10: "✨",
    11: "🙌",
    12: "✅",
    13: "❌",
    14: "📣",
    15: "📝",
    16: "⏰",
    17: "❓",
    18: "💡",
    19: "📌",
    20: "⭐",
};

const DEFAULT_ICON = "🙂";

/**
 * 数値コードからカラー情報を取得
 * @param {number} code 1〜10 の数値（DBの stampColor）
 * @returns {{bg: string, label: string}}
 */
export function getStampColorByCode(code) {
    return COLOR_MAP[code] || DEFAULT_COLOR;
}

/**
 * 数値コードからアイコン（絵文字）を取得
 * @param {number} code 1〜20 の数値（DBの stampIcon）
 * @returns {string}
 */
export function getStampIconByCode(code) {
    return ICON_MAP[code] || DEFAULT_ICON;
}