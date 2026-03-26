<script setup lang="ts">
defineOptions({ name: 'HomePage' })
import { ref, onMounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useComicStore } from '@/store/comics'
import type { Category } from '@/types'
import TagBadge from '@/components/TagBadge.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import { buildCategoryImageUrl } from '@/utils/imageServer'

const router = useRouter()
const comicStore = useComicStore()

const categoriesLoading = ref(false)
const categoriesError = ref<string | null>(null)
const hotKeywordsLoading = ref(false)

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = null
  try {
    await comicStore.fetchCategories()
  } catch (e: unknown) {
    categoriesError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    categoriesLoading.value = false
  }
}

async function loadHotKeywords() {
  hotKeywordsLoading.value = true
  try {
    await comicStore.fetchHotKeywords()
  } catch {
    // Silently fail
  } finally {
    hotKeywordsLoading.value = false
  }
}

function goToCategory(tag: string) {
  router.push(`/category/${encodeURIComponent(tag)}`)
}

function goToKeyword(keyword: string) {
  router.push({ path: '/search', query: { q: keyword } })
}

function onCategoryImageError(event: Event, category: Category) {
  const img = event.target as HTMLImageElement | null
  const path = category.thumb?.path
  const fileServer = category.thumb?.fileServer
  if (!img || !path || !fileServer) return

  if (img.dataset.categoryFallbackApplied === '1') return
  img.dataset.categoryFallbackApplied = '1'

  const base = fileServer.replace(/\/$/, '')
  const normalizedPath = path.replace(/^\/+/, '')
  img.src = `${base}/static/${normalizedPath}`
}

onMounted(() => {
  if (comicStore.categories.length === 0) loadCategories()
  if (comicStore.hotKeywords.length === 0) loadHotKeywords()
})

const savedScrollY = ref(0)
onDeactivated(() => { savedScrollY.value = window.scrollY })
onActivated(() => { nextTick(() => window.scrollTo({ top: savedScrollY.value, behavior: 'instant' })) })
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-7xl mx-auto px-4 py-6 space-y-8">

      <!-- Hot Keywords Section -->
      <section v-if="!hotKeywordsLoading && comicStore.hotKeywords.length > 0" class="space-y-3 animate-fade-up">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-widest">热门关键词</h2>
        <div class="flex flex-wrap gap-2">
          <TagBadge
            v-for="keyword in comicStore.hotKeywords"
            :key="keyword"
            :tag="keyword"
            @click.prevent="goToKeyword(keyword)"
          />
        </div>
      </section>

      <!-- Hot Keywords Skeleton -->
      <section v-if="hotKeywordsLoading" class="space-y-3">
        <div class="h-4 w-24 bg-muted animate-pulse rounded-lg" />
        <div class="flex flex-wrap gap-2">
          <div
            v-for="i in 8"
            :key="i"
            class="h-7 bg-muted animate-pulse rounded-full"
            :style="{ width: `${60 + (i * 13) % 50}px` }"
          />
        </div>
      </section>

      <!-- Categories Section -->
      <section class="space-y-4">
        <h2 class="text-sm font-bold text-muted-foreground uppercase tracking-widest">分类浏览</h2>

        <ErrorRetry v-if="categoriesError" :message="categoriesError" @retry="loadCategories" />

        <!-- Loading -->
        <div v-else-if="categoriesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          <SkeletonCard v-for="i in 10" :key="i" />
        </div>

        <!-- Categories Grid -->
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 stagger-fast">
          <div
            v-for="category in comicStore.categories"
            :key="category._id"
            class="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-200 card-glow min-w-0"
            @click="goToCategory(category.title)"
          >
            <!-- Cover -->
            <div class="relative aspect-[3/4] overflow-hidden bg-muted">
              <img
                v-if="category.thumb?.path"
                :src="buildCategoryImageUrl(category.thumb.fileServer, category.thumb.path)"
                :alt="category.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                @error="onCategoryImageError($event, category)"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-4xl font-black text-primary/30 bg-gradient-to-br from-primary/5 to-primary/15"
              >
                {{ category.title.charAt(0) }}
              </div>
              <!-- Hover overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <!-- Info -->
            <div class="p-2.5 min-w-0">
              <p class="text-sm font-semibold text-foreground truncate">{{ category.title }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
