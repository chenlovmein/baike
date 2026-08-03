<script setup lang="ts">
/**
 * 站点表格组件
 * 职责：渲染表格头、遍历站点数组、渲染每一行、处理新增/删除/上下移动，把行内变更向上抛
 */
import { ref } from 'vue'
import type { Site } from '../../types'
import SiteRow from './SiteRow.vue'

const props = defineProps<{
  sites: Site[]
  /** 本轮被改动过的站点 id 集合，用于给异动行加高亮 class */
  changedIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'update:sites', next: Site[], changed?: string[]): void
}>()

/**
 * 更新第 index 行的站点信息
 * @param index 行索引
 * @param patch 该行变更的字段
 */
function updateRow(index: number, patch: Partial<Site>): void {
  const site = props.sites[index]
  const next = props.sites.map((s, i) => (i === index ? { ...s, ...patch } : s))
  emit('update:sites', next, [site.id])
}

/**
 * 删除第 index 行（无二次确认）
 * 删除后行已不存在，不标记异动
 */
function removeRow(index: number): void {
  const next = props.sites.filter((_, i) => i !== index)
  emit('update:sites', next)
}

/**
 * 将第 index 行与相邻行交换位置
 * @param index 当前行索引（用户点击的那一行）
 * @param direction -1 上移，1 下移
 */
function moveRow(index: number, direction: -1 | 1): void {
  const target = index + direction
  if (target < 0 || target >= props.sites.length) return
  const next = [...props.sites]
  ;[next[index], next[target]] = [next[target], next[index]]
  // 只标记用户主动点击的这一行，被动交换的另一行不高亮
  emit('update:sites', next, [props.sites[index].id])
}

/**
 * 在表格底部追加一条空白站点，进入编辑态
 */
function addRow(): void {
  const newSite: Site = {
    id: crypto.randomUUID(),
    name: '',
    urlTemplate: '',
    encoding: 'utf-8',
    enabled: true,
  }
  const next: Site[] = [...props.sites, newSite]
  emit('update:sites', next, [newSite.id])
}
</script>

<template>
  <div class="site-table">
    <table>
      <thead>
        <tr>
          <th class="col-enabled">启用</th>
          <th class="col-sort">排序</th>
          <th class="col-name">名称</th>
          <th class="col-url">URL 模板</th>
          <th class="col-encoding">编码</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <SiteRow
          v-for="(site, index) in sites"
          :key="site.id"
          :site="site"
          :changed="changedIds.has(site.id)"
          :can-move-up="index > 0"
          :can-move-down="index < sites.length - 1"
          @update="(patch) => updateRow(index, patch)"
          @remove="removeRow(index)"
          @move-up="moveRow(index, -1)"
          @move-down="moveRow(index, 1)"
        />
        <tr v-if="sites.length === 0" class="empty">
          <td colspan="6">还没有站点，点击下方按钮添加</td>
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
.col-sort {
  width: 80px;
  text-align: center;
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
}
</style>
