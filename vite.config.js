import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        injectRegister: 'auto',
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
            ]
        }
    })],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
