<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: { type: String, default: '' },
})

const isDragging = ref(false)
const previewUrl = ref('')

watch(
  () => props.modelValue,
  (value) => {
    previewUrl.value = value || ''
  },
  { immediate: true },
)

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    previewUrl.value = base64
    emit('update:modelValue', base64)
  }
  reader.readAsDataURL(file)
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  handleFile(file)
}

function onFileInput(e) {
  const file = e.target.files[0]
  handleFile(file)
}

function clearImage() {
  previewUrl.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="!previewUrl">
      <label
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        :class="[
          'flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all',
          isDragging
            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-pink-400 hover:bg-pink-50/50 dark:hover:bg-pink-950/10'
        ]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-gray-500 dark:text-gray-400">拖拽图片到此处或 <span class="text-pink-600 dark:text-pink-400 font-medium">点击上传</span></p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">支持 JPG、PNG、WebP</p>
        <input type="file" accept="image/*" class="hidden" @change="onFileInput" />
      </label>
    </div>

    <div v-else class="relative group">
      <img :src="previewUrl" class="w-full h-36 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
      <button
        @click="clearImage"
        class="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
