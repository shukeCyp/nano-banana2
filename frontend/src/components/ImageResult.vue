<script setup>
import { computed } from 'vue'

const props = defineProps({
  result: { type: Object, required: true },
  index: { type: Number, required: true },
})

const statusClass = computed(() => {
  if (props.result.error) return 'border-red-300 dark:border-red-800'
  if (props.result.loading) return 'border-pink-300 dark:border-pink-800 animate-pulse-border'
  if (props.result.imageUrl) return 'border-green-300 dark:border-green-800'
  return 'border-gray-200 dark:border-gray-700'
})

function downloadImage() {
  if (!props.result.imageUrl) return
  
  fetch(props.result.imageUrl)
    .then(response => response.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nanobanana2_${Date.now()}_${props.index + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
    .catch(err => {
      console.error('Download failed:', err)
      // Fallback to open in new tab
      window.open(props.result.imageUrl, '_blank')
    })
}
</script>

<template>
  <div :class="['rounded-2xl border-2 overflow-hidden bg-white dark:bg-gray-900 transition-all', statusClass]">
    <!-- Loading state -->
    <div v-if="result.loading && !result.imageUrl" class="aspect-square flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-pink-200 dark:border-pink-800 border-t-pink-500 dark:border-t-pink-400 rounded-full animate-spin" />
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">生成中...</p>
      <p v-if="result.statusText" class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ result.statusText }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="result.error" class="aspect-square flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 p-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p class="text-sm text-red-600 dark:text-red-400 mt-3 text-center">{{ result.error }}</p>
    </div>

    <!-- Image result -->
    <div v-else-if="result.imageUrl" class="relative group">
      <img :src="result.imageUrl" class="w-full aspect-square object-contain bg-gray-50 dark:bg-gray-800/50" />
      <div class="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click="downloadImage"
          class="w-full py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载图片
        </button>
      </div>
    </div>

    <!-- Empty placeholder -->
    <div v-else class="aspect-square flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
      <p class="text-sm text-gray-300 dark:text-gray-600">#{{ index + 1 }}</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-border {
  0%, 100% { border-color: rgb(249 168 212); }
  50% { border-color: rgb(236 72 153); }
}
.animate-pulse-border {
  animation: pulse-border 2s ease-in-out infinite;
}
:root.dark .animate-pulse-border {
  animation-name: pulse-border-dark;
}
@keyframes pulse-border-dark {
  0%, 100% { border-color: rgb(157 23 77); }
  50% { border-color: rgb(236 72 153); }
}
</style>
