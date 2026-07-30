<script setup lang="ts">
/**
 * 站点表格组件
 * 职责：渲染表格头、遍历站点数组、渲染每一行、处理新增/删除、把行内变更向上抛
 */
import type { Site } from '../../types'
import SiteRow from './SiteRow.vue'

const props = defineProps<{
  sites: Site[]
}>()

const emit = defineEmits<{
  (e: 'update:sites', next: Site[]): void
}>()

/**
 * 更新第 index 行的站点信息
 * @param index 行索引
 * @param patch 该行变更的字段
 */
function updateRow(index: number, patch: Partial<Site>): void {
  const next = props.sites.map((s, i) => (i === index ? { ...s, ...patch } : s))
  emit('update:sites', next)
}

/**
 * 删除第 index 行（无二次确认）
 */
function removeRow(index: number): void {
  const next = props.sites.filter((_, i) => i !== index)
  emit('update:sites', next)
}

/**
 * 在表格底部追加一条空白站点，进入编辑态
 */
function addRow(): void {
  const next: Site[] = [
    ...props.sites,
    { name: '', urlTemplate: '', encoding: 'utf-8', enabled: true },
  ]
  emit('update:sites', next)
}
</script>

<template>
  <div class="site-table">
    <table>
      <thead>
        <tr>
          <th class="col-enabled">启用</th>
          <th class="col-name">名称</th>
          <th class="col-url">URL 模板</th>
          <th class="col-encoding">编码</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <SiteRow
          v-for="(site, index) in sites"
          :key="index"
          :site="site"
          @update="(patch) => updateRow(index, patch)"
          @remove="removeRow(index)"
        />
        <tr v-if="sites.length === 0" class="empty">
          <td colspan="5">还没有站点，点击下方按钮添加</td>
        </tr>
      </tbody>
    </table>

    <button class="add-btn" @click="addRow">+ 添加站点</button>
  </div>
</template>

<style scoped>
.site-table {
  background: #fff;
  border: 1px solid #e4e6eb;
  border-radius: 6px;
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
thead th {
  text-align: left;
  padding: 12px;
  background: #f8f9fb;
  border-bottom: 1px solid #e4e6eb;
  font-weight: 600;
  color: #555;
}
.col-enabled {
  width: 60px;
  text-align: center;
}
.col-name {
  width: 15%;
}
.col-url {
  width: auto;
}
.col-encoding {
  width: 100px;
}
.col-action {
  width: 80px;
  text-align: center;
}
tbody .empty td {
  padding: 24px;
  text-align: center;
  color: #999;
}
.add-btn {
  display: block;
  width: 100%;
  padding: 12px;
  border: none;
  border-top: 1px solid #e4e6eb;
  background: #fafbfc;
  color: #1a73e8;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.add-btn:hover {
  background: #f0f4fa;
}
</style>
