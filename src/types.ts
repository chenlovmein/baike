/**
 * 类型与常量定义 - background.ts 与 Options 页共用
 */

/** 支持的关键词编码方式 */
export type Encoding = 'utf-8' | 'gbk' | 'raw'

/** 单个百科站点配置 */
export interface Site {
  /** 站点稳定身份标识，用于菜单 id 与 Vue :key；持久化到 storage */
  id: string
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

/** 首次安装时预置的默认站点（id 写死，便于调试与未来按 id 识别默认站点） */
export const DEFAULT_SITES: Site[] = [
  {
    id: 'baidu',
    name: '百度百科',
    urlTemplate: 'https://baike.baidu.com/item/%s',
    encoding: 'utf-8',
    enabled: true,
  },
  {
    id: 'wikipedia-zh',
    name: '维基百科',
    urlTemplate: 'https://zh.wikipedia.org/wiki/%s',
    encoding: 'utf-8',
    enabled: true,
  },
  {
    id: 'moegirl',
    name: '萌娘百科',
    urlTemplate: 'https://mzh.moegirl.org.cn/%s',
    encoding: 'utf-8',
    enabled: true,
  },
]

/**
 * 为缺失 id 的站点补一个 UUID。
 * 用于兼容老版本数据（v1.0.0 写入的站点没有 id 字段）。
 * 调用方负责在发现需要补齐时把结果写回 storage（懒迁移）。
 */
export function ensureId(site: Omit<Site, 'id'> & { id?: string }): Site {
  return site.id ? (site as Site) : { ...site, id: crypto.randomUUID() }
}

/** 导入解析结果：成功携带站点数组，失败携带面向用户的错误信息 */
export type ImportResult =
  | { ok: true; sites: Site[] }
  | { ok: false; error: string }

/**
 * 解析并校验导入文件的文本内容。
 * 规则：
 * - 必须是合法 JSON，且顶层为数组
 * - 数组每个元素都必须通过 isValidSite 结构校验，否则整批拒绝
 * - 缺失 id 的条目自动补 UUID（与 storage 懒迁移逻辑一致）
 * @param text 导入文件的文本内容
 * @returns 解析结果；失败时 error 为可直接展示给用户的中文提示
 */
export function parseSitesImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '文件不是合法的 JSON' }
  }

  if (!Array.isArray(data)) {
    return { ok: false, error: '文件内容格式不正确：顶层应为站点数组' }
  }

  for (let i = 0; i < data.length; i++) {
    if (!isValidSite(data[i])) {
      return { ok: false, error: `文件内容格式不正确：第 ${i + 1} 条站点数据不合法` }
    }
  }

  const sites = (data as (Omit<Site, 'id'> & { id?: string })[]).map(ensureId)
  return { ok: true, sites }
}

/**
 * 类型守卫：判断任意值是否符合 Site 的**结构**（只校验字段是否存在与类型是否正确）
 * - 用于 storage 层的宽松过滤，保证半成品数据（例如新加的、URL 还没填完的行）能持久化
 * - id 字段允许缺失（老数据），缺失时由 loadSites 统一补齐
 * - 严格的“内容完整性”检查请用 isCompleteSite
 * @param x 任意 storage 中读出的值
 * @returns 若结构合法则为 true
 */
export function isValidSite(x: unknown): x is Omit<Site, 'id'> & { id?: string } {
  if (!x || typeof x !== 'object') return false
  const s = x as Record<string, unknown>
  return (
    (s.id === undefined || typeof s.id === 'string') &&
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
 * 从 chrome.storage.local 读取站点列表，并过滤掉格式非法的条目。
 * 对缺失 id 的老数据会在内存中补齐，并把补齐后的列表写回 storage（懒迁移，幂等）。
 * @returns 合法的 Site 数组；若 storage 为空则返回空数组
 */
export async function loadSites(): Promise<Site[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_SITES)
    const raw = result[STORAGE_KEY_SITES]

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

    const valid = arr.filter(isValidSite)
    // 给老数据补齐 id；新数据透传
    const sites = valid.map(ensureId)

    // 若发生了任何形态修正（类数组对象 → 数组、或有站点缺 id），回写一次
    const shapeChanged = !Array.isArray(raw)
    const idFilled = sites.some((s, i) => {
      const original = valid[i] as { id?: string } | undefined
      return original?.id === undefined
    })
    if (sites.length > 0 && (shapeChanged || idFilled)) {
      await chrome.storage.local.set({ [STORAGE_KEY_SITES]: sites })
    }

    return sites
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
    await chrome.storage.local.set({ [STORAGE_KEY_SITES]: plain })
    return true
  } catch (err) {
    console.error('[baike] 保存站点配置失败:', err)
    return false
  }
}
