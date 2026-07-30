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

/** chrome.storage.sync 中保存站点列表的 key */
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
]

/**
 * 类型守卫：判断任意值是否符合 Site 结构
 * @param x 任意 storage 中读出的值
 * @returns 若结构合法则为 true，可缩窄类型为 Site
 */
export function isValidSite(x: unknown): x is Site {
  if (!x || typeof x !== 'object') return false
  const s = x as Record<string, unknown>
  return (
    typeof s.name === 'string' &&
    s.name.trim().length > 0 &&
    typeof s.urlTemplate === 'string' &&
    s.urlTemplate.includes('%s') &&
    (s.encoding === 'utf-8' || s.encoding === 'gbk' || s.encoding === 'raw') &&
    typeof s.enabled === 'boolean'
  )
}

/**
 * 从 chrome.storage.sync 读取站点列表，并过滤掉格式非法的条目
 * @returns 合法的 Site 数组；若 storage 为空则返回空数组
 */
export async function loadSites(): Promise<Site[]> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY_SITES)
    const raw = result[STORAGE_KEY_SITES]
    if (!Array.isArray(raw)) return []
    return raw.filter(isValidSite)
  } catch (err) {
    console.error('[baike] 读取站点配置失败:', err)
    return []
  }
}

/**
 * 将站点列表写入 chrome.storage.sync
 * @param sites 要保存的站点数组
 * @returns 保存成功返回 true；失败返回 false（错误已打印到控制台）
 */
export async function saveSites(sites: Site[]): Promise<boolean> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY_SITES]: sites })
    return true
  } catch (err) {
    console.error('[baike] 保存站点配置失败:', err)
    return false
  }
}
