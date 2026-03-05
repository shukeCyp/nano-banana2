<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AnnouncementDialog from './components/AnnouncementDialog.vue'
import ImageGenerator from './components/ImageGenerator.vue'
import { fetchStats } from './utils/api.js'

const showAnnouncement = ref(true)
const showBlacklistOverlay = ref(false)
const showRateLimitDialog = ref(false)
const rateLimitMessage = ref('')
const stats = ref({ today: 0, total: 0 })
let statsTimer = null

async function loadStats() {
  stats.value = await fetchStats()
}

function onBlacklisted() {
  showBlacklistOverlay.value = true
}

function onRateLimited(e) {
  rateLimitMessage.value = e.detail || '请求过于频繁'
  showRateLimitDialog.value = true
}

onMounted(() => {
  loadStats()
  statsTimer = setInterval(loadStats, 20000)
  window.addEventListener('nb2-blacklisted', onBlacklisted)
  window.addEventListener('nb2-rate-limited', onRateLimited)
})

onUnmounted(() => {
  if (statsTimer) clearInterval(statsTimer)
  window.removeEventListener('nb2-blacklisted', onBlacklisted)
  window.removeEventListener('nb2-rate-limited', onRateLimited)
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden anime-bg text-slate-800">
    <div class="anime-orb anime-orb-a" />
    <div class="anime-orb anime-orb-b" />
    <div class="anime-grid" />
    <AnnouncementDialog v-if="showAnnouncement" @close="showAnnouncement = false" />

    <!-- Blacklist full-screen overlay - cannot be dismissed -->
    <Teleport to="body">
      <div v-if="showBlacklistOverlay" class="blacklist-overlay">
        <div class="blacklist-finger">🖕</div>
        <div class="blacklist-text">
          <span>别</span><span>浪</span><span>费</span><span>生</span><span>图</span><span>机</span><span>会</span>
        </div>
        <div class="blacklist-sub">等 会 再 用 吧</div>
      </div>
    </Teleport>

    <!-- Rate limit dialog - can be dismissed -->
    <Teleport to="body">
      <div v-if="showRateLimitDialog" class="fixed inset-0 z-[9000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showRateLimitDialog = false" />
        <div class="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden rate-limit-enter">
          <div class="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-6 py-5">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚠️</span>
              <div>
                <h2 class="text-lg font-extrabold text-white">速率限制</h2>
                <p class="text-orange-100 text-xs mt-0.5">请求太频繁啦</p>
              </div>
            </div>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="text-sm text-slate-700 leading-relaxed">
              <p class="font-semibold text-slate-900 mb-2">{{ rateLimitMessage }}</p>
              <p class="text-slate-600">为了保证所有用户的使用体验，我们对每个 IP 的请求频率做了限制：</p>
              <ul class="mt-2 space-y-1 text-slate-600">
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  每小时最多 <strong class="text-slate-800">20</strong> 次
                </li>
                <li class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  每天最多 <strong class="text-slate-800">50</strong> 次
                </li>
              </ul>
            </div>
            <div class="p-3 bg-sky-50 rounded-xl border border-sky-100">
              <p class="text-sm font-semibold text-slate-800 mb-1">如需更多次数，欢迎加入交流群</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xl">💬</span>
                <span class="text-sky-600 font-mono text-xl font-extrabold tracking-wide">1075766113</span>
              </div>
              <p class="text-xs text-slate-500 mt-1">QQ 群 · 联系管理员获取更高额度</p>
            </div>
          </div>
          <div class="px-6 pb-5">
            <button
              @click="showRateLimitDialog = false"
              class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-orange-200 active:scale-[0.98]"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
.blacklist-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  cursor: not-allowed;
  overflow: hidden;
}
.blacklist-finger {
  font-size: min(40vw, 220px);
  line-height: 1;
  animation: finger-float 2s ease-in-out infinite;
  filter: drop-shadow(0 0 60px rgba(255, 50, 50, 0.4));
}
@keyframes finger-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-18px) rotate(-6deg); }
  70% { transform: translateY(-8px) rotate(6deg); }
}
.blacklist-text {
  margin-top: 32px;
  display: flex;
  gap: 4px;
}
.blacklist-text span {
  font-size: min(8vw, 48px);
  font-weight: 900;
  background: linear-gradient(135deg, #ff6b6b, #ffa500, #ff6b6b);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: text-shimmer 3s ease-in-out infinite, char-pop 0.6s ease-out both;
  font-style: italic;
  letter-spacing: 0.05em;
}
.blacklist-text span:nth-child(1) { animation-delay: 0s, 0s; }
.blacklist-text span:nth-child(2) { animation-delay: 0.1s, 0.08s; }
.blacklist-text span:nth-child(3) { animation-delay: 0.2s, 0.16s; }
.blacklist-text span:nth-child(4) { animation-delay: 0.3s, 0.24s; }
.blacklist-text span:nth-child(5) { animation-delay: 0.4s, 0.32s; }
.blacklist-text span:nth-child(6) { animation-delay: 0.5s, 0.40s; }
.blacklist-text span:nth-child(7) { animation-delay: 0.6s, 0.48s; }
@keyframes char-pop {
  0% { opacity: 0; transform: translateY(30px) scale(0.5); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes text-shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.blacklist-sub {
  margin-top: 20px;
  font-size: min(4vw, 22px);
  color: #555;
  letter-spacing: 0.6em;
  font-weight: 300;
  animation: sub-fade 1.5s ease-out 0.8s both;
}
@keyframes sub-fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes rate-limit-in {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.rate-limit-enter {
  animation: rate-limit-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
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
