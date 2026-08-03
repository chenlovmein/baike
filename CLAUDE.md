# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

极简 Chrome 扩展（Manifest V3）：在网页上选中文字 → 右键"百科查询 ▶" → 选择百科站点 → 新前台标签打开搜索结果。百科站点可在 Options 页自定义。

技术栈：Vue 3 + TypeScript + Vite 5，由 [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin) 读取 `manifest.json` 作为多入口清单完成打包。不引入 UI 组件库。

## 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 开发模式：Vite 监听 + crxjs HMR，产物写入 dist/
npm run build      # 类型检查 (vue-tsc --noEmit) + 生产打包到 dist/
npm run preview    # 预览打包产物
```

加载到 Chrome：打开 `chrome://extensions` → 开启开发者模式 → "加载已解压的扩展程序" → 选择 `dist/` 目录。

开发模式下修改 Options 页会自动 HMR；修改 `src/background.ts`（Service Worker）后需到 `chrome://extensions` 手动点刷新 ↻。

**没有**配置测试、lint、formatter，也没有单测命令。

## 运行时架构

扩展有两个相互独立的运行时，通过 `chrome.storage.local` 交换数据：

1. **Service Worker**：`src/background.ts`
   - `onInstalled`：首次安装写入 `DEFAULT_SITES`，并重建菜单
   - `onStartup` / `storage.onChanged`：兜底重建右键菜单
   - `contextMenus.onClicked`：根据点击的菜单 id 定位站点 → 清洗选中文字 → 编码 → 拼 URL → `chrome.tabs.create`
   - `contextMenus.onShown`（Chrome 116+，已做存在性探测）：右键展开瞬间把选中文字截断预览写进顶级菜单标题
   - `action.onClicked`：点击工具栏图标 → `chrome.runtime.openOptionsPage()`

2. **Options 页**：`src/options/`（Vue 3 SPA，`index.html` → `main.ts` → `App.vue`）
   - 表格内编辑只改内存中的响应式 `sites`，点"保存"才写 storage
   - 顶部黄色 dirty-bar 提供"保存 / 放弃修改"
   - 组件分层：`App.vue`（状态与保存逻辑）→ `SiteTable.vue`（行的增删 + 变更向上抛）→ `SiteRow.vue`（用 computed getter/setter 把 input 直接绑到 props，通过 `update` 事件回传 patch）

### 共享模块 `src/types.ts`

background 和 Options 共用：`Site` 类型、`DEFAULT_SITES`、常量（`STORAGE_KEY_SITES` / `MAX_SELECTION_LENGTH` / `ROOT_MENU_ID`）、两个校验函数（`isValidSite` 结构校验、`isCompleteSite` 内容校验：name 非空且 URL 含 `%s`）、以及 storage 读写函数 `loadSites` / `saveSites`。

### 菜单 id 用站点稳定 id（不再依赖索引）

子菜单 id 为 `baike-site-{site.id}`。`doRebuildMenus` 构建菜单时用 `site.id`，`onClicked` 解析 id 后用 `sites.find(s => s.id === siteId)` 直接定位，再校验 `enabled && isCompleteSite(site)`。改过滤规则不会导致菜单错位。

`Site.id` 必填、持久化到 storage：
- `DEFAULT_SITES` 写死可读 id：`'baidu'` / `'wikipedia-zh'` / `'moegirl'`
- 用户新增行立即 `crypto.randomUUID()`
- `loadSites` 对老版本数据（无 id）做懒迁移：内存补齐 UUID 并写回 `chrome.storage.local`。这个写回是必须的——MV3 Service Worker 会在闲置约 30 秒后被杀，若 id 只活在内存里，SW 重启后菜单 id 会变，用户点到的是旧菜单 id，`find` 找不到对应站点。

### 菜单重建的串行化

`rebuildMenus()` 用 `rebuildQueue` Promise 链把多次重建串行化。原因：`onInstalled` 写入默认配置会触发 `storage.onChanged`，两者都调用重建会并发跑 `removeAll` + `create`，撞出 "duplicate id" 错误。新增触发重建的入口时请走 `rebuildMenus()` 而不是直接调 `doRebuildMenus()`。

### storage 读写的两个坑

- **Vue 响应式 Proxy 问题**：`saveSites` 必须用 `JSON.parse(JSON.stringify(sites))` 深拷贝成纯数组再传给 `chrome.storage.local.set`。直接传 Vue 的响应式数组，经结构化克隆会丢掉数组身份，存成 `{0:..., 1:...}` 类数组对象。
- **兼容历史类数组数据**：`loadSites` 会检测类数组对象（所有键都是数字索引）并转回数组，然后回写修正成标准数组。

## 数据模型

```ts
interface Site {
  id: string                                  // 稳定身份，用于菜单 id 与 Vue :key
  name: string                                // 显示名
  urlTemplate: string                         // 含 %s 占位符的搜索 URL
  encoding: 'utf-8' | 'gbk' | 'raw'           // 关键词编码方式
  enabled: boolean                            // 是否在菜单显示
}
```

存储位置：`chrome.storage.local`，key 为 `"sites"`。

`encoding` 的实际行为：
- `utf-8`：`encodeURIComponent`
- `raw`：原样拼接（不编码）
- `gbk`：**当前退化为 utf-8**——Service Worker 环境没有内建 gbk TextEncoder，要真支持需引入 `iconv-lite` 等第三方库。

## 构建配置要点

- `vite.config.ts`：`@vitejs/plugin-vue` + `crx({ manifest })`。crxjs 会自动处理 Service Worker 打包和 Options HTML 入口，不需要手写 `rollupOptions.input`。
- `tsconfig.json` 开启 `strict`，`moduleResolution: "Bundler"`，配了 `@/* → src/*` 路径别名（但现有代码一律用相对导入，新增代码沿用相对路径保持一致）。
- 构建产物输出到 `dist/`，`emptyOutDir: true`。

## README 与代码的差异（以代码为准）

`README.md` / `CHANGELOG.md` 部分描述已过时，排障时不要被误导：

- 文档说配置走 `chrome.storage.sync` 跨设备同步 —— **代码实际用 `chrome.storage.local`**（仅本地，不同步）。
- 文档说"失焦即保存 / 无保存按钮" —— **代码实际是显式"保存 / 放弃修改"按钮**，编辑只改内存。
- `src/background.ts` 里 `onShown` 监听器上方有两段重复的 JSDoc 注释块。

## 权限

`manifest.json` 仅申请两个权限：`contextMenus`（建右键菜单）、`storage`（存配置）。扩展本身不发起任何网络请求——所有"联网"都是用户点击菜单后浏览器自己打开新标签。新增权限前请评估隐私影响。

## 代码风格

- 注释、提交信息使用简体中文（见用户全局规范）。
- 提交信息遵循约定式提交：`feat` / `fix` / `docs` / `style` / `refactor` / `chore`。
- Vue 组件使用 `<script setup lang="ts">` + Composition API；样式默认 `scoped`，全局样式只在 `App.vue` 中用于重置与页面骨架。
