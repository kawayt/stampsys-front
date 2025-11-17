// src/components/LoginPage.jsx
import React from "react";
import { Button } from "./ui/button";

function LoginPage({ onLogin, error }) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            {/* カードコンテナ（背景色は親要素依存のまま） */}
            <div className="w-full max-w-md rounded-xl border border-orange-100 bg-white/90 shadow-lg backdrop-blur-sm">
                <div className="px-6 pt-6 pb-4 border-b border-orange-50">
                    <h1 className="text-2xl font-bold tracking-tight text-orange-600">
                        授業スタンプシステム
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Microsoft アカウントでログインして
                        <br className="hidden sm:block" />
                        ダッシュボードにアクセスしてください。
                    </p>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                            {error}
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white border border-orange-500"
                    >
                        <span className="font-medium">
                          Microsoft 365 でログイン
                        </span>
                    </Button>

                </div>
            </div>
        </div>
    );
}

export default LoginPage;