import React, { useEffect, useState } from "react";
import UserList from "./components/UserList";
import LoginPage from "./components/LoginPage";
import { DbAdminPage } from "@/components/DbAdminPage";
import { ClassList } from "./components/ClassList";
import StampList from "./components/StampList";
import { RoomList } from "@/components/RoomList";
import { RoomDetail } from "@/components/RoomDetail";
import RoomHistory from "./components/RoomHistory";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { fetchAppData, loginWithMicrosoft, logout } from "./api/auth.js";
import { Spinner } from "@/components/ui/spinner";
import SetupPage from "./components/SetupPage";
import LoginDisabled from "./components/LoginDisabled";
import { Header } from "@/components/Header";

function App() {
    // localStorage からキャッシュを読み込む
    const [appData, setAppData] = useState(() => {
        try {
            const stored = localStorage.getItem("stampsys_auth_data");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // キャッシュがあれば初期ロードは完了していると見なす
    const [loading, setLoading] = useState(!appData);
    const [error, setError] = useState(null);

    useEffect(() => {
        // マウント時にログイン状態をチェック (最新データの取得)
        (async () => {
            try {
                const data = await fetchAppData();
                if (data) {
                    setAppData(data);
                    localStorage.setItem("stampsys_auth_data", JSON.stringify(data));
                } else {
                    // 未ログインまたはセッション切れ
                    setAppData(null);
                    localStorage.removeItem("stampsys_auth_data");
                }
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
            <div className="mt-20 flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
                <Spinner className="size-8" />
                <span>読み込み中</span>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* /setup はログイン不要でアクセス可能 */}
                <Route path="/setup" element={<SetupPage />} />

                {/* ログイン拒否ページ */}
                <Route path="/login-disabled" element={<LoginDisabled />} />

                {/* ログインページ: /login */}
                <Route
                    path="/login"
                    element={<LoginPage onLogin={handleLogin} error={error} />}
                />

                {/* データベース管理ページ（管理者のみ） */}
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
    return (
        <div className="min-h-screen bg-slate-50">
            <Header appData={appData} onLogout={onLogout} />

            <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
                {/* ルーティング */}
                <section className="mt-2">
                    <Routes>
                        {/* ルート: クラス一覧 */}
                        <Route
                            path="/classes"
                            element={<ClassList role={appData.user?.role} />}
                        />

                        {/* ユーザー一覧ページ */}
                        <Route path="/users" element={<UserList />} />

                        {/* スタンプ一覧ページ */}
                        <Route path="/stamps" element={<StampList userId={appData.user?.userId} role={appData.user?.role} />} />

                        {/* ルーム一覧ページ */}
                        <Route path="/classes/:classId" element={<RoomList userId={appData.user?.userId} role={appData.user?.role} />} />

                        {/* ルーム詳細ページ */}
                        <Route path="/rooms/:roomId" element={<RoomDetail userId={appData.user?.userId} role={appData.user?.role} />} />

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

export default App;