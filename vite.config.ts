import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }

// Vite 构建配置：
// - @vitejs/plugin-vue：让 Vite 认识 .vue 单文件组件
// - @crxjs/vite-plugin：读取 manifest.json 作为入口清单，
//   自动处理 Service Worker 单文件打包、Options 页 HTML 入口、以及扩展热重载
export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest }),
  ],
  build: {
    // 打包产物输出目录，Chrome 通过“加载已解压的扩展程序”指向该目录
    outDir: 'dist',
    emptyOutDir: true,
  },
})
