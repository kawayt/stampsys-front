import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
    plugins: [react(), tailwindcss(), VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        injectRegister: 'auto',
        devOptions: { enabled: true },
        manifest: {
            name: 'OneStamp',
            short_name: 'OneStamp', 
            description: 'スタンプ送受信アプリ',
            theme_color: '#ffffff',
            icons: [
            {
                src: 'web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: 'web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png'
            },
            {
                src: 'web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: 'web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
            ],
        }
    })],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: env.VITE_API_BASE_URL || 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    }
})
