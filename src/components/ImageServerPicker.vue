<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw, Wifi, WifiOff, Check } from 'lucide-vue-next'
import {
  ALL_SERVERS,
  getPreferredServer,
  setPreferredServer,
  testServer,
  retestServer,
} from '@/utils/imageServer'

interface Row {
  url: string
  label: string
  latency: number | null  // null=未测, -1=不可用
  testing: boolean
}

const rows = ref<Row[]>(
  ALL_SERVERS.map(s => ({ ...s, latency: null, testing: false }))
)
const selected = ref<string | null>(getPreferredServer())
const testingAll = ref(false)

function select(url: string) {
  if (!url || selected.value === url) {
    selected.value = null
    setPreferredServer(null)
  } else {
    selected.value = url
    setPreferredServer(url)
  }
}

async function testOne(row: Row, force = false) {
  row.testing = true
  row.latency = force ? null : row.latency
  const latency = force ? await retestServer(row.url) : await testServer(row.url)
  row.latency = latency
  row.testing = false
}

async function testAll() {
  testingAll.value = true
  await Promise.all(rows.value.map(r => testOne(r, true)))
  testingAll.value = false
}

onMounted(() => {
  // 首次进入页面自动测试一次
  rows.value.forEach(r => testOne(r))
})

function latencyColor(latency: number | null) {
  if (latency === null) return 'text-muted-foreground'
  if (latency < 0)   return 'text-destructive'
  if (latency < 300) return 'text-emerald-500'
  if (latency < 800) return 'text-amber-500'
  return 'text-orange-500'
}

function latencyText(latency: number | null) {
  if (latency === null) return '—'
  if (latency < 0)     return '不可用'
  return `${latency} ms`
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-foreground">图片服务器</p>
      <button
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        :class="{ 'opacity-50 pointer-events-none': testingAll }"
        @click="testAll"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': testingAll }" />
        全部测速
      </button>
    </div>

    <p class="text-xs text-muted-foreground">
      选择「自动」时，系统会优先使用 API 返回的服务器并在失败时自动切换。手动指定后将始终优先使用该服务器。
    </p>

    <!-- 自动选项 -->
    <button
      class="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer"
      :class="selected === null
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border text-foreground hover:border-primary/40 hover:bg-accent'"
      @click="select('')"
    >
      <div class="flex items-center gap-3">
        <Wifi class="w-4 h-4 shrink-0" />
        <div class="text-left">
          <p class="text-sm font-semibold">自动</p>
          <p class="text-xs text-muted-foreground">跟随 API 返回，失败自动切换</p>
        </div>
      </div>
      <Check v-if="selected === null" class="w-4 h-4 shrink-0" />
    </button>

    <!-- 服务器列表 -->
    <button
      v-for="row in rows"
      :key="row.url"
      class="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer"
      :class="selected === row.url
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/40 hover:bg-accent'"
      @click="select(row.url)"
    >
      <div class="flex items-center gap-3 min-w-0">
        <component
          :is="row.latency !== null && row.latency < 0 ? WifiOff : Wifi"
          class="w-4 h-4 shrink-0"
          :class="selected === row.url ? 'text-primary' : 'text-muted-foreground'"
        />
        <div class="text-left min-w-0">
          <p class="text-sm font-semibold text-foreground truncate">{{ row.label }}</p>
          <p class="text-xs text-muted-foreground truncate">{{ row.url }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 ml-2">
        <!-- 延迟 -->
        <span
          class="text-xs font-mono font-semibold min-w-[52px] text-right"
          :class="latencyColor(row.latency)"
        >
          <span v-if="row.testing" class="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span v-else>{{ latencyText(row.latency) }}</span>
        </span>

        <!-- 重测按钮 -->
        <button
          class="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          :class="{ 'opacity-50 pointer-events-none': row.testing }"
          @click.stop="testOne(row, true)"
          aria-label="重新测速"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': row.testing }" />
        </button>

        <Check v-if="selected === row.url" class="w-4 h-4 text-primary" />
        <div v-else class="w-4" />
      </div>
    </button>
  </div>
</template>
