import axios from 'axios';

// ベースURL設定（環境変数から取得）
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// リクエストインターセプター（認証トークンなど）
axios.interceptors.request.use(
    (config) => {
        // 必要に応じてトークンを追加
        // const token = localStorage.getItem('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// レスポンスインターセプター（エラーハンドリング）
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // 認証エラー時の処理
            console.error('認証エラー');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axios;