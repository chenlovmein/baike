# 图标资源

本目录存放三张扩展图标，`manifest.json` 引用：

- `icon-16.png`  — 16×16，右键菜单 / 开发者页
- `icon-48.png`  — 48×48，`chrome://extensions` 管理页
- `icon-128.png` — 128×128，安装弹窗 / 商店

## 图标来源与署名

图标来自 [Iconfont](https://www.iconfont.cn/)（阿里巴巴矢量图标库）。

请在下方填写你实际下载的图标信息（如仍待补充可保留 TODO）：

- **图标名称**：TODO
- **作者 / 提交者**：TODO
- **原始链接**：TODO
- **协议**：请遵循原作者标注的开源协议（Iconfont 上大部分为「个人免费」或「商用需授权」，请确认后使用）

> ⚠️ Iconfont 上的图标版权归原作者所有，请在下载前查看该图标的授权说明。若原图仅允许个人使用，商用请联系作者取得授权。

## 使用步骤

1. 到 [Iconfont](https://www.iconfont.cn/) 搜索关键词：`百科` / `词典` / `百科全书` / `encyclopedia`
2. 选中喜欢的图标 → 点击"下载 PNG"，选 **128×128** 尺寸（透明背景）
3. 用图片工具另存出 48×48 和 16×16 两份
   （macOS 预览、Windows 画图、Figma、在线工具 [iloveimg.com](https://www.iloveimg.com/resize-image) 都可以）
4. 将三张 PNG 放入本目录，文件名与上方一致
5. 运行 `npm run build`

## 备注

未放图标时插件仍可加载运行，`chrome://extensions` 页会显示灰色拼图占位符——功能不受影响。
