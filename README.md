# 百科查询 · Baike Search

> 一款极简的 Chrome 扩展：选中网页文字，右键跳转百度百科 / 维基百科 / 任意自定义百科查询。

<p>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-4285F4?logo=googlechrome&logoColor=white" />
  <img alt="Vue 3" src="https://img.shields.io/badge/vue-3-42b883?logo=vue.js&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/vite-5-646CFF?logo=vite&logoColor=white" />
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## ✨ 功能特性

- 🖱️ **划词右键即查询**：选中文字 → 右键"百科查询 ▶" → 选站点跳转
- 📚 **默认预置**：百度百科 + 中文维基百科 + 萌娘百科，装完即用
- ➕ **自定义百科**：任何支持 URL 参数搜索的站点都能配（用 `%s` 作占位符）
- ☁️ **跨设备同步**：配置通过 `chrome.storage.sync` 随 Chrome 账号同步
- 💾 **失焦即保存**：设置页无"保存"按钮，改了就存
- 🔒 **零数据收集**：不发任何网络请求、不读浏览历史、不上报任何数据

## 📸 截图

> 截图占位。请放到 `docs/screenshots/` 目录后替换下列路径。

<p align="center">
  <img src="docs/screenshots/context-menu.png" alt="右键菜单" width="45%" />
  &nbsp;
  <img src="docs/screenshots/options-page.png" alt="设置页面" width="45%" />
</p>

## 🚀 安装

### 方式一：从源码构建（当前唯一方式）

```bash
git clone https://github.com/<your-name>/baike.git
cd baike
npm install
npm run build
```

然后：

1. 打开 Chrome，访问 `chrome://extensions`
2. 打开右上角"**开发者模式**"开关
3. 点击"**加载已解压的扩展程序**"，选择项目下的 `dist/` 目录
4. 完成 ✅

### 方式二：Chrome Web Store（待上架）

暂未上架，若你希望我上架，请到 issue 里 👍。

## 🎯 使用

1. **划词查询**
   在任意网页选中一段文字 → 右键 → **百科查询 ▶** → 选择百科站点 → 新标签页打开搜索结果。

2. **打开设置**
   点击工具栏上的插件图标，或到 `chrome://extensions` → 详情 → **扩展选项**。

3. **添加自定义站点**
   设置页 → **+ 添加站点** → 填写：

   | 字段 | 说明 | 示例 |
   |------|------|------|
   | 名称 | 显示在右键菜单里的名字 | `萌娘百科` |
   | URL 模板 | 用 `%s` 表示要查询的关键词 | `https://mzh.moegirl.org.cn/%s` |
   | 编码 | 关键词编码方式，一般 `utf-8` 即可 | `utf-8` |
   | 启用 | 是否在右键菜单显示 | ✔ |

## 🔧 常用 URL 模板

```
百度百科      https://baike.baidu.com/item/%s
中文维基百科  https://zh.wikipedia.org/wiki/%s
英文维基百科  https://en.wikipedia.org/wiki/%s
萌娘百科      https://mzh.moegirl.org.cn/%s
MBA 智库百科  https://wiki.mbalib.com/wiki/%s
知乎搜索      https://www.zhihu.com/search?q=%s
Google 搜索   https://www.google.com/search?q=%s
必应搜索      https://cn.bing.com/search?q=%s
```

## 🛠️ 开发

### 环境要求

- Node.js 18+（推荐 20+）
- npm / pnpm / yarn 任选

### 目录结构

```
baike/
├── manifest.json              # Chrome 扩展清单（MV3）
├── package.json
├── vite.config.ts             # Vite + @crxjs 插件配置
├── tsconfig.json
├── public/                    # 图标资源目录
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── src/
    ├── background.ts          # Service Worker：菜单构建 + 右键处理
    ├── types.ts               # 类型与工具函数（loadSites / saveSites）
    ├── env.d.ts               # Vite / .vue 类型声明
    └── options/
        ├── index.html
        ├── main.ts            # Vue 入口
        ├── App.vue            # 设置页根组件
        └── components/
            ├── SiteTable.vue  # 站点表格
            ├── SiteRow.vue    # 行内编辑
            └── Toast.vue      # 提示条
```

### 常用脚本

```bash
npm run dev      # 开发模式，改代码自动重载扩展
npm run build    # 打包生产版本到 dist/
```

`npm run dev` 之后，把 `dist/` 目录以"已解压扩展"加载到 Chrome。修改代码会自动重建；改 `background.ts` 后建议手动到 `chrome://extensions` 点一次刷新 ↻。

### 技术栈

- **Manifest V3 + Service Worker**：不做持久后台，唯一的运行入口是右键点击事件
- **Vue 3 + Vite + TypeScript**：Options 页的技术栈；不引入 UI 组件库以保持包体积小
- **[@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)**：读取 manifest 作为入口清单，提供扩展 HMR

### 数据模型

单个百科站点由 4 个字段组成：

```typescript
interface Site {
  name: string                              // 显示名，如"百度百科"
  urlTemplate: string                       // 含 %s 的搜索 URL 模板
  encoding: 'utf-8' | 'gbk' | 'raw'         // 关键词编码方式
  enabled: boolean                          // 是否在菜单中显示
}
```

配置存储于 `chrome.storage.sync`，key 为 `sites`。

## 🤝 贡献

欢迎任何形式的贡献！

1. Fork 本仓库
2. 新建分支 (`git checkout -b feature/xxx`)
3. 提交改动 (`git commit -m 'feat: 添加 xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 发起 Pull Request

Commit 信息请使用中文，并遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 格式：`feat` / `fix` / `docs` / `style` / `refactor` / `chore` 等。

发现 bug 或有功能建议？请到 [Issues](../../issues) 反馈。

## 🗺️ 路线图

- [x] 划词右键跳转
- [x] 自定义百科站点
- [x] 跨设备同步
- [ ] 默认站点单击直达（顶级菜单直接可点）
- [ ] 添加站点时的"测试"按钮
- [ ] 配置导入 / 导出
- [ ] 快捷键支持
- [ ] 上架 Chrome Web Store

## 🔒 隐私说明

本插件是**纯本地插件**：

- ❌ 不发起任何网络请求
- ❌ 不读取浏览历史、书签、Cookie
- ❌ 不采集任何用户数据、不做统计上报
- ✅ 仅在你**点击右键菜单时**读取当前选中的文字，用于拼接搜索 URL
- ✅ 配置数据仅保存在 `chrome.storage.sync` 中（Chrome 自带的账号同步空间）

请求的权限清单：
- `contextMenus` — 创建右键菜单
- `storage` — 保存百科站点配置

## 📄 License

[MIT](LICENSE) © 2026 baike-extension contributors

## 🙏 致谢

- 图标来自 [Iconfont](https://www.iconfont.cn) — 详见 [public/README.md](public/README.md)
- Vue 与 Vite 团队提供的开发体验
- [@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools) 让 Chrome 扩展开发不再痛苦
