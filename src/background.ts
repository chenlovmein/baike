/**
 * Service Worker 入口
 * 职责：
 * 1. 首次安装时写入默认站点配置
 * 2. 根据站点配置构建右键子菜单（仅在选中文字时显示）
 * 3. 监听 storage 变化，自动重建菜单
 * 4. 处理右键菜单点击：清洗选中文字 → 编码 → 拼接 URL → 新前台标签打开
 * 5. 点击工具栏图标 → 打开 Options 设置页
 */

import {
  DEFAULT_SITES,
  MAX_SELECTION_LENGTH,
  ROOT_MENU_ID,
  STORAGE_KEY_SITES,
  isCompleteSite,
  loadSites,
  saveSites,
  type Encoding,
  type Site,
} from './types'

// ---------------------- 工具函数 ----------------------

/**
 * 清洗选中的原始文本：去首尾空白 + 折叠连续空白 + 截断到上限长度
 * @param raw contextMenus 事件里的 info.selectionText
 * @returns 清洗后的文字；若清洗后为空则返回空字符串
 */
function sanitizeSelection(raw: string | undefined): string {
  if (!raw) return ''
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  if (collapsed.length === 0) return ''
  return collapsed.length > MAX_SELECTION_LENGTH
    ? collapsed.slice(0, MAX_SELECTION_LENGTH)
    : collapsed
}

/**
 * 按站点声明的 encoding 对关键词做 percent-encoding
 * @param keyword 已经清洗过的关键词
 * @param encoding 编码方式：utf-8 (encodeURIComponent) / gbk (TextEncoder 无内建 gbk，退化为 utf-8) / raw (原样)
 * @returns 可以直接拼进 URL 的字符串
 */
function encodeKeyword(keyword: string, encoding: Encoding): string {
  if (encoding === 'raw') return keyword
  if (encoding === 'gbk') {
    // Service Worker 环境没有内建 gbk TextEncoder；此处退化为 utf-8。
    // 如果确实要 gbk，需要引入第三方库 iconv-lite / gbk-string 之类，v1 暂不做。
    return encodeURIComponent(keyword)
  }
  return encodeURIComponent(keyword)
}

/**
 * 用编码后的关键词替换 URL 模板里的 %s
 * @param urlTemplate 含 %s 的模板
 * @param encodedKeyword 已编码的关键词
 * @returns 最终跳转 URL
 */
function buildUrl(urlTemplate: string, encodedKeyword: string): string {
  return urlTemplate.split('%s').join(encodedKeyword)
}

/**
 * 生成子菜单项 id：格式 baike-site-{index}
 * 用 index 而不是 name，避免用户改名后菜单点击回调映射错乱
 */
function siteMenuId(index: number): string {
  return `baike-site-${index}`
}

// ---------------------- 菜单构建 ----------------------

/**
 * 用一个 Promise 串行化 rebuildMenus 调用，避免并发触发导致 “duplicate id” 错误
 * 场景：onInstalled 里写入默认配置会触发 storage.onChanged，此时若 onInstalled 自己
 * 也调用 rebuildMenus，两个异步流会同时跑 removeAll + create，撞出重复 id
 */
let rebuildQueue: Promise<void> = Promise.resolve()

/**
 * 对外的重建入口：串行化包装，任何时候只有一次重建在跑
 */
function rebuildMenus(): Promise<void> {
  rebuildQueue = rebuildQueue.then(() => doRebuildMenus()).catch((err) => {
    console.error('[baike] 重建菜单时抛异常:', err)
  })
  return rebuildQueue
}

/**
 * 实际的重建逻辑：先清空所有菜单，再按当前 storage 中启用的站点重建
 */
async function doRebuildMenus(): Promise<void> {
  // chrome.contextMenus.removeAll 采用回调风格；用 Promise 包一层等它真的清完再继续
  await new Promise<void>((resolve) => {
    try {
      chrome.contextMenus.removeAll(() => resolve())
    } catch (err) {
      console.error('[baike] 清除旧菜单失败:', err)
      resolve()
    }
  })

  const sites = await loadSites()
  // 只用“启用 + 完整（name 非空 + URL 含 %s）”的站点建菜单
  const enabled = sites.filter((s) => s.enabled && isCompleteSite(s))

  // 没有启用的站点则不建菜单（避免出现一个空的“百科查询”父菜单）
  if (enabled.length === 0) return

  // 创建顶级“百科查询”父菜单，仅在选中文字时显示
  // 用回调形式捕获 chrome.runtime.lastError，避免它冒到控制台成为红色 error
  chrome.contextMenus.create(
    {
      id: ROOT_MENU_ID,
      title: '百科查询',
      contexts: ['selection'],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('[baike] 顶级菜单创建提示:', chrome.runtime.lastError.message)
      }
    },
  )

  // 顺序创建子菜单项，单条失败跳过继续
  for (let i = 0; i < enabled.length; i++) {
    const site = enabled[i]
    chrome.contextMenus.create(
      {
        id: siteMenuId(i),
        parentId: ROOT_MENU_ID,
        // %s 在这里会被 Chrome 替换为实际选中的文字（Chrome 菜单标题的原生占位符）
        title: `${site.name}: %s`,
        contexts: ['selection'],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn(
            `[baike] 子菜单创建提示 (${site.name}):`,
            chrome.runtime.lastError.message,
          )
        }
      },
    )
  }
}

// ---------------------- 事件监听 ----------------------

/**
 * 插件安装 / 更新时的初始化：
 * - 若 storage 中未存在站点列表（首次安装），写入默认预置站点
 * - 无论是否首次安装，都重建一次菜单（覆盖版本升级、卸载重装等场景）
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SITES)
    const raw = result[STORAGE_KEY_SITES]
    if (!Array.isArray(raw)) {
      // 首次安装 - 写入默认站点
      await saveSites(DEFAULT_SITES)
    }
  } catch (err) {
    console.error('[baike] 初始化默认配置失败:', err)
  }
  await rebuildMenus()
})

/**
 * 浏览器启动时也重建一次菜单，兜底 Service Worker 冷启动场景
 */
chrome.runtime.onStartup.addListener(() => {
  rebuildMenus()
})

/**
 * 监听 storage 变化：只在 sites 键变化时才重建菜单，避免未来加了其他配置也触发重建
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  if (!(STORAGE_KEY_SITES in changes)) return
  rebuildMenus()
})

/**
 * 右键菜单点击处理：
 * - 解析出用户点了哪个站点
 * - 从 storage 拿到最新配置（不能信任菜单 id 的隐含快照）
 * - 清洗选中文字、编码、拼 URL、新前台标签打开
 */
chrome.contextMenus.onClicked.addListener(async (info) => {
  const menuId = String(info.menuItemId)
  const prefix = 'baike-site-'
  if (!menuId.startsWith(prefix)) return

  const index = Number(menuId.slice(prefix.length))
  if (!Number.isInteger(index) || index < 0) return

  const keyword = sanitizeSelection(info.selectionText)
  if (!keyword) return // 空选中静默返回

  const sites = await loadSites()
  // 与 doRebuildMenus 保持同一过滤规则，才能对齐 index
  const enabled = sites.filter((s) => s.enabled && isCompleteSite(s))
  const site = enabled[index]
  if (!site) {
    console.warn('[baike] 未找到对应站点，配置可能已变更，将重建菜单')
    await rebuildMenus()
    return
  }

  // 运行时兜底校验一次 %s 是否存在（表单侧已挡，这里防御性再校验）
  if (!site.urlTemplate.includes('%s')) {
    console.error('[baike] URL 模板缺少 %s 占位符:', site.urlTemplate)
    return
  }

  const url = buildUrl(site.urlTemplate, encodeKeyword(keyword, site.encoding))

  try {
    await chrome.tabs.create({ url, active: true })
  } catch (err) {
    console.error('[baike] 打开新标签页失败:', err)
  }
})

/**
 * 点击工具栏图标：直接打开 Options 设置页
 * 因为 manifest 中未声明 action.default_popup，所以图标点击会走这里
 */
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})
