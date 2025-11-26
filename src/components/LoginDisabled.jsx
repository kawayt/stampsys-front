import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export default function LoginDisabled() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
            <div className="w-full max-w-lg rounded-xl border border-orange-100 bg-white/90 shadow-lg backdrop-blur-sm">
                <div className="px-8 pt-8 pb-6 border-b border-orange-50">
                    <h1 className="text-2xl font-bold tracking-tight text-orange-600">
                        ログインできません
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        お使いのアカウントは管理者により無効化されています。現在はログインできません。
                    </p>
                </div>

                <div className="px-8 py-8 space-y-6">
                    <div className="text-sm text-slate-700">
                        <p className="mb-2">
                            このアカウントは一時的に無効化されています。復旧を希望される場合は、管理者に連絡してください（管理者の連絡先がご不明の場合は、担当責任者にお問い合わせください。）。
                        </p>
                        <p className="text-xs text-slate-500">
                            セキュリティのため、無効化の理由はここには表示しません。
                        </p>
                    </div>

                    <div>
                        <Link to="/login">
                            <Button
                                type="button"
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white border border-orange-500"
                            >
                                ログイン画面へ戻る
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}