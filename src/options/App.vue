<script setup lang="ts">
/**
 * Options 页面根组件
 * 职责：
 * - 加载站点列表并渲染表格
 * - 收集表格内编辑（仅更新内存），用户点"保存"才写回 storage
 */
import { onMounted, ref } from 'vue'
import type { Site } from '../types'
import { DEFAULT_SITES, loadSites, saveSites } from '../types'
import SiteTable from './components/SiteTable.vue'
import Toast from './components/Toast.vue'

/** 当前编辑中的站点列表（响应式，未保存前都只是内存状态） */
const sites = ref<Site[]>([])

/** Toast 组件引用，用于弹出保存成功/失败提示 */
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

/** 是否有未保存的修改（用于控制保存按钮的可用状态） */
const dirty = ref(false)
/** 保存按钮是否处于"正在保存"状态（防止重复点击） */
const saving = ref(false)

/**
 * 页面挂载时从 storage 加载站点列表；若为空则回退到默认预置
 */
onMounted(async () => {
  const loaded = await loadSites()
  sites.value = loaded.length > 0 ? loaded : [...DEFAULT_SITES]
})

/**
 * 表格中站点数据变化时的回调（新增/修改字段/切换启用/删除）
 * - 只更新内存，不写 storage
 * - 标记 dirty，让保存按钮变为可点状态
 * @param next 更新后的完整站点数组
 */
function onSitesChange(next: Site[]): void {
  sites.value = next
  dirty.value = true
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
  toastRef.value?.show('已放弃修改', 'info')
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>百科查询 · 设置</h1>
      <p class="hint">
        选中网页文字后右键即可查询百科。URL 模板中用
        <code>%s</code> 表示要查询的关键词，例如
        <code>https://baike.baidu.com/item/%s</code>。
      </p>
    </header>

    <div v-if="dirty" class="dirty-bar">
      <span>有未保存的修改</span>
      <div class="dirty-actions">
        <button class="btn btn-ghost" @click="onDiscard">放弃修改</button>
        <button class="btn btn-primary" :disabled="saving" @click="onSave">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <main>
      <SiteTable :sites="sites" @update:sites="onSitesChange" />
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
.header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
}
.header .hint {
  color: #666;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.header code {
  background: #eef1f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

/* 顶部"有未保存修改"提示条 */
.dirty-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff8e1;
  border: 1px solid #f0c674;
  color: #7a5a00;
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.dirty-actions {
  display: flex;
  gap: 8px;
}
.btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
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
.btn-ghost {
  background: transparent;
  color: #7a5a00;
  border-color: #d6c08a;
}
.btn-ghost:hover {
  background: #fff3cf;
}
</style>
