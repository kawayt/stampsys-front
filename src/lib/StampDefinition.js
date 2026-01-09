import {
    ThumbsUp,
    Heart,
    Smile,
    Bell,
    Eye,
    Brain,
    AlertCircle,
    Frown,
    ThumbsDown,
    Sparkles,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Megaphone,
    StickyNote,
    AlarmClock,
    HelpCircle,
    Lightbulb,
    Pin,
    Star,
} from "lucide-react";

// スタンプカラーを定義
const COLOR_MAP = {
    1: { icon: "#ef4444", bg: "#fee2e2", label: "Red" },
    2: { icon: "#f97316", bg: "#ffedd5", label: "Orange" },
    3: { icon: "#eab308", bg: "#fef9c3", label: "Yellow" },
    4: { icon: "#8cd117", bg: "#e8fdbc", label: "Yellow Green" },
    5: { icon: "#16a34a", bg: "#ceffdf", label: "Green" },
    6: { icon: "#5ac2ef", bg: "#e4f7ff", label: "Sky Blue" },
    7: { icon: "#397cdd", bg: "#d3e4ff", label: "Blue" },
    8: { icon: "#9655f7", bg: "#e7dbff", label: "Purple" },
    9: { icon: "#e137c8", bg: "#ffdefc", label: "Pink" },
    10: { icon: "#8d6e63", bg: "#efebe9", label: "Brown" },
};

const DEFAULT_COLOR = { icon: "#6b7280", bg: "#e5e7eb", label: "Default" };

// スタンプアイコンを定義
const ICON_MAP = {
    1: { Icon: ThumbsUp, label: "いいね" },
    2: { Icon: Heart, label: "ハート" },
    3: { Icon: Smile, label: "笑顔" },
    4: { Icon: Bell, label: "ベル" },
    5: { Icon: Eye, label: "確認" },
    6: { Icon: Brain, label: "考え中" },
    7: { Icon: AlertCircle, label: "びっくり" },
    8: { Icon: Frown, label: "しょんぼり" },
    9: { Icon: ThumbsDown, label: "よくない" },
    10: { Icon: Sparkles, label: "きらきら" },
    11: { Icon: RotateCcw, label: "リピート" },
    12: { Icon: CheckCircle2, label: "OK" },
    13: { Icon: XCircle, label: "NG" },
    14: { Icon: Megaphone, label: "アナウンス" },
    15: { Icon: StickyNote, label: "メモ" },
    16: { Icon: AlarmClock, label: "時間" },
    17: { Icon: HelpCircle, label: "質問" },
    18: { Icon: Lightbulb, label: "ひらめき" },
    19: { Icon: Pin, label: "ピン留め" },
    20: { Icon: Star, label: "スター" },
};

const DEFAULT_ICON = { Icon: Smile, label: "Default" };

/**
 * 数値コードからカラー情報を取得
 * @param {number} code 1〜10 の数値（DBの stampColor）
 * @returns {{bg: string, icon: string, label: string}}
 */
export function getStampColorByCode(code) {
    return COLOR_MAP[code] || DEFAULT_COLOR;
}

/**
 * 数値コードからアイコン（Lucide コンポーネント）を取得
 * @param {number} code 1〜20 の数値（DBの stampIcon）
 * @returns {{Icon: import("react").FC<any>, label: string}}
 */
export function getStampIconByCode(code) {
    return ICON_MAP[code] || DEFAULT_ICON;
}