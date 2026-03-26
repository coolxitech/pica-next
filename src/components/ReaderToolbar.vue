<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Settings } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  currentPage: number
  totalPages: number
  visible?: boolean
}>()

const emit = defineEmits<{
  openSettings: []
}>()

const router = useRouter()
</script>

<template>
  <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
    <Transition name="toolbar">
      <div
        v-if="props.visible !== false"
        class="pointer-events-auto flex items-center gap-2 px-3 h-14 bg-black/80 backdrop-blur-xl border-b border-white/10"
      >
      <button
        class="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors duration-200 shrink-0"
        @click="router.back()"
        aria-label="返回"
      >
        <ArrowLeft class="w-5 h-5 text-white" />
      </button>

      <p class="flex-1 text-sm font-semibold text-white truncate">{{ title }}</p>

      <span class="text-xs text-white/60 font-medium shrink-0 bg-white/10 px-2.5 py-1 rounded-full">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        class="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors duration-200 shrink-0"
        @click="emit('openSettings')"
        aria-label="设置"
      >
        <Settings class="w-5 h-5 text-white" />
      </button>
    </div>
    </Transition>
  </div>
</template>

<style scoped>
.toolbar-enter-active,
.toolbar-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toolbar-enter-from,
.toolbar-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
