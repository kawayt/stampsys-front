import React from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "./ui/card";

export default function LoginDisabled() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-4">
            <div className="w-full max-w-md">
                <Card className="border-slate-200/80 shadow-sm bg-white/90 backdrop-blur">
                    <CardHeader className="space-y-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <span className="text-lg font-semibold">!</span>
                        </div>
                        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                            ログインできません
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-600 leading-relaxed">
                            このアカウントは管理者によって無効化されています。
                        </CardDescription>
                    </CardHeader>

                    <CardFooter className="flex flex-col gap-3">
                        <Link to="/login" className="w-full">
                            <Button
                                type="button"
                                className="w-full flex items-center justify-center gap-2"
                            >
                                ログイン画面へ戻る
                            </Button>
                        </Link>
                        <p className="text-[11px] text-slate-500 text-left leading-relaxed">
                            誤ってこの画面が表示されていると思われる場合は、
                            学校の担当者またはシステム管理者にお問い合わせください。
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}