# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 和 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范。

## [1.0.0] - 2026-07-30

### 首次发布

- 划词右键跳转百科查询（二级子菜单）
- 默认预置百度百科 + 中文维基百科
- 支持自定义百科站点（名称 / URL 模板 / 编码 / 启用开关）
- URL 模板占位符使用 `%s`，对齐 Chrome 原生搜索引擎约定
- 配置通过 `chrome.storage.sync` 跨设备同步
- Options 设置页：表格式布局 + 行内编辑 + 失焦即保存
- 点击工具栏图标即可打开设置页
- 完整的错误处理：数据校验、菜单构建失败兜底、URL 校验、Toast 提示

[1.0.0]: https://github.com/<your-name>/baike/releases/tag/v1.0.0
