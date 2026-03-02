<script setup>
import { ref, computed, watch, reactive } from 'vue'
import ImageUpload from './ImageUpload.vue'
import ImageResult from './ImageResult.vue'
import { generateImage } from '../utils/api.js'
import availableModelsConfig from '../config/availableModels.json'

const mode = ref('t2i') // 't2i' | 'i2i'
const prompt = ref('')
const uploadedImage = ref('')
const resolution = ref('landscape')
const clarity = ref('')
const history = ref([])
const queue = ref([])
const processingCount = ref(0)
const showDialog = ref(false)
const MAX_CONCURRENT = 3

const resolutions = [
  { value: 'landscape', label: '横屏', desc: '16:9' },
  { value: 'portrait', label: '竖屏', desc: '9:16' },
  { value: 'square', label: '方图', desc: '1:1' },
  { value: 'four-three', label: '4:3', desc: '4:3' },
  { value: 'three-four', label: '3:4', desc: '3:4' },
]

const clarities = [
  { value: '', label: '标准' },
  { value: '-2k', label: '2K' },
  { value: '-4k', label: '4K' },
]

function parseModel(model) {
  const prefix = 'gemini-3.1-flash-image-'
  if (!model.startsWith(prefix)) return null
  const raw = model.slice(prefix.length)
  if (raw.endsWith('-2k')) {
    return { resolution: raw.slice(0, -3), clarity: '-2k' }
  }
  if (raw.endsWith('-4k')) {
    return { resolution: raw.slice(0, -3), clarity: '-4k' }
  }
  return { resolution: raw, clarity: '' }
}

const modeModels = computed(() => {
  return availableModelsConfig?.available?.[mode.value] ?? []
})

const parsedModels = computed(() => {
  return modeModels.value.map(parseModel).filter(Boolean)
})

const availableResolutionValues = computed(() => {
  return Array.from(new Set(parsedModels.value.map((item) => item.resolution)))
})

const filteredResolutions = computed(() => {
  return resolutions.filter((item) => availableResolutionValues.value.includes(item.value))
})

const availableClarityValues = computed(() => {
  return Array.from(
    new Set(
      parsedModels.value
        .filter((item) => item.resolution === resolution.value)
        .map((item) => item.clarity),
    ),
  )
})

const filteredClarities = computed(() => {
  return clarities.filter((item) => availableClarityValues.value.includes(item.value))
})

const hasAvailableModels = computed(() => modeModels.value.length > 0)

watch(
  [mode, availableResolutionValues],
  () => {
    if (!availableResolutionValues.value.includes(resolution.value)) {
      resolution.value = availableResolutionValues.value[0] ?? 'landscape'
    }
  },
  { immediate: true },
)

watch(
  [mode, resolution, availableClarityValues],
  () => {
    if (!availableClarityValues.value.includes(clarity.value)) {
      clarity.value = availableClarityValues.value[0] ?? ''
    }
  },
  { immediate: true },
)

const modelName = computed(() => {
  const candidate = `gemini-3.1-flash-image-${resolution.value}${clarity.value}`
  if (modeModels.value.includes(candidate)) return candidate
  return modeModels.value[0] ?? ''
})

const canGenerate = computed(() => {
  if (!hasAvailableModels.value) return false
  if (!modelName.value) return false
  if (!prompt.value.trim()) return false
  if (mode.value === 'i2i' && !uploadedImage.value) return false
  if (processingCount.value >= MAX_CONCURRENT) return false
  return true
})

async function processQueue() {
  if (processingCount.value >= MAX_CONCURRENT || queue.value.length === 0) return

  const task = queue.value.shift()
  processingCount.value++
  
  const batch = history.value.find(b => b.id === task.batchId)
  if (!batch) {
    processingCount.value--
    processQueue()
    return
  }
  
  const result = batch.results[0]
  
  try {
    await generateImage({
      model: task.model,
      prompt: task.prompt,
      image: task.image,
      onStatus(text) {
        result.statusText = text
      },
      onImage(url) {
        result.imageUrl = url
        result.loading = false
      },
      onError(err) {
        result.error = err
        result.loading = false
      },
    })
  } catch (error) {
    result.error = error.message
    result.loading = false
  } finally {
    processingCount.value--
    processQueue()
  }
}

function handleGenerate() {
  if (!canGenerate.value) return

  const createdAt = new Date().toLocaleString()
  const batchResults = [reactive({
    loading: true,
    imageUrl: '',
    error: '',
    statusText: '排队中...',
  })]
  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  
  history.value.unshift({
    id: batchId,
    createdAt,
    prompt: prompt.value.trim(),
    mode: mode.value,
    model: modelName.value,
    results: batchResults,
  })

  queue.value.push({
    batchId,
    model: modelName.value,
    prompt: prompt.value.trim(),
    image: mode.value === 'i2i' ? uploadedImage.value : undefined,
  })
  
  showDialog.value = false
  
  if (processingCount.value < MAX_CONCURRENT) {
    processQueue()
  }
}
</script>

<template>
  <div class="relative">
    <!-- Top Bar -->
    <div class="flex items-center justify-between mb-4">
      <div class="text-sm font-medium text-slate-600">
        任务列表 ({{ processingCount }}/{{ MAX_CONCURRENT }} 运行中)
      </div>
      <button
        @click="showDialog = true"
        :disabled="processingCount >= MAX_CONCURRENT"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm',
          processingCount >= MAX_CONCURRENT
            ? 'bg-slate-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:brightness-110 active:scale-95'
        ]"
      >
        {{ processingCount >= MAX_CONCURRENT ? '队列已满' : '添加任务' }}
      </button>
    </div>

    <!-- Task List (Cards) -->
    <div v-if="history.length === 0" class="anime-card flex flex-col items-center justify-center h-[300px] text-slate-300">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-base font-medium">暂无任务</p>
      <p class="text-xs mt-1">点击右上角按钮开始创作</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="batch in history" :key="batch.id" class="anime-card p-3 flex flex-col h-full group hover:shadow-md transition-all duration-300">
        <!-- Header -->
        <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span :class="[
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              batch.mode === 't2i' ? 'bg-sky-50 text-sky-600' : 'bg-purple-50 text-purple-600'
            ]">
              {{ batch.mode === 't2i' ? '文生图' : '图生图' }}
            </span>
            <span class="text-[10px] text-slate-400 font-mono">{{ batch.model.replace('gemini-3.1-flash-image-', '') }}</span>
          </div>
          <span class="text-[10px] text-slate-400">{{ batch.createdAt.split(' ')[1] }}</span>
        </div>

        <!-- Prompt -->
        <div class="text-xs text-slate-600 line-clamp-2 mb-3 min-h-[2.5em]" :title="batch.prompt">
          {{ batch.prompt }}
        </div>

        <!-- Result -->
        <div class="mt-auto">
          <ImageResult
            v-for="(result, idx) in batch.results"
            :key="idx"
            :result="result"
            :index="idx"
          />
        </div>
      </div>
    </div>

    <!-- Create Task Dialog -->
    <Teleport to="body">
      <div v-if="showDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showDialog = false" />
        <div class="relative w-full max-w-lg bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden animate-dialog-in flex flex-col max-h-[90vh]">
          
          <!-- Dialog Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
            <h3 class="font-bold text-slate-800">新建生成任务</h3>
            <button @click="showDialog = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Dialog Body -->
          <div class="p-5 overflow-y-auto space-y-5">
            <!-- Mode Toggle -->
            <div class="flex p-1 bg-slate-100/80 rounded-lg w-full">
              <button
                @click="mode = 't2i'"
                :class="['flex-1 py-1.5 text-xs font-medium rounded-md transition-all', mode === 't2i' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                文生图
              </button>
              <button
                @click="mode = 'i2i'"
                :class="['flex-1 py-1.5 text-xs font-medium rounded-md transition-all', mode === 'i2i' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
              >
                图生图
              </button>
            </div>

            <!-- Prompt Input -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                {{ mode === 't2i' ? '图片描述' : '修改指令' }}
              </label>
              <textarea
                v-model="prompt"
                rows="3"
                :placeholder="mode === 't2i' ? '描述画面内容...' : '描述修改内容...'"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 outline-none resize-none transition-all"
              />
            </div>

            <!-- Image Upload -->
            <div v-if="mode === 'i2i'">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">参考图片</label>
              <ImageUpload v-model="uploadedImage" />
            </div>

            <!-- Resolution -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">分辨率</label>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="r in filteredResolutions"
                  :key="r.value"
                  @click="resolution = r.value"
                  :class="[
                    'py-2 px-1 rounded-lg border text-xs font-medium transition-all text-center truncate',
                    resolution === r.value
                      ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600'
                      : 'border-slate-200 text-slate-500 hover:border-fuchsia-200'
                  ]"
                >
                  {{ r.label }}
                </button>
              </div>
            </div>

            <!-- Clarity -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">清晰度</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="c in filteredClarities"
                  :key="c.value"
                  @click="clarity = c.value"
                  :class="[
                    'py-2 rounded-lg border text-xs font-medium transition-all text-center',
                    clarity === c.value
                      ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600'
                      : 'border-slate-200 text-slate-500 hover:border-fuchsia-200'
                  ]"
                >
                  {{ c.label }}
                </button>
              </div>
            </div>

            <div v-if="!hasAvailableModels" class="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
              当前配置无可用的模型
            </div>
          </div>

          <!-- Dialog Footer -->
          <div class="p-5 border-t border-slate-100 bg-white/50">
            <button
              @click="handleGenerate"
              :disabled="!canGenerate"
              :class="[
                'w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98]',
                canGenerate
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:brightness-110 shadow-fuchsia-200'
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              ]"
            >
              立即生成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes dialog-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-dialog-in {
  animation: dialog-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
