import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * OAuthCallback:
 * - バックエンドが defaultSuccessUrl=http://localhost:5173/oauth2/redirect にリダイレクトしてくる想定
 * - ここで /api/me を fetch({ credentials: 'include' }) してセッションが有効かを判定する
 */
function OAuthCallback() {
    const navigate = useNavigate();
    const apiBase = import.meta.env.VITE_API_BASE || '';

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${apiBase}/api/me`, { credentials: 'include' });
                if (res.ok) {
                    // 認証済み -> トップへ
                    navigate('/', { replace: true });
                } else {
                    // 認証失敗 -> ログインへ
                    navigate('/login', { replace: true });
                }
            } catch (e) {
                // ネットワーク等のエラー -> ログインへ
                navigate('/login', { replace: true });
            }
        })();
    }, [apiBase, navigate]);

    return <div>ログイン処理中...</div>;
}

export default OAuthCallback;