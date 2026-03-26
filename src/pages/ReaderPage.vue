<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComicStore } from '@/stores/comic.store'
import { useUserStore } from '@/stores/user.store'
import { getComicPages } from '@/api/comic.api'
import type { ComicDetail, ChapterSummary } from '@/types/comic'
import { buildComicImageUrl, handleImageError, warmupServers, getPreferredServer } from '@/utils/image-url'

const route = useRoute()
const router = useRouter()
const comicStore = useComicStore()
const userStore = useUserStore()

const comicId = computed(() => route.params.id as string)
const chapterId = computed(() => route.params.cid as string)

const comic = ref<ComicDetail | null>(null)
const chapters = ref<ChapterSummary[]>([])
const epTitle = ref('')
const currentOrder = ref(1)

// 原始媒体数据，不存 URL，保证切换服务器后 computed 能重新计算
const pageMedias = ref<{ fileServer: string; path: string }[]>([])
const loadedPageSet = ref<Set<number>>(new Set())
const apiPage = ref(1)
const apiTotalPages = ref(1)
const loadingMore = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

// 当前选中的服务器（响应式），用于驱动 computed 重算
const preferredServer = ref<string | null>(getPreferredServer())

// 动态计算图片 URL 列表，preferredServer 变化时自动更新
const pages = computed(() => {
  return pageMedias.value.map(m => buildComicImageUrl(m.fileServer, m.path))
})

// 每张图片已尝试过的服务器集合
const triedServersMap = ref<Map<number, Set<string>>>(new Map())

const coverUrl = computed(() => {
  if (!comic.value?.thumb) return ''
  return buildComicImageUrl(comic.value.thumb.fileServer, comic.value.thumb.path)
})

const sortedChapters = computed(() => [...chapters.value].sort((a, b) => a.order - b.order))
const currentIdx = computed(() => sortedChapters.value.findIndex(c => c._id === chapterId.value))
const hasPrevEp = computed(() => currentIdx.value > 0)
const hasNextEp = computed(() => currentIdx.value < sortedChapters.value.length - 1)

const mode = ref<'scroll' | 'page'>('scroll')
const pageIndex = ref(0)
const scrollPage = ref(1)
const pendingRestorePage = ref<number | null>(null)
const showEpDrawer = ref(false)
const showSettings = ref(false)
const forceResetToFirstPage = ref(false)

/** 从 localStorage 刷新 preferredServer（供设置页切换后调用） */
function refreshPreferred() {
  preferredServer.value = getPreferredServer()
}

function onImgError(event: Event, index: number) {
  const media = pageMedias.value[index]
  if (!media) return
  if (!triedServersMap.value.has(index)) {
    triedServersMap.value.set(index, new Set())
  }
  handleImageError(event, media.path, triedServersMap.value.get(index))
}

function getSavedPage(chapter: ChapterSummary): number {
  const entry = userStore.history.find(
    h => h.comicId === comicId.value && h.chapterId === chapter._id,
  )
  const raw = entry?.page
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1
  return Math.max(1, Math.floor(raw))
}

function getResumePageFromHash(): number | null {
  const raw = route.hash
  if (!raw) return null
  const match = raw.match(/^#?page-anchor-(\d+)/)
  if (!match) return null
  const n = Number(match[1])
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.floor(n)
}

async function ensurePageLoaded(targetPage: number) {
  const safeTarget = Math.max(1, targetPage)
  while (pageMedias.value.length < safeTarget && apiPage.value < apiTotalPages.value) {
    await loadApiPage(currentOrder.value, apiPage.value + 1)
  }
}

function scrollToPage(targetPage: number) {
  const idx = Math.max(0, targetPage - 1)
  const el =
    document.getElementById(`page-anchor-${idx + 1}`)
    ?? document.querySelector<HTMLElement>(`.scroll-page[data-page-index="${idx}"]`)
  if (!el) return false

  const toolbarHeight = 52
  el.scrollIntoView({ block: 'start', behavior: 'auto' })
  window.scrollBy({ top: -(toolbarHeight + 8), behavior: 'auto' })
  return true
}

async function scrollToPageWithRetry(targetPage: number) {
  pendingRestorePage.value = targetPage
  const startAt = Date.now()

  while (Date.now() - startAt < 8000) {
    await nextTick()
    const ok = scrollToPage(targetPage)
    if (ok) {
      const idx = Math.max(0, targetPage - 1)
      const img = document.querySelector<HTMLImageElement>(`.scroll-page[data-page-index="${idx}"] .scroll-img`)
      if (img && img.complete && img.naturalHeight > 0) {
        pendingRestorePage.value = null
        return
      }
      await new Promise(resolve => setTimeout(resolve, 120))
      continue
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  pendingRestorePage.value = null
}

function onScrollImageLoad(index: number) {
  loadedPageSet.value.add(index)
  const pending = pendingRestorePage.value
  if (mode.value !== 'scroll' || !pending) return
  if (index + 1 < pending) return
  window.requestAnimationFrame(() => {
    const ok = scrollToPage(pending)
    if (ok) pendingRestorePage.value = null
  })
}

async function restoreReadingPosition(targetPage: number) {
  await ensurePageLoaded(targetPage)
  const maxPage = Math.max(1, pageMedias.value.length)
  const resolved = Math.min(Math.max(1, targetPage), maxPage)
  pageIndex.value = resolved - 1
  scrollPage.value = resolved

  if (mode.value === 'scroll') {
    await scrollToPageWithRetry(resolved)
  }
}

async function loadChapter() {
  loading.value = true
  error.value = null
  pageMedias.value = []
  loadedPageSet.value = new Set()
  triedServersMap.value = new Map()
  apiPage.value = 1
  apiTotalPages.value = 1
  pageIndex.value = 0
  try {
    const detail = await comicStore.fetchComicDetail(comicId.value)
    comic.value = detail
    chapters.value = detail.chapters
    const requestedChapterId = chapterId.value
    const isValidRequestedId =
      typeof requestedChapterId === 'string'
      && requestedChapterId.length > 0
      && requestedChapterId !== 'undefined'

    let target = isValidRequestedId
      ? detail.chapters.find(c => c._id === requestedChapterId)
      : undefined

    if (!target) {
      const first = [...detail.chapters].sort((a, b) => a.order - b.order).find(c => !!c._id)
      if (!first) throw new Error('章节不存在')
      if (requestedChapterId !== first._id) {
        await router.replace(`/comic/${comicId.value}/chapter/${first._id}`)
        return
      }
      target = first
    }

    currentOrder.value = target.order
    await loadApiPage(target.order, 1)
    if (pageMedias.value.length === 0) {
      throw new Error('当前章节暂无图片数据')
    }
    const resumePageFromHash = getResumePageFromHash()
    const savedPage = forceResetToFirstPage.value
      ? 1
      : (resumePageFromHash ?? getSavedPage(target))
    await restoreReadingPosition(savedPage)
    saveHistory()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '章节加载失败，请重试'
  } finally {
    forceResetToFirstPage.value = false
    loading.value = false
  }
}

function saveHistory() {
  if (!comic.value || !userStore.token) return
  if (mode.value === 'scroll') updateScrollPageFromViewport()
  const target =
    chapters.value.find(c => c._id === chapterId.value)
    ?? chapters.value.find(c => c.order === currentOrder.value)
  if (!target?._id) return
  userStore.addHistory({
    comicId: comicId.value,
    comicTitle: comic.value.title,
    cover: coverUrl.value,
    chapterId: target._id,
    chapterTitle: epTitle.value || target?.title || '',
    page: mode.value === 'page' ? pageIndex.value + 1 : scrollPage.value,
    readAt: Date.now(),
  })
}

function isPageLoaded(index: number) {
  return loadedPageSet.value.has(index)
}

async function loadApiPage(order: number, page: number) {
  if (page > 1) loadingMore.value = true
  try {
    const res = await getComicPages(comicId.value, order, page)
    const { docs, pages: totalPg } = res.data.pages
    apiTotalPages.value = totalPg
    apiPage.value = page
    epTitle.value = res.data.ep?.title ?? ''
    // 预热本批次涉及的服务器
    const servers = [...new Set(docs.map(doc => doc.media.fileServer))]
    warmupServers(servers)
    // 存原始媒体数据，URL 由 computed pages 动态计算
    pageMedias.value.push(...docs.map(doc => ({ fileServer: doc.media.fileServer, path: doc.media.path })))
  } finally {
    loadingMore.value = false
  }
}

const sentinelRef = ref<HTMLElement>()
let observer: IntersectionObserver | null = null
let pageObserver: IntersectionObserver | null = null
let scrollRaf = 0

function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !loadingMore.value && apiPage.value < apiTotalPages.value) {
      loadApiPage(currentOrder.value, apiPage.value + 1)
    }
  }, { threshold: 0.1 })
  nextTick(() => { if (sentinelRef.value) observer!.observe(sentinelRef.value) })
}

function setupPageObserver() {
  pageObserver?.disconnect()
  if (mode.value !== 'scroll') return

  pageObserver = new IntersectionObserver((entries) => {
    let bestIdx = -1
    let bestRatio = 0

    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const idx = Number((entry.target as HTMLElement).dataset.pageIndex)
      if (!Number.isFinite(idx)) continue
      if (entry.intersectionRatio > bestRatio) {
        bestRatio = entry.intersectionRatio
        bestIdx = idx
      }
    }

    if (bestIdx >= 0) {
      scrollPage.value = bestIdx + 1
    }
  }, {
    threshold: [0.25, 0.5, 0.75],
  })

  nextTick(() => {
    document.querySelectorAll<HTMLElement>('.scroll-page').forEach((el) => {
      pageObserver?.observe(el)
    })
  })
}

function updateScrollPageFromViewport() {
  if (mode.value !== 'scroll') return
  const pageBlocks = Array.from(document.querySelectorAll<HTMLElement>('.scroll-page'))
  if (!pageBlocks.length) return

  const targetY = 72
  let bestPage = scrollPage.value
  let bestDist = Number.POSITIVE_INFINITY

  for (const el of pageBlocks) {
    const idx = Number(el.dataset.pageIndex)
    if (!Number.isFinite(idx)) continue
    const rect = el.getBoundingClientRect()
    const dist = Math.abs(rect.top - targetY)
    if (dist < bestDist) {
      bestDist = dist
      bestPage = idx + 1
    }
  }

  if (bestPage !== scrollPage.value) {
    scrollPage.value = bestPage
  }
}

function onScroll() {
  if (scrollRaf) return
  scrollRaf = window.requestAnimationFrame(() => {
    scrollRaf = 0
    updateScrollPageFromViewport()
    scheduleScrollSaveHistory()
  })
}

function goToPrevEp() {
  const prev = sortedChapters.value[currentIdx.value - 1]
  if (prev) {
    forceResetToFirstPage.value = true
    router.replace(`/comic/${comicId.value}/chapter/${prev._id}`)
  }
}
function goToNextEp() {
  const next = sortedChapters.value[currentIdx.value + 1]
  if (next) {
    forceResetToFirstPage.value = true
    router.replace(`/comic/${comicId.value}/chapter/${next._id}`)
  }
}

function prevPage() {
  if (pageIndex.value > 0) pageIndex.value--
  else if (hasPrevEp.value) goToPrevEp()
}
function nextPage() {
  if (pageIndex.value < pages.value.length - 1) {
    pageIndex.value++
  } else if (apiPage.value < apiTotalPages.value) {
    const prevLen = pages.value.length
    loadApiPage(currentOrder.value, apiPage.value + 1).then(() => { pageIndex.value = prevLen })
  } else if (hasNextEp.value) {
    goToNextEp()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (mode.value !== 'page') return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage()
}

let saveTimer: ReturnType<typeof setInterval> | null = null
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastScrollSaveAt = 0
const SCROLL_SAVE_THROTTLE_MS = 300

watch(chapterId, () => {
  loadChapter().then(() => { if (mode.value === 'scroll') setupObserver() })
})

watch(() => route.hash, async (hash) => {
  if (!hash) return
  const targetPage = getResumePageFromHash()
  if (!targetPage) return
  await restoreReadingPosition(targetPage)
})

watch(mode, () => {
  if (mode.value === 'scroll') {
    setupObserver()
    setupPageObserver()
    nextTick(() => scrollToPage(pageIndex.value + 1))
  } else {
    observer?.disconnect()
    pageObserver?.disconnect()
    pageIndex.value = Math.max(0, scrollPage.value - 1)
  }
})

watch(() => pages.value.length, () => {
  if (mode.value === 'scroll') setupPageObserver()
})

function scheduleSaveHistory() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(() => {
    saveHistory()
    saveDebounceTimer = null
  }, 500)
}

function scheduleScrollSaveHistory() {
  if (mode.value !== 'scroll') return
  const now = Date.now()
  const elapsed = now - lastScrollSaveAt

  if (elapsed >= SCROLL_SAVE_THROTTLE_MS) {
    lastScrollSaveAt = now
    saveHistory()
    return
  }

  if (scrollSaveTimer) return

  scrollSaveTimer = setTimeout(() => {
    scrollSaveTimer = null
    lastScrollSaveAt = Date.now()
    saveHistory()
  }, SCROLL_SAVE_THROTTLE_MS - elapsed)
}

watch(pageIndex, () => {
  if (mode.value === 'page') scheduleSaveHistory()
})

watch(scrollPage, () => {
  if (mode.value === 'scroll') scheduleScrollSaveHistory()
})

function onStorageChange(e: StorageEvent) {
  if (e.key === 'preferred-image-server') refreshPreferred()
}

onMounted(async () => {
  await loadChapter()
  setupObserver()
  setupPageObserver()
  await nextTick()
  const hashPage = getResumePageFromHash()
  if (hashPage) {
    await restoreReadingPosition(hashPage)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('storage', onStorageChange)
  saveTimer = setInterval(saveHistory, 30_000)
})

onUnmounted(() => {
  observer?.disconnect()
  pageObserver?.disconnect()
  window.removeEventListener('scroll', onScroll)
  if (scrollRaf) window.cancelAnimationFrame(scrollRaf)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('storage', onStorageChange)
  if (saveTimer) clearInterval(saveTimer)
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
  saveHistory()
})
</script>


<template>
  <div class="reader-wrap" :class="{ 'overflow-hidden': mode === 'page' }">

    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <button class="tool-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
        返回
      </button>

      <div class="toolbar-center">
        <button class="tool-btn ep-btn" @click="showEpDrawer = !showEpDrawer">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
          {{ epTitle || `第 ${currentOrder} 话` }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <div class="toolbar-right">
        <button class="tool-btn" :class="{ active: mode === 'scroll' }" title="滚动模式" @click="mode = 'scroll'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"/>
          </svg>
        </button>
        <button class="tool-btn" :class="{ active: mode === 'page' }" title="翻页模式" @click="mode = 'page'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </button>
        <button class="tool-btn" title="阅读设置" @click.stop="showSettings = !showSettings">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 章节抽屉 -->
    <Transition name="drawer">
      <div v-if="showEpDrawer" class="ep-drawer" @click.self="showEpDrawer = false">
        <div class="ep-list">
          <div class="ep-list-title">章节列表</div>
          <div
            v-for="ep in sortedChapters"
            :key="ep._id"
            class="ep-item"
            :class="{ active: ep._id === chapterId }"
            @click="forceResetToFirstPage = true; router.replace(`/comic/${comicId}/chapter/${ep._id}`); showEpDrawer = false"
          >
            {{ ep.title || `第 ${ep.order} 话` }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- 错误 -->
    <div v-if="error" class="loading-state">
      <p class="error-text">{{ error }}</p>
      <button class="ep-nav-btn" @click="loadChapter">重试</button>
    </div>

    <!-- 滚动模式 -->
    <div v-else-if="mode === 'scroll'" class="scroll-reader">
      <div
        v-for="(url, i) in pages"
        :id="`page-anchor-${i + 1}`"
        :key="i"
        :data-page-index="i"
        class="scroll-page"
      >
        <div class="scroll-page-placeholder" :class="{ 'is-loaded': isPageLoaded(i) }">
          <span v-if="!isPageLoaded(i)" class="scroll-page-label">第 {{ i + 1 }} 张</span>
          <img
            :src="url"
            :alt="`第${i + 1}页`"
            class="scroll-img"
            loading="lazy"
            @error="onImgError($event, i)"
            @load="onScrollImageLoad(i)"
          />
        </div>
      </div>

      <!-- 哨兵：触底自动加载下一 API 页 -->
      <div ref="sentinelRef" class="sentinel">
        <div v-if="loadingMore" class="loading-more">
          <div class="spinner-sm" />加载更多...
        </div>
      </div>

      <!-- 章节切换 -->
      <div class="ep-nav">
        <button class="ep-nav-btn" :disabled="!hasPrevEp" @click="goToPrevEp">上一话</button>
        <span class="ep-nav-info">{{ epTitle || `第 ${currentOrder} 话` }}</span>
        <button class="ep-nav-btn" :disabled="!hasNextEp" @click="goToNextEp">下一话</button>
      </div>
    </div>

    <!-- 翻页模式 -->
    <div v-else class="page-reader" @click.self="nextPage">
      <div v-if="pages.length" class="page-img-wrap">
        <img
          :src="pages[pageIndex]"
          :alt="`第${pageIndex + 1}页`"
          class="page-img"
          @error="onImgError($event, pageIndex)"
        />
        <div class="page-counter">{{ pageIndex + 1 }} / {{ pages.length }}</div>
      </div>

      <div class="click-prev" @click="prevPage" />
      <div class="click-next" @click="nextPage" />

      <div class="page-bottom-nav">
        <button class="ep-nav-btn" :disabled="!hasPrevEp" @click="goToPrevEp">上一话</button>
        <div class="page-dots">
          <span
            v-for="(_, i) in pages"
            :key="i"
            class="dot"
            :class="{ active: i === pageIndex }"
            @click="pageIndex = i"
          />
        </div>
        <button class="ep-nav-btn" :disabled="!hasNextEp" @click="goToNextEp">下一话</button>
      </div>
    </div>

    <!-- 设置面板 -->
    <Transition name="slide-up">
      <div v-if="showSettings" class="settings-panel" @click.stop>
        <div class="settings-header">
          <span class="settings-title">阅读设置</span>
          <button class="tool-btn" @click="showSettings = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <p class="settings-label">阅读模式</p>
        <div class="settings-modes">
          <button
            class="mode-btn"
            :class="{ active: mode === 'scroll' }"
            @click="mode = 'scroll'"
          >竖向滚动</button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'page' }"
            @click="mode = 'page'"
          >横向翻页</button>
        </div>
      </div>
    </Transition>
    <div v-if="showSettings" class="overlay" @click.stop="showSettings = false" />

  </div>
</template>


<style scoped>
.reader-wrap {
  --toolbar-height: 52px;
  min-height: 100vh;
  background: #111;
  display: flex;
  flex-direction: column;
  padding-top: var(--toolbar-height);
}

/* 工具栏 */
.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--toolbar-height);
  box-sizing: border-box;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(8px);
  padding: 10px 16px;
  gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.toolbar-center { flex: 1; display: flex; justify-content: center; }
.toolbar-right { display: flex; gap: 4px; }

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  color: #ccc;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.tool-btn.active { background: rgba(219,84,124,0.25); color: #DB547C; }

.ep-btn {
  font-size: 13px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 章节抽屉 */
.ep-drawer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: var(--toolbar-height);
}
.ep-list {
  background: #1e1e1e;
  border-radius: 0 0 12px 12px;
  width: 100%;
  max-width: 480px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px 0;
}
.ep-list-title { font-size: 13px; color: #888; padding: 8px 16px 4px; font-weight: 600; }
.ep-item { padding: 10px 16px; font-size: 14px; color: #ccc; cursor: pointer; transition: background 0.15s; }
.ep-item:hover { background: rgba(255,255,255,0.06); }
.ep-item.active { color: #DB547C; font-weight: 600; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }

/* 加载 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #888;
  font-size: 14px;
}
.error-text { color: #f87171; font-size: 14px; }
.spinner {
  width: 28px; height: 28px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: #DB547C;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner-sm {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #DB547C;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 滚动模式 */
.scroll-reader { display: flex; flex-direction: column; align-items: center; }
.scroll-page {
  width: 100%;
  max-width: 800px;
  position: relative;
  scroll-margin-top: calc(var(--toolbar-height) + 8px);
}
.scroll-page-placeholder {
  width: 100%;
  min-height: clamp(420px, 72vh, 980px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #1b1b1b 0%, #141414 100%);
}
.scroll-page-placeholder.is-loaded {
  min-height: 0;
}
.scroll-page-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(18px, 2.2vw, 26px);
  letter-spacing: 0.06em;
  font-weight: 700;
  color: rgba(255,255,255,0.3);
  background:
    radial-gradient(circle at 30% 22%, rgba(219,84,124,0.16), transparent 46%),
    radial-gradient(circle at 72% 78%, rgba(219,84,124,0.14), transparent 50%);
  user-select: none;
  pointer-events: none;
}
.scroll-img {
  width: 100%;
  display: block;
  background: transparent;
}
.sentinel { width: 100%; height: 40px; }
.loading-more {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; color: #888; font-size: 13px; padding: 12px 0;
}

/* 章节切换 */
.ep-nav {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 24px 16px; width: 100%; max-width: 800px;
}
.ep-nav-info { font-size: 13px; color: #888; min-width: 80px; text-align: center; }
.ep-nav-btn {
  background: rgba(255,255,255,0.08); color: #ccc; border: none;
  border-radius: 8px; padding: 8px 20px; font-size: 13px;
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.ep-nav-btn:hover:not(:disabled) { background: #DB547C; color: #fff; }
.ep-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* 翻页模式 */
.page-reader {
  flex: 1; position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: calc(100vh - var(--toolbar-height));
}
.page-img-wrap {
  position: relative; display: flex;
  align-items: center; justify-content: center;
  width: 100%; max-width: 800px;
  padding: 0 60px; box-sizing: border-box;
}
.page-img {
  max-width: 100%; max-height: calc(100vh - var(--toolbar-height) - 68px);
  object-fit: contain; display: block;
}
.page-counter {
  position: absolute; bottom: 8px; right: 68px;
  background: rgba(0,0,0,0.6); color: #fff;
  font-size: 12px; padding: 3px 10px; border-radius: 20px;
}
.click-prev, .click-next {
  position: fixed; top: 52px; bottom: 60px;
  width: 30%; cursor: pointer; z-index: 10;
}
.click-prev { left: 0; }
.click-next { right: 0; }
.page-bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  background: rgba(20,20,20,0.95); backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255,255,255,0.08); gap: 12px;
}
.page-dots {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 4px; overflow: hidden; max-width: 300px;
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,0.2); cursor: pointer;
  flex-shrink: 0; transition: background 0.15s, transform 0.15s;
}
.dot.active { background: #DB547C; transform: scale(1.4); }

/* 设置面板 */
.settings-panel {
  position: fixed; inset-x: 0; bottom: 0; z-index: 300;
  background: #1e1e1e; border-radius: 16px 16px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 20px 20px 32px;
}
.settings-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.settings-title { font-size: 15px; font-weight: 600; color: #fff; }
.settings-label { font-size: 13px; color: #888; margin-bottom: 10px; }
.settings-modes { display: flex; gap: 10px; }
.mode-btn {
  flex: 1; height: 44px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1);
  background: transparent; color: #ccc;
  font-size: 14px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.mode-btn.active { border-color: #DB547C; color: #DB547C; background: rgba(219,84,124,0.1); }

.overlay {
  position: fixed; inset: 0; z-index: 299;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
