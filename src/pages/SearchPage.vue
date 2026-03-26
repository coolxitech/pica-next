<script setup lang="ts">
defineOptions({ name: 'SearchPage' })
import { computed, watch, onMounted, onActivated, onDeactivated, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Clock, Trash2 } from 'lucide-vue-next'
import { useComicStore } from '@/store/comics'
import { useUserStore } from '@/store/user'
import { useComicList } from '@/composables/useComicList'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useSearchHistory } from '@/composables/useSearchHistory'
import ComicCard from '@/components/ComicCard.vue'
import ComicListItem from '@/components/ComicListItem.vue'
import LayoutToggle from '@/components/LayoutToggle.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'

const route = useRoute()
const router = useRouter()
const comicStore = useComicStore()
const userStore = useUserStore()
const { history, add: addHistory, clear: clearHistory } = useSearchHistory()

const keyword = computed(() => (route.query.q as string) ?? '')
const hasQuery = computed(() => keyword.value.trim().length > 0)
const layout = computed(() => userStore.comicListLayout)
const tagFilter = computed(() => userStore.tagFilter)

// 移动端搜索框本地状态
const inputVal = ref(keyword.value)
watch(keyword, (v) => { inputVal.value = v })

function submitSearch() {
  const q = inputVal.value.trim()
  if (!q) return
  addHistory(q)
  router.push({ path: '/search', query: { q } })
}

const { items, rawItems, isLoading, error, hasMore, loadMore, reload, jumpToPage, currentPage, totalItems } = useComicList(
  (page: number) => comicStore.searchComics(
    keyword.value,
    tagFilter.value.mode === 'whitelist' ? tagFilter.value.whitelist : [],
    page,
  ),
  () => `search:${keyword.value}`
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

async function doSearch() {
  if (!hasQuery.value) return
  if (rawItems.value.length > 0) return  // 有缓存，跳过
  await reload()
}

const isActive = ref(true)
const lastActiveKeyword = ref(keyword.value)

watch(keyword, async (val, oldVal) => {
  if (!isActive.value) return
  if (val.trim() && val !== oldVal) {
    await reload()
  }
})

function goSearch(q: string) {
  addHistory(q)
  router.push({ path: '/search', query: { q } })
}

onMounted(() => { if (hasQuery.value && rawItems.value.length === 0) doSearch() })

const savedScrollY = ref(0)
onDeactivated(() => {
  isActive.value = false
  savedScrollY.value = window.scrollY
})
onActivated(async () => {
  isActive.value = true
  if (hasQuery.value && keyword.value !== lastActiveKeyword.value) {
    await reload()
  }
  lastActiveKeyword.value = keyword.value
  window.scrollTo({ top: savedScrollY.value, behavior: 'instant' })
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-7xl mx-auto px-4 py-6 space-y-4">

      <!-- 移动端搜索框 -->
      <div class="md:hidden flex items-center gap-2 bg-muted/60 rounded-xl px-3 h-10 border border-border focus-within:border-primary focus-within:bg-background focus-within:shadow-sm transition-all duration-200">
        <Search class="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          v-model="inputVal"
          type="text"
          placeholder="搜索漫画..."
          class="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground min-w-0"
          @keydown.enter="submitSearch"
        />
        <button
          v-if="inputVal"
          class="text-xs font-semibold text-primary cursor-pointer px-1"
          @click="submitSearch"
        >
          搜索
        </button>
      </div>

      <!-- History View -->
      <template v-if="!hasQuery">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-widest">搜索历史</h2>
            <button
              v-if="history.length > 0"
              class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-destructive/5"
              @click="clearHistory"
            >
              <Trash2 class="w-3.5 h-3.5" />
              清除全部
            </button>
          </div>

          <div v-if="history.length > 0" class="flex flex-wrap gap-2 stagger-children">
            <button
              v-for="kw in history"
              :key="kw"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary text-sm text-foreground cursor-pointer transition-all duration-200 border border-border hover:border-primary/30"
              @click="goSearch(kw)"
            >
              <Clock class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {{ kw }}
            </button>
          </div>

          <div v-else class="py-20 flex flex-col items-center gap-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Search class="w-8 h-8 text-muted-foreground" />
            </div>
            <div class="space-y-1">
              <p class="text-sm font-semibold text-foreground">暂无搜索历史</p>
              <p class="text-xs text-muted-foreground">在顶部搜索框输入关键词开始搜索</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Search Results -->
      <template v-else>
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h1 class="text-base font-bold text-foreground truncate">"{{ keyword }}"</h1>
            <p v-if="!isLoading && !error && items.length > 0" class="text-xs text-muted-foreground mt-0.5">
              找到相关漫画
            </p>
          </div>
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
            <LayoutToggle />
          </div>
        </div>

        <ErrorRetry v-if="error && items.length === 0" :message="`搜索时出错，请重试`" @retry="doSearch" />

        <div v-if="!error || items.length > 0">
          <div
            v-if="layout === 'grid'"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            <template v-if="isLoading && items.length === 0">
              <SkeletonCard v-for="i in 12" :key="i" />
            </template>
            <template v-else>
              <ComicCard v-for="comic in items" :key="comic._id" :comic="comic" />
            </template>
          </div>

          <div v-else class="space-y-3">
            <template v-if="isLoading && items.length === 0">
              <div v-for="i in 8" :key="i" class="h-24 bg-muted animate-pulse rounded-2xl" />
            </template>
            <template v-else>
              <ComicListItem v-for="comic in items" :key="comic._id" :comic="comic" />
            </template>
          </div>

          <div v-if="items.length > 0" :ref="(el) => { scrollTarget = el as HTMLElement | null }" class="py-8">
            <div v-if="isLoading" class="flex justify-center">
              <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p v-else-if="!hasMore" class="text-center text-sm text-muted-foreground">已加载全部内容</p>
          </div>

          <div v-if="!isLoading && items.length === 0 && !error" class="py-20 flex flex-col items-center gap-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Search class="w-8 h-8 text-muted-foreground" />
            </div>
            <div class="space-y-1">
              <p class="text-base font-bold text-foreground">未找到相关漫画</p>
              <p class="text-sm text-muted-foreground">
                没有找到与 "<span class="text-foreground font-semibold">{{ keyword }}</span>" 相关的结果
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
