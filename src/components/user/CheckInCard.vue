<script setup lang="ts">
import { computed } from 'vue'
import { CalendarCheck, CalendarX, Zap, Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'

const emit = defineEmits<{
  checkIn: []
}>()

const userStore = useUserStore()
const props = withDefaults(defineProps<{ loading?: boolean }>(), {
  loading: false,
})

const checkedInToday = computed(() => userStore.userInfo?.isPunched ?? false)
const exp = computed(() => userStore.userInfo?.exp ?? userStore.exp)
const level = computed(() => userStore.userInfo?.level ?? userStore.expLevel)
</script>

<template>
  <div class="rounded-3xl bg-card border border-border p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <component
          :is="checkedInToday ? CalendarCheck : CalendarX"
          class="w-5 h-5"
          :class="checkedInToday ? 'text-primary' : 'text-muted-foreground'"
        />
        <span class="text-sm font-bold text-foreground">每日签到</span>
      </div>
      <span
        class="text-xs px-2.5 py-1 rounded-full font-semibold"
        :class="checkedInToday ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
      >
        {{ checkedInToday ? '已签到' : '未签到' }}
      </span>
    </div>

    <div class="flex items-center gap-5">
      <div class="flex items-center gap-1.5">
        <Zap class="w-4 h-4 text-yellow-500" />
        <span class="text-xs text-muted-foreground">Lv.{{ level }}</span>
        <span class="text-xs font-bold text-foreground">{{ exp }} EXP</span>
      </div>
    </div>

    <button
      class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-200"
      :class="checkedInToday || props.loading
        ? 'bg-muted text-muted-foreground cursor-not-allowed'
        : 'gradient-primary text-white cursor-pointer hover:opacity-90 active:scale-[0.98] shadow-md shadow-primary/25'"
      :disabled="checkedInToday || props.loading"
      @click="!checkedInToday && !props.loading && emit('checkIn')"
    >
      <Loader2 v-if="props.loading" class="w-4 h-4 animate-spin" />
      <CalendarCheck v-else class="w-4 h-4" />
      {{ props.loading ? '签到中...' : (checkedInToday ? '今日已签到' : '立即签到') }}
    </button>
  </div>
</template>
