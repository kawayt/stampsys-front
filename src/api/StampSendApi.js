const API_BASE_URL = 'http://localhost:8080';

/**
 * スタンプを送信する
 * @param {number} userId - ユーザーID
 * @param {number} stampId - スタンプID
 * @param {number} roomId - ルームID
 * @returns {Promise<{success: boolean}>}
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('スタンプ送信エラー:', error);
        throw error;
    }
}