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
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<Site>): void
  (e: 'remove'): void
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
  <tr class="site-row" :class="{ 'row-disabled': !site.enabled }">
    <!-- 启用复选框 -->
    <td class="cell-enabled">
      <input
        type="checkbox"
        :checked="site.enabled"
        @change="toggleEnabled"
        class="ckb"
      />
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
.row-disabled td {
  opacity: 0.55;
}
.cell-enabled,
.cell-action {
  text-align: center;
  vertical-align: middle !important;
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
