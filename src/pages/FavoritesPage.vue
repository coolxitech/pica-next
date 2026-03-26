<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user.store'
import { getFavourites } from '@/api/user.api'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import ComicCard from '@/components/comic/ComicCard.vue'
import ComicListItem from '@/components/comic/ComicListItem.vue'
import ComicListLayoutToggle from '@/components/comic/ComicListLayoutToggle.vue'
import SkeletonCard from '@/components/feedback/SkeletonCard.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { Heart } from 'lucide-vue-next'
import type { Comic } from '@/types/comic'

const userStore = useUserStore()
const layout = computed(() => userStore.comicListLayout)

const comics = ref<Comic[]>([])
const page = ref(1)
const totalPages = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)

// 排序选项
const sortOptions = [
  { label: '最新收藏', value: 'dd' },
  { label: '最早收藏', value: 'da' },
  { label: '最多点赞', value: 'ld' },
  { label: '最多浏览', value: 'vd' },
] as const
type SortValue = typeof sortOptions[number]['value']
const sort = ref<SortValue>('dd')

function pickComicFromFavouriteItem(item: unknown): Comic | null {
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const candidate = (record._comic ?? record.comic ?? item) as Record<string, unknown>
  if (!candidate || typeof candidate !== 'object') return null
  if (typeof candidate._id !== 'string') return null
  if (!candidate.thumb || typeof candidate.thumb !== 'object') return null
  return candidate as unknown as Comic
}

function normalizeFavouriteDocs(docs: unknown[]): Comic[] {
  return docs
    .map((item) => pickComicFromFavouriteItem(item))
    .filter((item): item is Comic => !!item)
}

async function loadPage(p: number) {
  isLoading.value = true
  error.value = null
  try {
    const res = await getFavourites({ page: p, s: sort.value, limit: 20 })
    const data = res.data.comics
    totalPages.value = data.pages
    const normalizedDocs = normalizeFavouriteDocs((data.docs as unknown[]) ?? [])
    if (p === 1) {
      comics.value = normalizedDocs
    } else {
      comics.value.push(...normalizedDocs)
    }
    page.value = p
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '加载收藏失败'
  } finally {
    isLoading.value = false
  }
}

const hasMore = computed(() => page.value < totalPages.value)

const { target: scrollTarget } = useInfiniteScroll(async () => {
  if (hasMore.value && !isLoading.value) {
    await loadPage(page.value + 1)
  }
})

// 切换排序时重置
watch(sort, () => {
  comics.value = []
  loadPage(1)
})

onMounted(() => loadPage(1))
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-xl font-bold text-foreground">我的收藏</h1>
        <div class="flex items-center gap-2">
          <!-- 排序 -->
          <select
            v-model="sort"
            class="text-xs bg-muted text-foreground border border-border rounded-xl px-3 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        <ComicListLayoutToggle />
        </div>
      </div>

      <!-- Error -->
        <ErrorState v-if="error" :message="error" @retry="() => loadPage(1)" />

      <!-- Content -->
      <div v-else>
        <!-- Grid Layout -->
        <div
          v-if="layout === 'grid'"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          <template v-if="isLoading && comics.length === 0">
            <SkeletonCard v-for="i in 12" :key="i" />
          </template>
          <ComicCard v-for="comic in comics" :key="comic._id" :comic="comic" />
        </div>

        <!-- List Layout -->
        <div v-else class="space-y-3">
          <template v-if="isLoading && comics.length === 0">
            <div v-for="i in 8" :key="i" class="h-24 bg-muted animate-pulse rounded-2xl" />
          </template>
          <ComicListItem v-for="comic in comics" :key="comic._id" :comic="comic" />
        </div>

        <!-- Infinite scroll sentinel -->
        <div :ref="(el) => { scrollTarget = el as HTMLElement | null }" class="py-8 flex justify-center">
          <div v-if="isLoading && comics.length > 0" class="flex gap-1.5">
            <span v-for="i in 3" :key="i" class="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" :style="{ animationDelay: `${i * 100}ms` }" />
          </div>
          <p v-else-if="!hasMore && comics.length > 0" class="text-sm text-muted-foreground">已加载全部收藏</p>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && comics.length === 0" class="py-20 flex flex-col items-center gap-4 text-center">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Heart class="w-8 h-8 text-muted-foreground" />
          </div>
          <div class="space-y-1">
            <p class="text-sm font-semibold text-foreground">暂无收藏</p>
            <p class="text-xs text-muted-foreground">快去收藏喜欢的漫画吧</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
