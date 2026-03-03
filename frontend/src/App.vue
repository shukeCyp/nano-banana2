<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AnnouncementDialog from './components/AnnouncementDialog.vue'
import ImageGenerator from './components/ImageGenerator.vue'
import { fetchStats } from './utils/api.js'

const showAnnouncement = ref(true)
const stats = ref({ today: 0, total: 0 })
let statsTimer = null

async function loadStats() {
  stats.value = await fetchStats()
}

onMounted(() => {
  loadStats()
  statsTimer = setInterval(loadStats, 20000)
})

onUnmounted(() => {
  if (statsTimer) clearInterval(statsTimer)
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden anime-bg text-slate-800">
    <div class="anime-orb anime-orb-a" />
    <div class="anime-orb anime-orb-b" />
    <div class="anime-grid" />
    <AnnouncementDialog v-if="showAnnouncement" @close="showAnnouncement = false" />

    <header class="sticky top-0 z-30 border-b border-white/40 backdrop-blur-md bg-white/45">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-sky-500 flex items-center justify-center text-white text-lg font-black shadow-[0_8px_28px_rgba(217,70,239,0.35)] ring-2 ring-white/70">
            荷
          </div>
          <div>
            <h1 class="text-lg font-extrabold text-slate-900 leading-tight tracking-wide">
              荷塘AI公益站
            </h1>
            <p class="text-xs text-slate-600">NanoBanana2 · 萌系生图</p>
          </div>
        </div>
        <button
          @click="showAnnouncement = true"
          class="text-sm text-slate-600 hover:text-fuchsia-600 transition-colors"
          title="查看公告"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>
    </header>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-1">
      <div class="flex items-center justify-center gap-5 sm:gap-8 py-3 px-5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_4px_20px_rgba(51,65,85,0.06)]">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-400 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[11px] text-slate-500 font-medium">全平台今日已生成</span>
            <span class="text-xl font-extrabold text-fuchsia-600 tracking-wide">{{ stats.today }}</span>
          </div>
        </div>
        <div class="w-px h-10 bg-slate-200/80" />
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[11px] text-slate-500 font-medium">累计总生成</span>
            <span class="text-xl font-extrabold text-sky-600 tracking-wide">{{ stats.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <main class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5">
      <ImageGenerator />
    </main>

    <footer class="relative z-10 border-t border-white/50 py-4 text-center text-xs text-slate-500/80">
      荷塘AI公益站-NanoBanana2 &middot; 仅供学习交流使用
    </footer>
  </div>
</template>

<style scoped>
.anime-bg {
  background:
    radial-gradient(1200px 560px at 5% -10%, rgba(244, 114, 182, 0.25), transparent 60%),
    radial-gradient(900px 500px at 95% -5%, rgba(56, 189, 248, 0.2), transparent 60%),
    linear-gradient(165deg, #fff8fd 0%, #f6f8ff 45%, #f4f7ff 100%);
}
.anime-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(circle at center, black 20%, transparent 100%);
}
.anime-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(48px);
  pointer-events: none;
  opacity: 0.45;
}
.anime-orb-a {
  width: 280px;
  height: 280px;
  background: #f472b6;
  top: 72px;
  left: -90px;
}
.anime-orb-b {
  width: 320px;
  height: 320px;
  background: #38bdf8;
  top: 160px;
  right: -110px;
}
</style>
