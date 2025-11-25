import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // ← 追加

export default function SetupPage() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);

    // form fields
    const [token, setToken] = useState('');
    const [useServerDefaults, setUseServerDefaults] = useState(true);
    const [jdbcUrl, setJdbcUrl] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [dbPassword, setDbPassword] = useState('');

    // status from server
    const [status, setStatus] = useState(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

    const fetchWithOpts = (url, options = {}) => {
        const resolvedUrl =
            (typeof url === 'string' && url.startsWith('/api') && API_BASE)
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
        // fetch current configured DB status on mount
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

    const validate = () => {
        if (!useServerDefaults && (!jdbcUrl || jdbcUrl.trim() === '')) {
            setErr('JDBC URL を入力するか「サーバーデフォルトを使用」を選択してください');
            return false;
        }
        return true;
    };

    const handleInit = async () => {
        setMsg(null);
        setErr(null);
        if (!validate()) return;

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
                setErr(serverMsg);
            } else {
                setMsg(data?.message ?? '初期化が完了しました。アプリを再起動してください。');
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
            setErr(String(e));
        } finally {
            setLoading(false);
        }
    };

    // small helper to render status badge
    const renderStatusBadge = () => {
        if (!status)
            return (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    未確認
                </span>
            );
        if (status.status != null && status.status === 'no-config') {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    設定なし
                </span>
            );
        }
        if (status.connectionOk === true) {
            return (
                <span className="inline-block px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded">
                    接続可能
                </span>
            );
        }
        return (
            <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                接続不可
            </span>
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle>データベースにテーブルを作成</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-3 text-sm text-slate-600">
                        このページはログインを必要としません（セットアップ専用）。バックエンドがまだ DB
                        に接続できない場合は、
                        「セットアップモード」でバックエンドを起動してから実行してください。
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
                                            status.parsed.port ? ':' + status.parsed.port : ''
                                        }/${status.parsed.database ?? ''}`
                                        : ''}
                                </div>
                            </div>
                            <div>{renderStatusBadge()}</div>
                        </div>
                        {status?.message && (
                            <div className="mt-2 text-xs text-slate-500">
                                詳細: {status.message}
                            </div>
                        )}
                        {status?.databaseProductName && (
                            <div className="mt-1 text-xs text-slate-500">
                                DB: {status.databaseProductName}{' '}
                                {status.databaseProductVersion ?? ''}
                            </div>
                        )}
                    </div>

                    {err && (
                        <div className="mb-4">
                            <Alert variant="destructive">
                                <AlertTitle>エラー</AlertTitle>
                                <AlertDescription>{err}</AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {msg && (
                        <div className="mb-4">
                            <Alert>
                                <AlertTitle>完了</AlertTitle>
                                <AlertDescription>{msg}</AlertDescription>
                            </Alert>
                        </div>
                    )}

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
                            セキュリティのため、application.properties に app.setup.secret を設定し、
                            このトークンを入力して実行してください。
                            未設定の場合はトークン不要ですが推奨しません。
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="text-sm font-medium block mb-2">
                            接続情報
                        </label>

                        <label className="flex items-center gap-2 mb-2 text-sm">
                            <Checkbox
                                id="use-server-defaults"
                                checked={useServerDefaults}
                                onCheckedChange={(v) =>
                                    setUseServerDefaults(Boolean(v))
                                }
                                className="h-4 w-4"
                            />
                            <span>
                                サーバのデフォルト接続情報を使う
                                (app.setup.default-* が設定されている場合)
                            </span>
                        </label>

                        {!useServerDefaults && (
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs">JDBC URL</label>
                                    <Input
                                        value={jdbcUrl}
                                        onChange={(e) => setJdbcUrl(e.target.value)}
                                        placeholder="例: jdbc:postgresql://host:5432/springdb"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs">
                                        データベース ユーザー
                                    </label>
                                    <Input
                                        value={dbUser}
                                        onChange={(e) => setDbUser(e.target.value)}
                                        placeholder="例: springuser (省略可)"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs">
                                        データベース パスワード
                                    </label>
                                    <Input
                                        type="password"
                                        value={dbPassword}
                                        onChange={(e) =>
                                            setDbPassword(e.target.value)
                                        }
                                        placeholder="省略可"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    JDBC URL を省略すると実行できません。URL を正しく指定してください。
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleInit} disabled={loading}>
                            {loading ? '処理中…' : '作成'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setMsg(null);
                                setErr(null);
                            }}
                        >
                            リセット
                        </Button>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                        <p>
                            実行後はバックエンドを通常モードで再起動してください（DataSource
                            自動設定を有効に戻す）。
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}