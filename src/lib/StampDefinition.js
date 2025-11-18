// スタンプカラーを定義
const COLOR_MAP = {
    1: { bg: "#fee2e2", label: "Red" },
    2: { bg: "#ffedd5", label: "Orange" },
    3: { bg: "#fef3c7", label: "Amber" },
    4: { bg: "#ecfccb", label: "Lime" },
    5: { bg: "#dcfce7", label: "Green" },
    6: { bg: "#e0f2fe", label: "Sky" },
    7: { bg: "#dbeafe", label: "Blue" },
    8: { bg: "#e0e7ff", label: "Indigo" },
    9: { bg: "#f5e9ff", label: "Purple" },
    10: { bg: "#ffe4f3", label: "Pink" },
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