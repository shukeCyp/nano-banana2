<script setup>
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/35 backdrop-blur-md" @click="$emit('close')" />
      <div class="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_30px_90px_rgba(30,41,59,0.30)] animate-dialog-in">
        <div class="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.22),_transparent_55%)]" />
        <div class="relative bg-gradient-to-r from-fuchsia-500 via-pink-500 to-sky-500 px-6 py-5">
          <h2 class="text-xl font-extrabold text-white tracking-wide">欢迎来到荷塘AI公益站</h2>
          <p class="text-pink-100 text-sm mt-1">NanoBanana2 · 二次元 AI 图片生成</p>
        </div>

        <div class="relative px-6 py-5 space-y-4">
          <div class="flex items-start gap-3 p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100">
            <span class="text-2xl flex-shrink-0 mt-0.5">📢</span>
            <div class="text-sm text-slate-700 leading-relaxed">
              <p class="font-bold text-slate-900 mb-1">公告</p>
              <p>本站为公益性质，免费提供 AI 图片生成服务，仅供学习交流使用。</p>
              <p class="mt-2">如果遇到问题或有建议，欢迎加入我们的交流群！</p>
            </div>
          </div>

          <div class="flex items-center gap-3 p-3 bg-sky-50 rounded-xl border border-sky-100">
            <span class="text-2xl flex-shrink-0">💬</span>
            <div class="text-sm">
              <p class="font-bold text-slate-900">QQ 交流群</p>
              <p class="text-sky-600 font-mono text-lg font-extrabold mt-0.5 tracking-wide">1075766113</p>
            </div>
          </div>

          <div class="text-xs text-slate-500 leading-relaxed">
            <p>请合理使用资源，勿用于违法违规用途。感谢您的理解与支持！</p>
          </div>
        </div>

        <div class="px-6 pb-5">
          <button
            @click="$emit('close')"
            class="w-full py-2.5 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-sky-500 text-white font-semibold rounded-xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(217,70,239,0.35)] active:scale-[0.98]"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes dialog-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-dialog-in {
  animation: dialog-in 0.25s ease-out;
}
</style>
