import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import type { HistoryEntry } from '@/types/index'

const SAVE_INTERVAL_MS = 30_000

interface ReadingContext {
  comicId: string
  comicTitle: string
  cover: string
  chapterId: string
  chapterTitle: string
}

export function useReadingProgress(context: ReadingContext) {
  const userStore = useUserStore()
  const currentPage = ref(1)

  let timer: ReturnType<typeof setInterval> | null = null

  function saveProgress() {
    if (!userStore.token) return

    const entry: HistoryEntry = {
      comicId: context.comicId,
      comicTitle: context.comicTitle,
      cover: context.cover,
      chapterId: context.chapterId,
      chapterTitle: context.chapterTitle,
      page: currentPage.value,
      readAt: Date.now(),
    }
    userStore.addHistory(entry)
  }

  onMounted(() => {
    // Save immediately on mount, then every 30s
    saveProgress()
    timer = setInterval(saveProgress, SAVE_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    // Final save on unmount
    saveProgress()
  })

  return { currentPage, saveProgress }
}
