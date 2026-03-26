<script setup lang="ts">
import { AlertCircle, RefreshCw } from 'lucide-vue-next'

withDefaults(defineProps<{
  message?: string
}>(), {
  message: '加载失败，请稍后重试',
})

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
    <div class="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
      <AlertCircle class="w-7 h-7 text-destructive" />
    </div>
    <p class="text-sm text-muted-foreground max-w-xs">{{ message }}</p>
    <button
      class="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-200 shadow-sm shadow-primary/25"
      @click="emit('retry')"
    >
      <RefreshCw class="w-4 h-4" />
      重新加载
    </button>
  </div>
</template>
