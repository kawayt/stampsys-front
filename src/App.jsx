import './App.css'
import React, { useEffect, useState } from "react";
import StampForm from './components/StampForm'
import UserList from './components/UserList'
import LoginPage from './components/LoginPage';
import { ClassList } from './components/ClassList';
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    Navigate,
} from 'react-router-dom'
import {
    fetchAppData,
    loginWithMicrosoft,
    logout,
} from './api/auth.js';

function App() {
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState(null); // { attributes, users, user } を想定
    const [error, setError] = useState(null);

    useEffect(() => {
        // マウント時にログイン状態をチェック
        (async () => {
            try {
                const data = await fetchAppData();
                setAppData(data); // 未ログイン時は null
            } catch (e) {
                console.error(e);
                setError("データ取得中にエラーが発生しました");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleLogin = () => {
        loginWithMicrosoft();
    };

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return <div>読み込み中...</div>;
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* ログインページ: /login のみで表示 */}
                <Route
                    path="/login"
                    element={<LoginPage onLogin={handleLogin} error={error} />}
                />

                {/* それ以外はダッシュボード or ログインページへリダイレクト */}
                <Route
                    path="/*"
                    element={
                        appData ? (
                            <Dashboard appData={appData} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

/**
 * ログイン後ダッシュボード部分を分離
 */
function Dashboard({ appData, onLogout }) {
    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <p>
                        {appData.user?.userName || appData.attributes?.name || appData.attributes?.displayName || "名無し"}
                    </p>
                    <p>
                        {appData.user?.role}
                    </p>
                </div>
                <button style={styles.logoutButton} onClick={onLogout}>
                    ログアウト
                </button>
            </header>

            {/* ナビゲーション */}
            <nav style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
                <Link to="/">クラス一覧</Link>
                <Link to="/stamp-send">スタンプ送信</Link>
                <Link to="/users">ユーザー一覧</Link>
            </nav>

            <main style={styles.main}>
                <div className="App">
                    {/* ルーティングでページを切り替え */}
                    <Routes>
                        {/* ルート: クラス一覧 */}
                        <Route path="/" element={<ClassList />} />

                        {/* スタンプ送信用のページ */}
                        <Route
                            path="/stamp-send"
                            element={<StampForm userId={1} roomId={1} />}
                        />

                        {/* ユーザー一覧ページ */}
                        <Route path="/users" element={<UserList />} />

                        {/* デフォルトはクラス一覧へ */}
                        <Route
                            path="*"
                            element={<Navigate to="/" replace />}
                        />
                    </Routes>
                </div>
            </main>
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