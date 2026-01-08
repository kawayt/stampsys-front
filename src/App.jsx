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
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation,
    useNavigate,
} from "react-router-dom";
import {
    fetchAppData,
    loginWithMicrosoft,
    logout,
} from "./api/auth.js";
import { Spinner } from "@/components/ui/spinner";
import SetupPage from "./components/SetupPage";
import LoginDisabled from "./components/LoginDisabled";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    BookOpen,
    Users,
    Stamp,
    Shield,
    GraduationCap,
    User,
    LogOut,
    Database,
} from "lucide-react";

import logo from "./assets/onestamp1.png";

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
            <div className="mt-20 flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
                <Spinner className="size-8" />
                <span>読み込み中</span>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* 公開: /setup はログイン不要でアクセス可能（トップレベル） */}
                <Route path="/setup" element={<SetupPage />} />
                {/* ログイン拒否ページ */}
                <Route path="/login-disabled" element={<LoginDisabled />} />

                {/* ログインページ: /login */}
                <Route
                    path="/login"
                    element={<LoginPage onLogin={handleLogin} error={error} />}
                />

                {/* ADMIN専用 DB 管理ページ */}
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

    const roleRaw = appData.user?.role || "USER";
    const role = String(roleRaw).toUpperCase();

    const location = useLocation();
    const navigate = useNavigate();

    // 現在のパスからアクティブなナビを決定
    const currentTab = location.pathname.startsWith("/users")
        ? "users"
        : location.pathname.startsWith("/stamps")
            ? "stamps"
            : "classes";

    const handleTabChange = (value) => {
        if (value === "classes") navigate("/classes");
        if (value === "users") navigate("/users");
        if (value === "stamps") navigate("/stamps");
    };

    const isAdmin = role === "ADMIN";
    const isStudent = role === "STUDENT";

    // 権限ごとのアバター見た目
    const { avatarBgClass, AvatarIcon, avatarIconClass } =
        getAvatarConfigByRole(role);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                    {/* 左側: ワークスペース名エリア */}
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="OneStamp" className="h-7.5 w-auto" />
                    </div>

                    {/* 右側: ユーザードロップダウン */}
                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm transition hover:border-slate-300"
                                >
                                    <Avatar className={`size-8 ${avatarBgClass}`}>
                                        <AvatarFallback className="border-none bg-transparent p-0">
                                            <AvatarIcon className={`size-4 ${avatarIconClass}`} />
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-40 rounded-lg border border-slate-200 bg-white shadow-lg"
                            >
                                <DropdownMenuLabel className="flex flex-col gap-0.5">
                                    <span className="font-medium text-slate-900">
                                        {displayName}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        {roleRaw}
                                    </span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isAdmin && (
                                    <DropdownMenuItem
                                        onClick={() => navigate("/admin/db")}
                                    >
                                        <Database />
                                        データベース管理
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={onLogout}
                                >
                                    <LogOut />
                                    ログアウト
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ナビゲーション */}
                {!isStudent && (
                    <div>
                        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
                            <nav className="flex items-center gap-6 text-sm">
                                <NavButton
                                    active={currentTab === "classes"}
                                    onClick={() => handleTabChange("classes")}
                                    icon={BookOpen}
                                    label="クラス"
                                />
                                <NavButton
                                    active={currentTab === "users"}
                                    onClick={() => handleTabChange("users")}
                                    icon={Users}
                                    label="ユーザー"
                                />
                                <NavButton
                                    active={currentTab === "stamps"}
                                    onClick={() => handleTabChange("stamps")}
                                    icon={Stamp}
                                    label="スタンプ"
                                />
                            </nav>
                        </div>
                    </div>
                )}
            </header>

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

/**
 * 権限ごとのアバター用設定
 */
function getAvatarConfigByRole(role) {
    const upper = String(role || "").toUpperCase();

    if (upper === "ADMIN") {
        return {
            avatarBgClass: "bg-rose-100",
            AvatarIcon: Shield,
            avatarIconClass: "text-rose-600",
        };
    }

    if (upper === "TEACHER") {
        return {
            avatarBgClass: "bg-blue-100",
            AvatarIcon: GraduationCap,
            avatarIconClass: "text-blue-600",
        };
    }

    if (upper === "STUDENT") {
        return {
            avatarBgClass: "bg-emerald-100",
            AvatarIcon: User,
            avatarIconClass: "text-emerald-600",
        };
    }
}

/**
 * ヘッダー中央のナビゲーション用ボタン
 */
function NavButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "relative flex items-center gap-1 border-b-2 py-3 font-medium transition-colors",
                active
                    ? "border-blue-500 text-slate-900"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300",
            ].join(" ")}
        >
            <Icon className="size-4" />
            <span>{label}</span>
        </button>
    );
}

export default App;