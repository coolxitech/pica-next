<script setup lang="ts">
import { ref } from 'vue'
import { Sun, Moon, Monitor, Check } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'
import { applyThemeColor, applyColorMode } from '@/utils/theme'

const userStore = useUserStore()

const PRESET_COLORS = [
  { hex: '#DB2777', label: '哔咔粉' },
  { hex: '#6366F1', label: '靛蓝' },
  { hex: '#10B981', label: '翠绿' },
  { hex: '#F59E0B', label: '琥珀' },
  { hex: '#EF4444', label: '朱红' },
  { hex: '#8B5CF6', label: '紫罗兰' },
  { hex: '#0EA5E9', label: '天蓝' },
  { hex: '#F97316', label: '橙色' },
]

const colorMode = ref(userStore.appearance.colorMode)
const themeColor = ref(userStore.appearance.themeColor)

const colorModes = [
  { value: 'light' as const, label: '亮色', icon: Sun },
  { value: 'dark' as const, label: '暗色', icon: Moon },
  { value: 'system' as const, label: '跟随系统', icon: Monitor },
]

function selectColorMode(mode: 'light' | 'dark' | 'system') {
  colorMode.value = mode
  applyColorMode(mode)
  userStore.saveAppearance({ colorMode: mode, themeColor: themeColor.value })
}

function selectThemeColor(hex: string) {
  themeColor.value = hex
  applyThemeColor(hex)
  userStore.saveAppearance({ colorMode: colorMode.value, themeColor: hex })
}
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-8 animate-fade-up">
      <h1 class="text-xl font-bold text-foreground">设置</h1>

      <section class="space-y-4">
        <h2 class="text-xs font-bold text-muted-foreground uppercase tracking-widest">外观</h2>

        <div class="rounded-3xl bg-card border border-border p-5 space-y-6">
          <!-- Color Mode -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground">色彩模式</p>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="mode in colorModes"
                :key="mode.value"
                class="flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200"
                :class="colorMode === mode.value
                  ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent'"
                @click="selectColorMode(mode.value)"
              >
                <component :is="mode.icon" class="w-5 h-5" />
                <span class="text-xs font-semibold">{{ mode.label }}</span>
              </button>
            </div>
          </div>

          <!-- Theme Color -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground">主题色</p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="color in PRESET_COLORS"
                :key="color.hex"
                class="relative w-10 h-10 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary shadow-sm"
                :style="{ backgroundColor: color.hex }"
                :class="themeColor === color.hex ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : ''"
                :style-ring="{ '--tw-ring-color': color.hex }"
                :aria-label="color.label"
                @click="selectThemeColor(color.hex)"
              >
                <Check
                  v-if="themeColor === color.hex"
                  class="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-sm"
                />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
