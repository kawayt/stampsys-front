import React, { useState } from 'react';
import { sendStamp } from '../api/StampSendApi.js';

function StampPanel({ userId, roomId }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // スタンプのリスト
    const stamps = [
        { id: 1, emoji: '👍', name: 'いいね' },
        { id: 2, emoji: '❤️', name: 'ハート' },
        { id: 3, emoji: '😊', name: '笑顔' },
        { id: 4, emoji: '🎉', name: 'お祝い' },
    ];

    const handleStampClick = async (stampId) => {
        setLoading(true);
        setMessage('');

        try {
            const result = await sendStamp(userId, stampId, roomId);

            if (result.success) {
                setMessage('✓ スタンプを送信しました！');
                // 3秒後にメッセージを消す
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('× 送信に失敗しました');
            }
        } catch (err) {
            setMessage('× エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stamp-panel">
            <h3>スタンプを選択</h3>
            <div className="stamp-grid">
                {stamps.map((stamp) => (
                    <button
                        key={stamp.id}
                        className="stamp-button"
                        onClick={() => handleStampClick(stamp.id)}
                        disabled={loading}
                        title={stamp.name}
                    >
                        <span className="stamp-emoji">{stamp.emoji}</span>
                    </button>
                ))}
            </div>
            {message && (
                <p className={message.startsWith('✓') ? 'success' : 'error'}>
                    {message}
                </p>
            )}
        </div>
    );
}

export default StampPanel;