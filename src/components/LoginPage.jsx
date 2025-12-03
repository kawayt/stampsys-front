import React from "react";
import { Button } from "./ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "./ui/card";

function LoginPage({ onLogin, error }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-4">
            <div className="w-full max-w-md">
                <Card className="border-slate-200/80 shadow-sm bg-white/90 backdrop-blur">
                    <CardHeader className="space-y-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                            <span className="text-lg font-semibold">SS</span>
                        </div>
                        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                            授業スタンプシステム
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-600 leading-relaxed">
                            学校が管理する Microsoft 365 アカウントでログインできます。
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {error ? (
                            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                {error}
                            </div>
                        ) :
                        <Button
                            type="button"
                            onClick={onLogin}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            <span className="font-medium">Microsoft 365 でログイン</span>
                        </Button>
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default LoginPage;