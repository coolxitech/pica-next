import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/user'
import { useComicStore } from '@/store/comics'
import type { Comic, PageResult, TagFilter } from '@/types/index'

type FetchFn = (page: number) => Promise<PageResult<Comic>>

function applyTagFilter(comics: Comic[], filter: TagFilter): Comic[] {
  if (filter.blacklist.length === 0) return comics
  return comics.filter(c => {
    const fields = [...c.categories, ...c.tags]
    return !fields.some(field =>
      filter.blacklist.some(word =>
        field.toLowerCase().includes(word.toLowerCase()) ||
        word.toLowerCase().includes(field.toLowerCase())
      )
    )
  })
}

export function useComicList(fetchFn: FetchFn, cacheKey?: string | (() => string)) {
  const userStore = useUserStore()
  const comicStore = useComicStore()
  const { tagFilter } = storeToRefs(userStore)

  function resolveKey() {
    return typeof cacheKey === 'function' ? cacheKey() : cacheKey
  }

  // 尝试从 store 恢复缓存
  const cached = resolveKey() ? comicStore.getListCache(resolveKey()!) : null

  const rawItems = ref<Comic[]>(cached?.docs ?? [])
  const currentPage = ref(cached?.page ?? 1)
  const totalItems = ref(cached?.total ?? 0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = computed(() => rawItems.value.length < totalItems.value)

  const items = computed(() => applyTagFilter(rawItems.value, tagFilter.value))

  function saveCache() {
    const key = resolveKey()
    if (key) {
      comicStore.setListCache(key, {
        docs: rawItems.value,
        total: totalItems.value,
        page: currentPage.value,
      })
    }
  }

  async function loadPage(page: number) {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchFn(page)
      if (page === 1) {
        rawItems.value = result.docs
      } else {
        rawItems.value.push(...result.docs)
      }
      totalItems.value = result.total
      currentPage.value = page
      saveCache()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || isLoading.value) return
    await loadPage(currentPage.value + 1)
  }

  async function jumpToPage(page: number) {
    const key = resolveKey()
    if (key) comicStore.clearListCache(key)
    rawItems.value = []
    totalItems.value = 0
    currentPage.value = 1
    await loadPage(page)
  }

  async function reload() {
    const key = resolveKey()
    if (key) comicStore.clearListCache(key)
    rawItems.value = []
    totalItems.value = 0
    currentPage.value = 1
    await loadPage(1)
  }

  return { items, rawItems, isLoading, error, hasMore, currentPage, totalItems, loadPage, loadMore, reload, jumpToPage }
}
