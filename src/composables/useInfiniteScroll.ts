import { ref, onUnmounted, onDeactivated, onActivated, watch } from 'vue'

export function useInfiniteScroll(onLoadMore: () => Promise<void>, options?: IntersectionObserverInit) {
  const target = ref<HTMLElement | null>(null)
  const isLoading = ref(false)

  let observer: IntersectionObserver | null = null

  async function handleIntersect(entries: IntersectionObserverEntry[]) {
    const entry = entries[0]
    if (!entry.isIntersecting || isLoading.value) return

    isLoading.value = true
    try {
      await onLoadMore()
    } finally {
      isLoading.value = false
    }
  }

  function setupObserver(el: HTMLElement) {
    observer?.disconnect()
    observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '100px',
      threshold: 0,
      ...options,
    })
    observer.observe(el)
  }

  // Watch for target element being set (e.g. via template ref)
  watch(target, (el) => {
    if (el) {
      setupObserver(el)
    } else {
      observer?.disconnect()
    }
  })

  // keep-alive: 离开时暂停，回来时恢复（延迟一帧，等滚动位置恢复后再观察）
  onDeactivated(() => { observer?.disconnect() })
  onActivated(() => {
    if (target.value) {
      requestAnimationFrame(() => setupObserver(target.value!))
    }
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { target, isLoading }
}
