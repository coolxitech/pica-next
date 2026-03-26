<script setup lang="ts">
defineOptions({ name: 'ComicListPage' })
import { computed, onMounted, onActivated, onDeactivated, watch, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComicStore } from '@/stores/comic.store'
import { useUserStore } from '@/stores/user.store'
import { useComicList } from '@/composables/useComicList'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import ComicCard from '@/components/comic/ComicCard.vue'
import ComicListItem from '@/components/comic/ComicListItem.vue'
import ComicListLayoutToggle from '@/components/comic/ComicListLayoutToggle.vue'
import SkeletonCard from '@/components/feedback/SkeletonCard.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'

const route = useRoute()
const router = useRouter()
const comicStore = useComicStore()
const userStore = useUserStore()

const tag = computed(() => route.params.tag as string)
const layout = computed(() => userStore.comicListLayout)

const { items, rawItems, isLoading, error, hasMore, loadPage, loadMore, reload, jumpToPage, currentPage, totalItems } = useComicList(
  (page: number) => comicStore.fetchComicsByTag(tag.value, page),
  () => `tag:${tag.value}`
)

const totalPages = computed(() => totalItems.value > 0 ? Math.ceil(totalItems.value / 20) : 0)
const jumpInput = ref('')

function handleJump() {
  const p = parseInt(jumpInput.value)
  if (!p || p < 1 || p > totalPages.value) return
  jumpInput.value = ''
  jumpToPage(p)
}

const { target: scrollTarget } = useInfiniteScroll(async () => {
  if (hasMore.value && !isLoading.value) await loadMore()
})

// 过滤后内容可能不足以触发滚动，自动补加载
watch([items, isLoading], async () => {
  if (!hasMore.value || isLoading.value) return
  await nextTick()
  if (!scrollTarget.value) return
  const rect = scrollTarget.value.getBoundingClientRect()
  if (rect.top <= window.innerHeight + 200) {
    await loadMore()
  }
})

function goToComic(comicId: string) {
  router.push(`/comic/${comicId}`)
}

onMounted(() => {
  if (rawItems.value.length === 0) loadPage(1)
})

const savedScrollY = ref(0)
onDeactivated(() => { savedScrollY.value = window.scrollY })
onActivated(() => { window.scrollTo({ top: savedScrollY.value, behavior: 'instant' }) })

watch(tag, () => { reload() })
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-xl font-bold text-foreground truncate min-w-0">{{ tag }}</h1>
        <div class="flex items-center gap-2 shrink-0">
          <!-- 跳页 -->
          <div v-if="totalPages > 1" class="flex items-center gap-1.5">
            <span class="text-xs text-muted-foreground hidden sm:inline">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <input
              v-model="jumpInput"
              type="number"
              :min="1"
              :max="totalPages"
              placeholder="跳页"
              class="w-16 h-8 px-2 text-xs rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              @keydown.enter="handleJump"
            />
            <button
              class="h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
              :disabled="isLoading"
              @click="handleJump"
            >
              GO
            </button>
          </div>
        <ComicListLayoutToggle />
        </div>
      </div>

        <ErrorState v-if="error && items.length === 0" :message="error" @retry="reload" />

      <div v-else>
        <!-- Grid -->
        <div
          v-if="layout === 'grid'"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          <template v-if="isLoading && items.length === 0">
            <SkeletonCard v-for="i in 12" :key="i" />
          </template>
          <template v-else>
            <ComicCard
              v-for="comic in items"
              :key="comic._id"
              :comic="comic"
              @click.prevent="goToComic(comic._id)"
            />
          </template>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <template v-if="isLoading && items.length === 0">
            <div v-for="i in 8" :key="i" class="h-24 bg-muted animate-pulse rounded-2xl" />
          </template>
          <template v-else>
            <ComicListItem
              v-for="comic in items"
              :key="comic._id"
              :comic="comic"
              @click.prevent="goToComic(comic._id)"
            />
          </template>
        </div>

        <!-- Infinite scroll sentinel -->
        <div v-if="items.length > 0" :ref="(el) => { scrollTarget = el as HTMLElement | null }" class="py-8">
          <div v-if="isLoading" class="flex justify-center">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p v-else-if="!hasMore" class="text-center text-sm text-muted-foreground">已加载全部内容</p>
        </div>

        <div v-if="!isLoading && items.length === 0" class="py-16 text-center">
          <p class="text-muted-foreground">暂无漫画</p>
        </div>
      </div>
    </div>
  </div>
</template>
