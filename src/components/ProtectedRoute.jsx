import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * - apiBase は Vite の環境変数 VITE_API_BASE を想定
 * - /api/me を credentials:'include' で呼んで認証済みか判定する
 * - 未認証なら /login にリダイレクト（元の場所は state に保持）
 */
function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [authed, setAuthed] = useState(false);
    const location = useLocation();
    const apiBase = import.meta.env.VITE_API_BASE || '';

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`${apiBase}/api/me`, {
                    credentials: 'include',
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });
                if (!mounted) return;
                setAuthed(res.ok);
            } catch (e) {
                if (!mounted) return;
                setAuthed(false);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [apiBase]);

    if (loading) return <div>Loading...</div>;
    if (!authed) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}

export default ProtectedRoute;