import './App.css'
import React, { useEffect, useState } from "react";
import StampForm from './components/StampForm'
import UserList from './components/UserList'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'


const API_BASE_URL = "http://localhost:8080";

// Spring Security の OAuth2 クライアント設定で registrationId を "azure" としている想定
// application.yml 例: spring.security.oauth2.client.registration.azure ...
const LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/microsoft`;

const APP_API_URL = `${API_BASE_URL}/api/app`;

function App() {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState(null); // { attributes, users, user } を想定
    const [error, setError] = useState(null);

    useEffect(() => {
        // マウント時にログイン状態をチェック
        fetch(APP_API_URL, {
            credentials: "include", // セッション/Cookie を使うなら必須
        })
            .then(async (res) => {
                if (res.status === 401) {
                    // 未ログイン
                    setAppData(null);
                } else if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `HTTP error ${res.status}`);
                } else {
                    const data = await res.json();
                    setAppData(data);
                }
            })
            .catch((e) => {
                console.error(e);
                setError("データ取得中にエラーが発生しました");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleLogin = () => {
        // Microsoft 365 (Azure AD) ログインページへリダイレクト
        window.location.href = LOGIN_URL;
    };

    const handleLogout = () => {
        // シンプルな例: サーバ側に /logout がある前提
        fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            credentials: "include",
        })
            .then(() => {
                setAppData(null);
            })
            .catch((e) => {
                console.error(e);
                alert("ログアウトに失敗しました");
            });
    };

    if (loading) {
        return <div>読み込み中...</div>;
    }

    // 未ログイン時: ログインボタンだけ出すページ
    if (!appData) {
        return (
            <div style={styles.container}>
                <h1>StampSys</h1>
                <p>Microsoft アカウントでログインしてダッシュボードにアクセスしてください。</p>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button style={styles.loginButton} onClick={handleLogin}>
                    Microsoft 365 でログイン
                </button>
            </div>
        );
    }

    // ログイン後ページ（ここにルーティングを追加）
    return (
        <BrowserRouter>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div>
                        <h1>ダッシュボード</h1>
                        <p>
                            ログイン中:{" "}
                            {appData.user?.userName ||
                                appData.attributes?.name ||
                                appData.attributes?.displayName ||
                                "名無し"}
                        </p>
                    </div>
                    <button style={styles.logoutButton} onClick={handleLogout}>
                        ログアウト
                    </button>
                </header>

                {/* ナビゲーション */}
                <nav style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
                    <Link to="/stamp-send">スタンプ送信</Link>
                    <Link to="/users">ユーザー一覧</Link>
                </nav>

                <main style={styles.main}>
                    <section style={styles.section}>
                        <h2>ログインユーザー情報</h2>
                        <pre style={styles.pre}>
                            {JSON.stringify(appData.user || appData.attributes, null, 2)}
                        </pre>
                    </section>

                    <div className="App">
                        {/* ルーティングでページを切り替え */}
                        <Routes>
                            {/* スタンプ送信用のページ */}
                            <Route
                                path="/stamp-send"
                                element={<StampForm userId={1} roomId={1} />}
                            />

                            {/* ユーザー一覧ページ */}
                            <Route
                                path="/users"
                                element={<UserList />}
                            />
                        </Routes>
                    </div>
                </main>
            </div>
        </BrowserRouter>
    );
}

const styles = {
    container: {
        maxWidth: "960px",
        margin: "0 auto",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
    },
    main: {
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
    },
    section: {
        borderRadius: "8px",
        padding: "16px",
    },
    loginButton: {
        padding: "10px 20px",
        fontSize: "16px",
        cursor: "pointer",
    },
    logoutButton: {
        padding: "8px 16px",
        fontSize: "14px",
        cursor: "pointer",
    },
    pre: {
        backgroundColor: "#f5f5f5",
        padding: "8px",
        borderRadius: "4px",
        fontSize: "12px",
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
    },
};

export default App