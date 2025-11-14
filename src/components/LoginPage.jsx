// src/components/LoginPage.jsx
import React from "react";

function LoginPage({ onLogin, error }) {
    return (
        <div style={styles.container}>
            <h1>StampSys</h1>
            <p>Microsoft アカウントでログインしてダッシュボードにアクセスしてください。</p>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button style={styles.loginButton} onClick={onLogin}>
                Microsoft 365 でログイン
            </button>
        </div>
    );
}

const styles = {
    container: {
        maxWidth: "960px",
        margin: "0 auto",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
    },
    loginButton: {
        padding: "10px 20px",
        fontSize: "16px",
        cursor: "pointer",
    },
};

export default LoginPage;