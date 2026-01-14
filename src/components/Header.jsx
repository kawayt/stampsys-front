import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

import logo from "@/assets/onestamp1.png";

export function Header({ appData, onLogout }) {
    const user = appData?.user;
    const attributes = appData?.attributes;

    const displayName =
        user?.userName ||
        attributes?.name ||
        attributes?.displayName ||
        "名無し";

    const roleRaw = user?.role || "USER";
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
        getAvatarConfigByRole(role) || {
            avatarBgClass: "bg-slate-100",
            AvatarIcon: User,
            avatarIconClass: "text-slate-600",
        };

    return (
        <header className="border-b bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
                {/* ロゴ */}
                <Link to="/classes" className="flex items-center gap-2">
                    <img src={logo} alt="OneStamp" className="h-7.5 w-auto" />
                </Link>

                {/* ユーザードロップダウン */}
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
                    ? "border-sky-500 text-slate-900"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300",
            ].join(" ")}
        >
            <Icon className="size-4" />
            <span>{label}</span>
        </button>
    );
}
