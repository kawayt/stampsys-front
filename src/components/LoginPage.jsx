import React from 'react';
import './LoginPage.css';

/**
 * シンプルなログインページ（役割選択なし）
 * Vite では環境変数は import.meta.env を使います。
 * .env に VITE_API_BASE を設定してください（例: VITE_API_BASE=http://localhost:8080）
 */

const LoginPage = () => {
    // Vite の環境変数（プレフィックス VITE_ を使う）
    const apiBase = import.meta.env.VITE_API_BASE || '';
    const oauthStart = `${apiBase}/oauth2/authorization/microsoft`;

    const onLoginClick = () => {
        window.location.href = oauthStart;
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="brand">
                    <div className="brand-icon">📘</div>
                    <h1>授業スタンプシステム</h1>
                    <p className="subtitle">Microsoft アカウントでログインして参加してください</p>
                </div>

                <button className="microsoft-btn" onClick={onLoginClick}>
                    <span className="btn-icon">🔒</span>
                    Microsoft アカウントでログイン
                </button>

                <p className="note">
                    このシステムは授業中の理解度を共有するためのものです。
                </p>
            </div>
        </div>
    );
};

export default LoginPage;