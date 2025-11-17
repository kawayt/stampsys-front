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
import { Button } from "@/components/ui/button";

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
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
                読み込み中...
            </div>
        );
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
 * ログイン後ダッシュボード部分
 */
function Dashboard({ appData, onLogout }) {
    const displayName =
        appData.user?.userName ||
        appData.attributes?.name ||
        appData.attributes?.displayName ||
        "名無し";

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">
                            {displayName}
                        </p>
                        <p className="text-xs text-slate-500">{appData.user?.role}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onLogout}
                        className="text-xs"
                    >
                        ログアウト
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
                {/* ナビゲーション（シンプルなタブ風） */}
                <nav className="flex items-center gap-2 text-sm">
                    <NavItem to="/">クラス一覧</NavItem>
                    <NavItem to="/stamp-send">スタンプ送信</NavItem>
                    <NavItem to="/users">ユーザー一覧</NavItem>
                </nav>

                {/* メインカードは削除し、直接ルーティング内容を表示 */}
                <section className="mt-2">
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
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </section>
            </main>
        </div>
    );
}

// シンプルなナビアイテム（shadcn + Tailwind）
function NavItem({ to, children }) {
    return (
        <Link
            to={to}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
            {children}
        </Link>
    );
}

export default App