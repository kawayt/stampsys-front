// src/api/auth.js
const API_BASE_URL = "http://localhost:8080";

// Spring Security の OAuth2 クライアント設定で registrationId を "azure" としている想定
// application.yml 例: spring.security.oauth2.client.registration.azure ...
const LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/microsoft`;

const APP_API_URL = `${API_BASE_URL}/api/app`;

/**
 * 現在のログインユーザー情報を取得する
 * - 未ログインの場合は null を返す
 */
export async function fetchAppData() {
    const res = await fetch(APP_API_URL, {
        credentials: "include", // セッション/Cookie を使うなら必須
        redirect: "manual",     // サーバの 302 リダイレクトを追いかけない
    });

    // Spring Security が未ログイン時に /oauth2/authorization/... へ 302 を返す場合、
    // CORS の仕様上 status は 0, type は "opaqueredirect" になる。
    // その場合は「未ログイン」とみなして null を返す。
    if (res.type === "opaqueredirect" || res.status === 0) {
        return null;
    }

    if (res.status === 401) {
        // 未ログイン
        return null;
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP error ${res.status}`);
    }

    return res.json();
}

/**
 * Microsoft 365 (Azure AD) ログインページへリダイレクト
 */
export function loginWithMicrosoft() {
    window.location.href = LOGIN_URL;
}

/**
 * ログアウト処理
 */
export async function logout() {
    await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
    });
}

export { API_BASE_URL, LOGIN_URL, APP_API_URL };