import React, { useEffect, useState } from "react";
import UserList from './components/UserList'
import LoginPage from './components/LoginPage';
import { DbAdminPage } from "@/components/DbAdminPage";
import { ClassList } from './components/ClassList';
import StampList from './components/StampList';
import { RoomList } from "@/components/RoomList";
import { RoomDetail } from "@/components/RoomDetail";
import RoomHistory from "./components/RoomHistory";
import { Toaster } from "@/components/ui/sonner";
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom'
import {
    fetchAppData,
    loginWithMicrosoft,
    logout,
} from './api/auth.js';
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SetupPage from './components/SetupPage'; // 追加: /setup 用ページ（トップレベルで公開）
import LoginDisabled from './components/LoginDisabled'; // 追加: ログイン拒否ページ

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
            <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
                <Spinner className="h-5 w-5" />
                <span>読み込み中...</span>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* 公開: /setup はログイン不要でアクセス可能（トップレベル） */}
                <Route path="/setup" element={<SetupPage />} />
                {/* 追加: ログイン拒否ページ */}
                <Route path="/login-disabled" element={<LoginDisabled />} />

                {/* ログインページ: /login */}
                <Route
                    path="/login"
                    element={<LoginPage onLogin={handleLogin} error={error} />}
                />

                {/* ★ ADMIN専用 DB 管理ページ */}
                <Route
                    path="/admin/db"
                    element={
                        appData ? (
                            <DbAdminPage currentUserRole={appData.user?.role} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                {/* それ以外はダッシュボード（認証が必要）またはログインへ */}
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

    const location = useLocation();
    const navigate = useNavigate();

    // 現在のパスからタブの value を決定
    const currentTab =
        location.pathname.startsWith("/users")
            ? "users"
            : location.pathname.startsWith("/stamps")
                ? "stamps"
                : "classes";

    const handleTabChange = (value) => {
        if (value === "classes") navigate("/classes");
        if (value === "users") navigate("/users");
        if (value === "stamps") navigate("/stamps");
    };

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

                    {/* ここでログアウトの隣に DB 管理へのボタンを表示（ADMIN のみ） */}
                    <div className="flex items-center gap-2">
                        {String(appData.user?.role).toUpperCase() === "ADMIN" && (
                            <Link to="/admin/db">
                                <Button variant="outline" size="sm" className="text-xs">
                                    DB 管理
                                </Button>
                            </Link>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onLogout}
                            className="text-xs"
                        >
                            ログアウト
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
                {/* ナビゲーション */}
                <Tabs
                    value={currentTab}
                    onValueChange={handleTabChange}
                    className="w-full"
                >
                    <TabsList className="inline-flex h-9 items-center justify-start gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                        <TabsTrigger value="classes" className="px-3 py-1.5">
                            クラス
                        </TabsTrigger>
                        <TabsTrigger value="users" className="px-3 py-1.5">
                            ユーザー
                        </TabsTrigger>
                        <TabsTrigger value="stamps" className="px-3 py-1.5">
                            スタンプ
                        </TabsTrigger>
                        {/* /setup のリンクはここに表示しません */}
                    </TabsList>
                </Tabs>

                {/* ルーティング */}
                <section className="mt-2">
                    <Routes>
                        {/* ルート: クラス一覧 */}
                        <Route path="/classes" element={<ClassList role={appData.user?.role} />} />

                        {/* ユーザー一覧ページ */}
                        <Route path="/users" element={<UserList />} />

                        {/* スタンプ一覧ページ */}
                        <Route path="/stamps" element={<StampList />} />

                        {/* ルーム一覧ページ */}
                        <Route path="/classes/:classId" element={<RoomList />} />

                        {/* ルーム詳細ページ */}
                        <Route path="/rooms/:roomId" element={<RoomDetail userId={appData.user?.userId} role={appData.user?.role} />}/>

                        {/* スタンプ履歴ページ */}
                        <Route path="/rooms/:roomId/history" element={<RoomHistory />} />

                        {/* デフォルトはクラス一覧 */}
                        <Route path="*" element={<Navigate to="/classes" replace />} />
                    </Routes>
                </section>
            </main>
            <Toaster richColors position="top-center" closeButton />
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