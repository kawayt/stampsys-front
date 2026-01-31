import React, { useMemo } from "react";
import { Button } from "./ui/button";
import logo from "../assets/onestamp1.png";
import { getStampColorByCode, getStampIconByCode } from "../lib/StampDefinition";

function LoginPage({ onLogin, error }) {
    // 浮遊するスタンプをランダムに生成
    const floatingStamps = useMemo(() => {
        const count = 30; // 画面内に表示するスタンプの数
        return Array.from({ length: count }).map((_, i) => {
             // 色のキーを1～10でミックス
             const colorCode = (i % 10) + 1;
             // アイコンのキーを1～30でミックス（少しランダム性を加える）
             const iconCode = ((i * 7) % 30) + 1;
             
             return {
                 id: i,
                 color: getStampColorByCode(colorCode),
                 iconObj: getStampIconByCode(iconCode),
                 style: {
                     top: `${Math.random() * 100}%`,
                     left: `${Math.random() * 100}%`,
                     animationDuration: `${15 + Math.random() * 20}s`, // 15s～35s
                     animationDelay: `${Math.random() * -30}s`, // ランダムな時間で開始
                     opacity: 0.2 + Math.random() * 0.3, // 0.2～0.5 (淡くする)
                     transform: `scale(${0.8 + Math.random() * 0.4})`, // 0.8～1.2
                 }
             };
        });
    }, []);

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-50">
           {/* 浮遊するスタンプの背景 */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {floatingStamps.map((stamp) => {
                    const { Icon } = stamp.iconObj;
                    return (
                        <div
                            key={stamp.id}
                            className="absolute animate-float flex items-center justify-center rounded-2xl shadow-sm border border-black/5"
                             style={{
                                ...stamp.style,
                                width: '5rem',
                                height: '5rem',
                                backgroundColor: stamp.color.bg,
                                color: stamp.color.icon,
                            }}
                        >
                            <Icon className="h-10 w-10" />
                        </div>
                    );
                })}
            </div>

            {/* オーバーレイグラデーション */}
            <div className="absolute inset-0 z-10 bg-white/30 backdrop-blur-[1px] pointer-events-none" />

            {/* メインコンテンツ */}
            <div className="relative z-20 flex min-h-screen items-center justify-center px-4 pointer-events-none">
                <div className="w-full max-w-sm space-y-6 md:space-y-10 text-center pointer-events-auto">
                    {/* ロゴ */}
                    <div className="space-y-2 md:space-y-4">
                        <img src={logo} alt="OneStamp" className="w-70 md:w-auto mx-auto drop-shadow-md" />
                    </div>

                    {/* ボタン */}
                    <div className="space-y-4">
                        {error ? (
                             <div className="rounded-md border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-lg backdrop-blur-sm">
                                {error}
                            </div>
                        ) : (
                            <Button
                                type="button"
                                onClick={onLogin}
                                className="h-12 md:h-14 w-full gap-2 md:gap-3 text-base md:text-lg bg-white/80 text-slate-900 hover:bg-white border border-slate-200/60 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:shadow-2xl rounded-xl md:rounded-2xl"
                            >
                                <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 23 23" fill="currentColor">
                                    <path fill="#f25022" d="M1 1h10v10H1z" />
                                    <path fill="#00a4ef" d="M1 12h10v10H1z" />
                                    <path fill="#7fba00" d="M12 1h10v10H12z" />
                                    <path fill="#ffb900" d="M12 12h10v10H12z" />
                                </svg>
                                Microsoft 365 でログイン
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
