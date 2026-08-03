<script setup lang="ts">
/**
 * 站点单行编辑组件
 * 设计要点：
 * - **不再维护本地 ref + watch 副本**：直接通过 computed getter/setter 把输入框和父数据打通，
 *   避免用户输入到一半时其它字段变化触发 watch 把输入抹掉的竞态
 * - **输入即触发 emit**：父组件负责防抖后落库，本组件只管把值传上去
 * - URL 校验只做“红框提示”，不再阻止父组件保存，避免用户以为存了其实没存
 */
import { computed } from 'vue'
import type { Encoding, Site } from '../../types'

const props = defineProps<{
  site: Site
  canMoveUp: boolean
  canMoveDown: boolean
  /** 本行是否处于"已改动未保存"状态，命中时保持与 hover 相同的底色 */
  changed: boolean
  /** 鼠标是否悬停在本行（由父组件用 JS 维护，解决排序后 :hover 不更新的问题） */
  hovered: boolean
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<Site>): void
  (e: 'remove'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

/** 名称双向绑定：读父 site.name，写时 emit update */
const name = computed<string>({
  get: () => props.site.name,
  set: (v) => emit('update', { name: v }),
})

/** URL 模板双向绑定 */
const urlTemplate = computed<string>({
  get: () => props.site.urlTemplate,
  set: (v) => emit('update', { urlTemplate: v }),
})

/** 编码双向绑定 */
const encoding = computed<Encoding>({
  get: () => props.site.encoding,
  set: (v) => emit('update', { encoding: v }),
})

/** URL 是否合法：为空视为合法（还没填完），有内容时必须含 %s */
const urlValid = computed<boolean>(() => {
  if (props.site.urlTemplate.length === 0) return true
  return props.site.urlTemplate.includes('%s')
})

/** 切换启用/禁用 */
function toggleEnabled(): void {
  emit('update', { enabled: !props.site.enabled })
}
</script>

<template>
  <tr
    class="site-row"
    :class="{
      'row-disabled': !site.enabled,
      'row-changed': changed,
      'row-hovered': hovered,
    }"
    :data-site-id="site.id"
  >
    <!-- 启用复选框 -->
    <td class="cell-enabled">
      <input
        type="checkbox"
        :checked="site.enabled"
        @change="toggleEnabled"
        class="ckb"
      />
    </td>

    <!-- 排序：上移 / 下移 -->
    <td class="cell-sort">
      <button
        class="sort-btn"
        :disabled="!canMoveUp"
        title="上移"
        @click="emit('move-up')"
      >
        ↑
      </button>
      <button
        class="sort-btn"
        :disabled="!canMoveDown"
        title="下移"
        @click="emit('move-down')"
      >
        ↓
      </button>
    </td>

    <!-- 名称编辑 -->
    <td>
      <input
        v-model="name"
        type="text"
        placeholder="例如：百度百科"
        class="input name-input"
      />
    </td>

    <!-- URL 模板编辑 -->
    <td>
      <input
        v-model="urlTemplate"
        type="text"
        placeholder="https://example.com/search?q=%s"
        class="input url-input"
        :class="{ 'input-error': !urlValid }"
      />
      <span v-if="!urlValid" class="url-error">URL 模板必须包含 %s 占位符</span>
    </td>

    <!-- 编码下拉 -->
    <td>
      <select v-model="encoding" class="select">
        <option value="utf-8">utf-8</option>
        <option value="gbk">gbk</option>
        <option value="raw">raw</option>
      </select>
    </td>

    <!-- 删除按钮 -->
    <td class="cell-action">
      <button class="delete-btn" @click="emit('remove')">删除</button>
    </td>
  </tr>
</template>

<style scoped>
.site-row td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f1f3;
  vertical-align: top;
}
/* hover 浅蓝底（用 JS 维护的 class，而非 CSS :hover，
   解决排序交换 DOM 后浏览器在鼠标未移动时不重新计算 :hover 的问题） */
.site-row.row-hovered td {
  background: #f0f6ff;
}
/* 异动行常驻稍深蓝底，优先级高于 hover，保持已改动状态可辨 */
.site-row.row-changed td {
  background: #e3eefd;
}
.row-disabled td {
  opacity: 0.55;
}
.cell-enabled,
.cell-action,
.cell-sort {
  text-align: center;
  vertical-align: middle !important;
}
.cell-sort {
  white-space: nowrap;
}
.sort-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  margin: 0 2px;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  background: #f8f9fb;
  color: #333;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.sort-btn:hover:not(:disabled) {
  background: #e8f0fe;
  border-color: #1a73e8;
  color: #1a73e8;
}
.sort-btn:disabled {
  background: #f0f0f0;
  border-color: #e0e0e0;
  color: #bbb;
  cursor: not-allowed;
}
.ckb {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

/* 输入框 */
.input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.15);
}
.input-error {
  border-color: #d93025;
}
.input-error:focus {
  box-shadow: 0 0 0 2px rgba(217, 48, 37, 0.15);
}
.url-error {
  display: block;
  color: #d93025;
  font-size: 11px;
  margin-top: 2px;
}

/* 下拉框 */
.select {
  width: 100%;
  padding: 6px 4px;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: #fff;
  cursor: pointer;
}

/* 删除按钮 */
.delete-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: #d93025;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
}
.delete-btn:hover {
  background: #fce8e8;
}
</style>
