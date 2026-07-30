<script setup lang="ts">
/**
 * 站点单行编辑组件
 * 职责：渲染一个站点的 5 个单元格（启用/名称/URL/编码/操作），
 * 支持行内编辑，失焦即保存（通过 emit update），
 * 并在 URL 失焦时校验是否包含 %s 占位符。
 */
import { ref, watch } from 'vue'
import type { Encoding, Site } from '../../types'

const props = defineProps<{
  site: Site
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<Site>): void
  (e: 'remove'): void
}>()

/** 名称字段的本地编辑副本（用于 v-model 绑定） */
const name = ref(props.site.name)
/** URL 模板的本地编辑副本 */
const urlTemplate = ref(props.site.urlTemplate)
/** 编码下拉选中值 */
const encoding = ref<Encoding>(props.site.encoding)
/** URL 是否通过校验（含 %s） */
const urlValid = ref(true)

/** 当父组件传入的 site 变化时，同步本地副本（例如新增一行后初始化） */
watch(
  () => props.site,
  (s) => {
    name.value = s.name
    urlTemplate.value = s.urlTemplate
    encoding.value = s.encoding
  },
  { immediate: true },
)

/**
 * 校验并保存 URL 模板
 * 规则：必须包含 %s；若为空则校验通过（等用户填完再校验）
 */
function validateAndSaveUrl(): void {
  if (urlTemplate.value.length === 0) {
    urlValid.value = true
    return
  }
  if (!urlTemplate.value.includes('%s')) {
    urlValid.value = false
    return
  }
  urlValid.value = true
  emit('update', { urlTemplate: urlTemplate.value })
}

/** 失焦时保存名称 */
function saveName(): void {
  emit('update', { name: name.value })
}

/** 切换启用/禁用，立即保存 */
function toggleEnabled(): void {
  emit('update', { enabled: !props.site.enabled })
}

/** 编码下拉变化，立即保存 */
function changeEncoding(): void {
  emit('update', { encoding: encoding.value })
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
        @blur="saveName"
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
        @blur="validateAndSaveUrl"
      />
      <span v-if="!urlValid" class="url-error">URL 模板必须包含 %s 占位符</span>
    </td>

    <!-- 编码下拉 -->
    <td>
      <select
        v-model="encoding"
        class="select"
        @change="changeEncoding"
      >
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