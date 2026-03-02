<script setup>
import { ref } from 'vue'
import AnnouncementDialog from './components/AnnouncementDialog.vue'
import ImageGenerator from './components/ImageGenerator.vue'

const showAnnouncement = ref(true)
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

    <main class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
