const API_BASE_URL = 'http://localhost:8080';

/**
 * スタンプを送信する
 * @param {number} userId - ユーザーID
 * @param {number} stampId - スタンプID
 * @param {number} roomId - ルームID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function sendStamp(userId, stampId, roomId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stamp-send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                stampId,
                roomId,
            }),
        });

        // body を先に読み取る（成功/失敗どちらでも本文を使いたいため）
        const text = await response.text();

        if (!response.ok) {
            // エラー時は本文に { message: "..." } が入っている想定
            let errMsg = `HTTP error! status: ${response.status}`;
            try {
                const parsed = text ? JSON.parse(text) : null;
                if (parsed && (parsed.message || parsed.error)) {
                    errMsg = parsed.message || parsed.error;
                } else if (text) {
                    errMsg = text;
                }
            } catch {
                if (text) errMsg = text;
            }
            throw new Error(errMsg);
        }

        // 正常レスポンス時は JSON を返す想定
        try {
            return JSON.parse(text);
        } catch {
            // JSON でない場合は success=true を返す
            return { success: true };
        }
    } catch (error) {
        console.error('スタンプ送信エラー:', error);
        throw error;
    }
}