<script setup lang="ts">
/**
 * Options 页面根组件
 * 职责：加载站点列表 → 显示表格 → 处理增删改 → 保存回 storage
 */
import { onMounted, ref } from 'vue'
import type { Site } from '../types'
import { DEFAULT_SITES, loadSites, saveSites } from '../types'
import SiteTable from './components/SiteTable.vue'
import Toast from './components/Toast.vue'

/** 当前编辑中的站点列表（响应式） */
const sites = ref<Site[]>([])

/** Toast 组件引用，用于弹出保存成功/失败提示 */
const toastRef = ref<InstanceType<typeof Toast> | null>(null)

/**
 * 页面挂载时从 storage 加载站点列表；若为空则回退到默认预置
 */
onMounted(async () => {
  const loaded = await loadSites()
  sites.value = loaded.length > 0 ? loaded : [...DEFAULT_SITES]
})

/**
 * 将当前站点列表保存到 storage
 * @returns 无；保存成功/失败均通过 Toast 反馈
 */
async function persist(): Promise<void> {
  const ok = await saveSites(sites.value)
  if (ok) {
    toastRef.value?.show('已保存', 'success')
  } else {
    toastRef.value?.show('保存失败，请检查是否登录 Chrome 账号或配额是否超限', 'error')
  }
}

/**
 * 表格中站点数据变化时的回调（新增/修改字段/切换启用/删除）
 * @param next 更新后的完整站点数组
 */
async function onSitesChange(next: Site[]): Promise<void> {
  sites.value = next
  await persist()
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
</style>
