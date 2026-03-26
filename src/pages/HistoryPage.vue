<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Trash2, BookOpen } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'

const router = useRouter()
const userStore = useUserStore()

// History is already stored newest-first (unshift in store)
const history = computed(() => userStore.history)

const showConfirmClear = ref(false)

function goToReading(comicId: string) {
  router.push(`/comic/${comicId}`)
}

function removeEntry(comicId: string) {
  userStore.removeHistory(comicId)
}

function clearAll() {
  userStore.clearHistory()
  showConfirmClear.value = false
}
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-xl font-bold text-foreground">阅读历史</h1>
        <button
          v-if="history.length > 0"
          class="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 cursor-pointer transition-colors duration-200 min-h-[44px] px-2"
          @click="showConfirmClear = true"
        >
          <Trash2 class="w-4 h-4" />
          清空全部
        </button>
      </div>

      <!-- Confirm Clear Dialog -->
      <div
        v-if="showConfirmClear"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showConfirmClear = false"
      >
        <div class="bg-card border border-border rounded-3xl p-6 mx-4 w-full max-w-sm space-y-4 shadow-2xl">
          <p class="text-base font-bold text-foreground">确认清空历史记录？</p>
          <p class="text-sm text-muted-foreground">此操作不可撤销，所有阅读历史将被删除。</p>
          <div class="flex gap-3">
            <button
              class="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors duration-200"
              @click="showConfirmClear = false"
            >
              取消
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200"
              @click="clearAll"
            >
              确认清空
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="history.length === 0" class="py-20 flex flex-col items-center gap-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen class="w-8 h-8 text-muted-foreground" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-foreground">暂无阅读记录</p>
          <p class="text-xs text-muted-foreground">开始阅读漫画后会在这里显示</p>
        </div>
      </div>

      <!-- History List -->
      <div v-else class="space-y-3">
        <div
          v-for="entry in history"
          :key="entry.comicId"
          class="group flex gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-200 card-glow min-w-0"
        >
          <!-- Cover (clickable) -->
          <button
            class="shrink-0 w-16 rounded-lg overflow-hidden bg-muted cursor-pointer min-h-[44px]"
            style="height: 88px;"
            @click="goToReading(entry.comicId)"
            :aria-label="`查看 ${entry.comicTitle}`"
          >
            <img
              :src="entry.cover"
              :alt="entry.comicTitle"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </button>

          <!-- Info -->
          <div
            class="flex-1 min-w-0 flex flex-col justify-between py-0.5 cursor-pointer"
            @click="goToReading(entry.comicId)"
          >
            <div class="space-y-0.5 min-w-0">
              <p class="text-sm font-semibold text-foreground line-clamp-2 leading-snug break-words">{{ entry.comicTitle }}</p>
              <p class="text-xs text-primary truncate">{{ entry.chapterTitle }}</p>
            </div>
          </div>

          <!-- Delete button -->
          <button
            class="shrink-0 flex items-center justify-center w-10 h-10 self-center rounded-full text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100 min-w-[44px] min-h-[44px]"
            @click.stop="removeEntry(entry.comicId)"
            :aria-label="`删除 ${entry.comicTitle} 的阅读记录`"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
