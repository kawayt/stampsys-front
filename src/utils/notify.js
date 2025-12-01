import { toast } from "sonner";

/**
 * 成功トースト（公式ドキュメント準拠）
 * @param {string} message - メインメッセージ（タイトル相当）
 * @param {string} [description] - サブの説明文
 */
export const notifySuccess = (message, description) => {
    toast.success(message, description ? { description } : undefined);
};

/**
 * エラートースト（公式ドキュメント準拠）
 * @param {string} message - メインメッセージ（タイトル相当）
 * @param {string} [description] - サブの説明文
 */
export const notifyError = (message, description) => {
    toast.error(message, description ? { description } : undefined);
};