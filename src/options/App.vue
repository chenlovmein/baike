<script setup lang="ts">
/**
 * Options 页面根组件
 * 职责：
 * - 加载站点列表并渲染表格
 * - 收集表格内编辑（仅更新内存），用户点"保存"才写回 storage
 * - 追踪本轮被改动过的站点 id，用于在表格里高亮异动行
 */
import { onMounted, reactive, ref } from 'vue'
import type { Site } from '../types'
import { DEFAULT_SITES, loadSites, parseSitesImport, saveSites } from '../types'
import SiteTable from './components/SiteTable.vue'
import Toast from './components/Toast.vue'

/** 当前编辑中的站点列表（响应式，未保存前都只是内存状态） */
const sites = ref<Site[]>([])

/**
 * 本轮被改动过的站点 id 集合：
 * - 表格任意字段变更、上下移动、新增行时，把涉及的 id 加进来
 * - 保存成功或放弃修改时清空
 * - 用于让异动行保持 hover 底色，提示用户"这些行还没存"
 */
const changedIds = reactive(new Set<string>())

/** Toast 组件引用，用于弹出保存成功/失败提示 */
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

/** 是否有未保存的修改（用于控制保存按钮的可用状态） */
const dirty = ref(false)
/** 保存按钮是否处于"正在保存"状态（防止重复点击） */
const saving = ref(false)

/** 隐藏的文件选择框引用，点"导入"时触发其 click */
const fileInputRef = ref<HTMLInputElement | null>(null)

/**
 * 页面挂载时从 storage 加载站点列表；若为空则回退到默认预置
 */
onMounted(async () => {
  const loaded = await loadSites()
  sites.value = loaded.length > 0 ? loaded : [...DEFAULT_SITES]
})

/**
 * 表格中站点数据变化时的回调（新增/修改字段/切换启用/排序/删除）
 * - 只更新内存，不写 storage
 * - 标记 dirty，让保存按钮变为可点状态
 * - 把本次变更涉及的站点 id 加入 changedIds，用于高亮异动行
 * @param next 更新后的完整站点数组
 * @param changed 本次变更涉及的站点 id 列表
 */
function onSitesChange(next: Site[], changed: string[] = []): void {
  sites.value = next
  dirty.value = true
  for (const id of changed) changedIds.add(id)
}

/**
 * 用户点击"保存"按钮：把当前列表写入 storage
 */
async function onSave(): Promise<void> {
  if (saving.value) return
  saving.value = true
  const ok = await saveSites(sites.value)
  saving.value = false
  if (ok) {
    dirty.value = false
    changedIds.clear()
    toastRef.value?.show('已保存', 'success')
  } else {
    toastRef.value?.show(
      '保存失败，请检查是否登录 Chrome 账号或配额是否超限',
      'error',
    )
  }
}

/**
 * 用户点击"放弃修改"：重新从 storage 加载最新数据，覆盖当前未保存的改动
 */
async function onDiscard(): Promise<void> {
  if (!dirty.value) return
  const loaded = await loadSites()
  sites.value = loaded.length > 0 ? loaded : [...DEFAULT_SITES]
  dirty.value = false
  changedIds.clear()
  toastRef.value?.show('已放弃修改', 'info')
}

/**
 * 导出当前列表为 JSON 文件并下载。
 * 导出的是内存中当前所见的数据（含未保存改动），UTF-8 无 BOM。
 */
function onExport(): void {
  // 深拷贝成纯数组，避免把 Vue 响应式 Proxy 写进文件
  const plain = JSON.parse(JSON.stringify(sites.value)) as Site[]
  const blob = new Blob([JSON.stringify(plain, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `baike-sites-${formatDateStamp(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 释放对象 URL，避免内存泄漏
  URL.revokeObjectURL(url)
}

/**
 * 把日期格式化为 YYYY-MM-DD（用于导出文件名）。
 * 单独抽出是为了避免 toISOString 产生 UTC 偏移导致日期差一天。
 */
function formatDateStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 点击"导入"：打开系统文件选择框。
 * 实际读取与校验在 onFileChange 中完成。
 */
function onImportClick(): void {
  fileInputRef.value?.click()
}

/**
 * 文件选择后的处理：读取文本 → 校验 → 确认 → 替换内存列表。
 * - 校验失败：整批拒绝，Toast 报错，当前状态不动
 * - 有未保存改动：先确认覆盖
 * - 导入空数组：确认清空
 * - 替换后标记 dirty，并把所有导入行标记为异动高亮
 */
async function onFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 重置 value，使再次选择同一个文件也能触发 change
  input.value = ''
  if (!file) return

  let text: string
  try {
    text = await file.text()
  } catch {
    toastRef.value?.show('读取文件失败', 'error')
    return
  }

  const result = parseSitesImport(text)
  if (!result.ok) {
    toastRef.value?.show(result.error, 'error')
    return
  }
  const imported = result.sites

  // 需要二次确认的两种情形
  if (imported.length === 0) {
    if (!window.confirm('导入的文件为空，导入将清空所有站点，是否继续？')) {
      return
    }
  } else if (dirty.value) {
    if (
      !window.confirm('当前有未保存的修改，导入将覆盖它们，是否继续？')
    ) {
      return
    }
  }

  sites.value = imported
  dirty.value = true
  changedIds.clear()
  // 导入的整表都是未保存的新内容，全部高亮提示
  for (const s of imported) changedIds.add(s.id)
  toastRef.value?.show(
    imported.length > 0 ? `已导入 ${imported.length} 个站点，请记得保存` : '已清空，请记得保存',
    'success',
  )
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-top">
        <h1>百科查询 · 设置</h1>
        <div class="header-actions">
          <button class="btn btn-link" @click="onImportClick">导入</button>
          <button class="btn btn-link" @click="onExport">导出</button>
          <span class="actions-divider" aria-hidden="true"></span>
          <button
            class="btn btn-secondary"
            :disabled="!dirty || saving"
            @click="onDiscard"
          >
            放弃修改
          </button>
          <button
            class="btn btn-primary"
            :disabled="!dirty || saving"
            @click="onSave"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,application/json"
            class="file-input"
            @change="onFileChange"
          />
        </div>
      </div>
      <p class="hint">
        <span class="hint-text">
          选中网页文字后右键即可查询百科。URL 模板中用
          <code>%s</code> 表示要查询的关键词，例如
          <code>https://baike.baidu.com/item/%s</code>。
        </span>
        <span
          class="status"
          :class="dirty ? 'status-dirty' : 'status-clean'"
        >
          {{ dirty ? '有未保存的修改' : '所有修改已保存' }}
        </span>
      </p>
    </header>

    <main>
      <SiteTable
        :sites="sites"
        :changed-ids="changedIds"
        @update:sites="onSitesChange"
      />
    </main>

    <Toast ref="toastRef" />
  </div>
</template>

<style>
/* 全局重置 */
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
  background: #f5f6f8;
  color: #222;
}
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}
.header {
  margin-bottom: 24px;
}
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}
.header h1 {
  margin: 0;
  font-size: 24px;
}
.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.header .hint {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  color: #666;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.hint-text {
  min-width: 0;
}
.header code {
  background: #eef1f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
/* 干净/脏状态文字，常驻 hint 行右侧 */
.status {
  flex-shrink: 0;
  font-size: 12px;
}
.status-clean {
  color: #5f6368;
}
.status-dirty {
  color: #b06000;
  font-weight: 600;
}

.btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.btn-primary {
  background: #1a73e8;
  color: #fff;
  border-color: #1a73e8;
}
.btn-primary:hover:not(:disabled) {
  background: #1558c0;
  border-color: #1558c0;
}
.btn-secondary {
  background: #fff;
  color: #5f6368;
  border-color: #dadce0;
}
.btn-secondary:hover:not(:disabled) {
  background: #f1f3f4;
  border-color: #bdc1c6;
}
/* 导入/导出：最低调的文字链按钮，与右侧保存/放弃分组 */
.btn-link {
  background: transparent;
  color: #1a73e8;
  border: none;
  padding: 6px 8px;
}
.btn-link:hover {
  text-decoration: underline;
}
/* 两组操作之间的竖向分隔线 */
.actions-divider {
  width: 1px;
  align-self: stretch;
  margin: 4px 4px;
  background: #dadce0;
}
/* 隐藏原生文件选择框，由"导入"按钮触发 */
.file-input {
  display: none;
}
</style>
