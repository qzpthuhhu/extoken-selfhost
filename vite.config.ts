import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/postcss';
// Vite 7 内置对 PostCSS/Tailwind 4 无需额外 react 插件：用 @tailwindcss/vite 用 postcss 配置即可
// react插件已经在 postcss.config.js里启用了 tailwindcss + autoprefixer，所以这里只要把 postcss 插件在 build.css文件

export default defineConfig(({ mode }) => {
  const envDir = process.cwd();
  const env = loadEnv(mode, envDir, '');
  const serverPort = Number(env.SERVER_PORT || 3000);
  const clientPort = Number(env.VITE_PORT || 5173);
  const publicUrl = env.APP_PUBLIC_URL || '';

  return {
    root: path.resolve(__dirname, 'client'),
    base: process.env.CLIENT_BASE_PATH || '/',
    envDir: __dirname,
    envPrefix: ['VITE_', ''],
    publicDir: path.resolve(__dirname, 'client/public'),
    resolve: {
      alias: {
      '@client/src': path.resolve(__dirname, 'client/src'),
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@server': path.resolve(__dirname, 'server'),
    },
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.js'),
  },
  plugins: [
    //  // 显式启用 Tailwind CSS 4
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: clientPort,
    strictPort: false,
    cors: true,
    hmr: { overlay: true },
    proxy: {
      // 所有 /api 请求转发给本地 Nest 后端 3000 端口
      '^/api': {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
        ws: false,
        xfwd: true,
      },
      // /openapi 也是后端直接承载
      '^/openapi': {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
      },
      // 健康检查
      '^/health': {
        target: `http://127.0.0.1:${serverPort}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: clientPort,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: mode !== 'production',
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html'),
      },
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            'axios',
            'framer-motion',
            'lucide-react',
            'zustand',
            'sonner',
          ],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot',
            '@radix-ui/react-label',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  define: {
    __APP_PUBLIC_URL__: JSON.stringify(publicUrl),
  },
};
};
