<script setup lang="ts">
/**
 * 简单 Toast 提示条组件
 * 职责：提供 show(message, type) 方法，在页面底部临时显示一条提示，2 秒后自动消失
 * 用法：<Toast ref="toastRef" /> + toastRef.value?.show('已保存', 'success')
 */
import { ref } from 'vue'

/** Toast 消息级别 */
type ToastType = 'success' | 'error' | 'info'

/** 当前显示的消息文本，为空则不显示 */
const message = ref('')
/** 当前消息级别，影响背景色 */
const type = ref<ToastType>('success')
/** 用于清除上一次的自动隐藏定时器 */
let timer: ReturnType<typeof setTimeout> | null = null

/**
 * 显示一条 Toast
 * @param msg 提示文本
 * @param level 提示级别，success 绿色 / error 红色 / info 蓝色，默认 success
 * @param duration 自动消失时间（毫秒），默认 2000
 */
function show(msg: string, level: ToastType = 'success', duration = 2000): void {
  message.value = msg
  type.value = level
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    message.value = ''
    timer = null
  }, duration)
}

// 暴露 show 方法给父组件通过 ref 调用
defineExpose({ show })
</script>

<template>
  <transition name="toast-fade">
    <div v-if="message" class="toast" :class="`toast-${type}`">
      {{ message }}
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  pointer-events: none;
}
.toast-success {
  background: #34a853;
}
.toast-error {
  background: #d93025;
}
.toast-info {
  background: #1a73e8;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
