/**
 * 类型与常量定义 - background.ts 与 Options 页共用
 */

/** 支持的关键词编码方式 */
export type Encoding = 'utf-8' | 'gbk' | 'raw'

/** 单个百科站点配置 */
export interface Site {
  /** 显示名，例如“百度百科” */
  name: string
  /** 含 %s 占位符的搜索 URL 模板，例如 https://baike.baidu.com/item/%s */
  urlTemplate: string
  /** 关键词编码方式 */
  encoding: Encoding
  /** 是否在右键菜单中显示 */
  enabled: boolean
}

/** chrome.storage.local 中保存站点列表的 key */
export const STORAGE_KEY_SITES = 'sites'

/** 选中文字的最大长度（字符），超出则截断 */
export const MAX_SELECTION_LENGTH = 100

/** 右键顶级菜单的 id */
export const ROOT_MENU_ID = 'baike-root'

/** 首次安装时预置的默认站点 */
export const DEFAULT_SITES: Site[] = [
  {
    name: '百度百科',
    urlTemplate: 'https://baike.baidu.com/item/%s',
    encoding: 'utf-8',
    enabled: true,
  },
  {
    name: '维基百科',
    urlTemplate: 'https://zh.wikipedia.org/wiki/%s',
    encoding: 'utf-8',
    enabled: true,
  },
  {
    name: '萌娘百科',
    urlTemplate: 'https://mzh.moegirl.org.cn/%s',
    encoding: 'utf-8',
    enabled: true,
  },
]

/**
 * 类型守卫：判断任意值是否符合 Site 的**结构**（只校验字段是否存在与类型是否正确）
 * - 用于 storage 层的宽松过滤，保证半成品数据（例如新加的、URL 还没填完的行）能持久化
 * - 严格的“内容完整性”检查请用 isCompleteSite
 * @param x 任意 storage 中读出的值
 * @returns 若结构合法则为 true，可缩窄类型为 Site
 */
export function isValidSite(x: unknown): x is Site {
  if (!x || typeof x !== 'object') return false
  const s = x as Record<string, unknown>
  return (
    typeof s.name === 'string' &&
    typeof s.urlTemplate === 'string' &&
    (s.encoding === 'utf-8' || s.encoding === 'gbk' || s.encoding === 'raw') &&
    typeof s.enabled === 'boolean'
  )
}

/**
 * 内容完整性检查：站点是否可以真正拿去构建右键菜单
 * - name 去空白后非空
 * - urlTemplate 含有 %s 占位符
 * @param site 已通过 isValidSite 结构校验的站点
 * @returns 是否可用于生成菜单项
 */
export function isCompleteSite(site: Site): boolean {
  return site.name.trim().length > 0 && site.urlTemplate.includes('%s')
}

/**
 * 从 chrome.storage.local 读取站点列表，并过滤掉格式非法的条目
 * @returns 合法的 Site 数组；若 storage 为空则返回空数组
 */
export async function loadSites(): Promise<Site[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SITES)
    const raw = result[STORAGE_KEY_SITES]
    console.log('[baike][diag] loadSites 读取到的原始数据:', raw)

    // 兼容两种存储格式：
    // - 标准数组 [{...}, {...}]
    // - 类数组对象 {0: {...}, 1: {...}}（历史数据 / 某些存储场景下数组会被序列化成这种形态）
    let arr: unknown[] = []
    if (Array.isArray(raw)) {
      arr = raw
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      // 仅当所有键都是数字索引时，才当作类数组对象转成数组
      if (Object.keys(obj).every((k) => /^\d+$/.test(k))) {
        arr = Object.values(obj)
      }
    }

    const filtered = arr.filter(isValidSite)
    console.log('[baike][diag] loadSites 过滤后:', filtered)

    // 若 storage 里存的是类数组对象，顺手把它修正成标准数组写回，避免下次再走兼容分支
    if (filtered.length > 0 && !Array.isArray(raw)) {
      await chrome.storage.local.set({ [STORAGE_KEY_SITES]: filtered })
      console.log('[baike][diag] loadSites 已把类数组对象修正为标准数组并写回')
    }

    return filtered
  } catch (err) {
    console.error('[baike] 读取站点配置失败:', err)
    return []
  }
}

/**
 * 将站点列表写入 chrome.storage.local
 * @param sites 要保存的站点数组
 * @returns 保存成功返回 true；失败返回 false（错误已打印到控制台）
 */
export async function saveSites(sites: Site[]): Promise<boolean> {
  try {
    // Vue 3 的响应式数组是 Proxy 对象，直接传给 chrome.storage 会经结构化克隆
    // 丢掉数组身份，变成 {0:.., 1:..} 类数组对象。这里用 JSON 往返深拷贝成纯数组。
    const plain = JSON.parse(JSON.stringify(sites)) as Site[]
    console.log('[baike][diag] saveSites 准备写入:', plain)
    await chrome.storage.local.set({ [STORAGE_KEY_SITES]: plain })
    // 写入后立刻读回，验证是否真的落库且仍为数组
    const verify = await chrome.storage.local.get(STORAGE_KEY_SITES)
    console.log('[baike][diag] saveSites 写后回读:', verify[STORAGE_KEY_SITES])
    return true
  } catch (err) {
    console.error('[baike] 保存站点配置失败:', err)
    return false
  }
}
