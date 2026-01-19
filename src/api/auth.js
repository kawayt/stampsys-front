const API_BASE_URL = "http://localhost:8080";

const LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/microsoft`;

const APP_API_URL = `${API_BASE_URL}/api/app`;

/**
 * 現在のログインユーザー情報を取得する
 * - 未ログインの場合は null を返す
 */
export async function fetchAppData() {
    const res = await fetch(APP_API_URL, {
        credentials: "include",
        redirect: "manual",
    });

    if (res.type === "opaqueredirect" || res.status === 0) {
        return null;
    }

    if (res.status === 401) {
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
 * - fetch ではなくブラウザ遷移として /logout にアクセスさせる
 *   （サーバー側が 302 で Microsoft にリダイレクトしても CORS エラーにならない）
 */
export function logout() {
    localStorage.removeItem("stampsys_auth_data");
    window.location.href = `${API_BASE_URL}/logout`;
}

export { API_BASE_URL, LOGIN_URL, APP_API_URL };