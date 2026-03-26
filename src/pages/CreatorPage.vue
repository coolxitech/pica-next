<script setup lang="ts">
import { computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
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

const creatorId = computed(() => route.params.id as string)
const creatorName = computed(() => route.query.name as string || creatorId.value)
const layout = computed(() => userStore.comicListLayout)

const { items, isLoading, error, hasMore, loadPage, loadMore, reload } = useComicList(
  (page: number) => comicStore.fetchComicsByCreator(creatorId.value, page)
)

const { target: scrollTarget } = useInfiniteScroll(async () => {
  if (hasMore.value && !isLoading.value) await loadMore()
})

watch([items, isLoading], async () => {
  if (!hasMore.value || isLoading.value) return
  await nextTick()
  if (!scrollTarget.value) return
  const rect = scrollTarget.value.getBoundingClientRect()
  if (rect.top <= window.innerHeight + 200) await loadMore()
})

onMounted(() => loadPage(1))
watch(creatorId, () => reload())
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <!-- Back bar -->
    <div class="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 h-14 flex items-center gap-3">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-accent cursor-pointer transition-colors duration-200"
        aria-label="返回"
        @click="router.back()"
      >
        <ArrowLeft class="w-5 h-5 text-foreground" />
      </button>
      <span class="text-base font-bold text-foreground truncate flex-1">{{ creatorName }} 的作品</span>
        <ComicListLayoutToggle />
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6 space-y-5">
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
          <ComicCard v-else v-for="comic in items" :key="comic._id" :comic="comic" />
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <template v-if="isLoading && items.length === 0">
            <div v-for="i in 8" :key="i" class="h-24 bg-muted animate-pulse rounded-2xl" />
          </template>
          <ComicListItem v-else v-for="comic in items" :key="comic._id" :comic="comic" />
        </div>

        <!-- Infinite scroll sentinel -->
        <div v-if="items.length > 0" :ref="(el) => { scrollTarget = el as HTMLElement | null }" class="py-8">
          <div v-if="isLoading" class="flex justify-center">
            <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p v-else-if="!hasMore" class="text-center text-sm text-muted-foreground">已加载全部内容</p>
        </div>

        <div v-if="!isLoading && items.length === 0" class="py-16 text-center">
          <p class="text-muted-foreground">暂无作品</p>
        </div>
      </div>
    </div>
  </div>
</template>
