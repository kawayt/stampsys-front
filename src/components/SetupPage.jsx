import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toaster } from "@/components/ui/sonner"
import { toast } from 'sonner';

export default function SetupPage() {
    const [loading, setLoading] = useState(false);

    // 入力フォーム用
    const [token, setToken] = useState('');
    const [useServerDefaults, setUseServerDefaults] = useState(true);
    const [jdbcUrl, setJdbcUrl] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [dbPassword, setDbPassword] = useState('');

    // サーバーステータス用
    const [status, setStatus] = useState(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

    const fetchWithOpts = (url, options = {}) => {
        const resolvedUrl =
            typeof url === 'string' && url.startsWith('/api') && API_BASE
                ? `${API_BASE}${url}`
                : url;
        const opts = {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...options.headers,
            },
            ...options,
        };
        return fetch(resolvedUrl, opts);
    };

    useEffect(() => {
        // マウント時の現在の設定済みDBステータスを取得
        (async () => {
            try {
                const res = await fetchWithOpts('/api/setup/status');
                const data = await res.json().catch(() => null);
                setStatus(data);
            } catch (e) {
                setStatus({ error: String(e) });
            }
        })();
    }, []);

    const handleInit = async () => {
        setLoading(true);
        try {
            const headers = {};
            if (token && token.trim() !== '') headers['X-Setup-Token'] = token.trim();

            let body = null;
            if (!useServerDefaults) {
                body = {
                    jdbcUrl: jdbcUrl.trim(),
                };
                if (dbUser && dbUser.trim() !== '') body.username = dbUser.trim();
                if (dbPassword && dbPassword.trim() !== '') body.password = dbPassword;
            }
            const res = await fetchWithOpts('/api/setup/init', {
                method: 'POST',
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const serverMsg =
                    data && data.error
                        ? data.error
                        : `初期化に失敗しました: HTTP ${res.status}`;
                toast.error(serverMsg);
            } else {
                const message =
                    data?.message ?? '初期化が完了しました。アプリを再起動してください。';
                toast.success(message);

                // refresh status after init attempt
                try {
                    const sres = await fetchWithOpts('/api/setup/status');
                    const sdata = await sres.json().catch(() => null);
                    setStatus(sdata);
                } catch (e) {
                    // ignore
                }
            }
        } catch (e) {
            toast.error(String(e));
        } finally {
            setLoading(false);
        }
    };

    // ステータスバッジを表示するヘルパー
    const renderStatusBadge = () => {
        if (!status) {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    未確認
                </span>
            );
        }
        else if (status.status != null && status.status === 'no-config') {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    設定なし
                </span>
            );
        }
        else if (status.connectionOk === true) {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
                    接続可能
                </span>
            );
        }
        else {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                    接続不可
                </span>
            );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-4">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle>データベースにテーブルを作成</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-slate-600">
                        アプリの動作に必要なテーブルを作成します。<br />
                        データベースに接続できない場合は、バックエンドをセットアップモードで起動してから実行してください。
                    </p>

                    {/* STATUS DISPLAY */}
                    <div className="mb-4 p-3 rounded border bg-white/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs text-slate-500">
                                    現在の構成（サーバ既定または spring.datasource）
                                </div>
                                <div className="mt-1 text-sm font-medium">
                                    {status?.configuredJdbcUrl ? (
                                        status.configuredJdbcUrl
                                    ) : (
                                        <span className="text-slate-400">未設定</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {status?.parsed != null
                                        ? `${status.parsed.host ?? ''}${
                                            status.parsed.port
                                                ? ':' + status.parsed.port
                                                : ''
                                        }/${status.parsed.database ?? ''}`
                                        : ''}
                                </div>
                            </div>
                            <div>{renderStatusBadge()}</div>
                        </div>
                        {status?.message && (
                            <div className="mt-2 text-xs text-slate-500">
                                ステータス: {status.message}
                            </div>
                        )}
                        {status?.databaseProductName && (
                            <div className="mt-1 text-xs text-slate-500">
                                データベース: {status.databaseProductName}{' '}
                                {status.databaseProductVersion ?? ''}
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="text-xs font-medium">
                            セットアップ・トークン (X-Setup-Token)
                        </label>
                        <Input
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="サーバに app.setup.secret を設定している場合は必須"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            application.properties に app.setup.secret を設定し、
                            このトークンを入力して実行してください。
                            未設定の場合にはトークンは必要ありませんが、セキュリティ上の理由から推奨されません。
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleInit} disabled={loading}>
                            {loading ? '処理中…' : '作成'}
                        </Button>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                        <p>
                            実行後は DataSource 自動設定を有効に戻し、バックエンドを通常モードで再起動してください。
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Toaster richColors position="top-center" closeButton />
        </div>

    );
}