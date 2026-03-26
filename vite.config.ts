import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    build: {
        minify: 'terser',
        chunkSizeWarningLimit: 1024,
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        // ── node_modules 分组 ──────────────────────────────
                        {
                            name: 'vendor-framework',
                            test: /[\\/]node_modules[\\/](vue|@vue|pinia|vue-router)[\\/]/,
                            priority: 100,
                        },
                        {
                            name: 'vendor-ui',
                            test: /[\\/]node_modules[\\/](shadcn-vue)[\\/]/,
                            priority: 90,
                        },
                        {
                            name: 'vendor-icons',
                            test: /[\\/]node_modules[\\/](lucide-vue-next)[\\/]/,
                            priority: 80,
                        },
                        {
                            name: 'vendor-utils',
                            test: /[\\/]node_modules[\\/](axios|clsx|tailwind-merge|class-variance-authority|pinia-plugin-persistedstate)[\\/]/,
                            priority: 70,
                        },
                        {
                            name: 'vendor-others',
                            test: /[\\/]node_modules[\\/]/,
                            priority: 10,
                        },
                        // ── src 源码分组 ───────────────────────────────────
                        {
                            name: 'pages',
                            test: /[\\/]src[\\/]pages[\\/]/,
                            priority: 60,
                        },
                        {
                            name: 'components',
                            test: /[\\/]src[\\/]components[\\/]/,
                            priority: 55,
                        },
                        {
                            name: 'store',
                            test: /[\\/]src[\\/]store[\\/]/,
                            priority: 50,
                        },
                        {
                            name: 'api',
                            test: /[\\/]src[\\/]api[\\/]/,
                            priority: 45,
                        },
                        {
                            name: 'composables',
                            test: /[\\/]src[\\/]composables[\\/]/,
                            priority: 40,
                        },
                        {
                            name: 'utils',
                            test: /[\\/]src[\\/](utils|lib)[\\/]/,
                            priority: 35,
                        },
                    ]
                }
            }
        },
    }
})
