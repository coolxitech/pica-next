<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useComicStore } from '@/stores/comic.store'
import { useUserStore } from '@/stores/user.store'
import type { ComicDetail } from '@/types/comic'
import { getComments, getCommentChildrens, postComment, likeComment } from '@/api/comic.api'
import type { Comment as ApiComment, CommentsResult as ApiCommentsResult, CommentChildrensResult as ApiCommentChildrensResult } from '@/api/comic.api'
import TagBadge from '@/components/comic/TagBadge.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import placeholderAvatar from '@/assets/placeholder_avatar.png'
import {
  Heart, BookOpen, ArrowUpDown, ArrowLeft, CheckCircle2, Eye, Images, Home, MessageSquare, Send, Bot, Mars, Venus
} from 'lucide-vue-next'
import { buildComicImageUrl } from '@/utils/image-url'

const route = useRoute()
const router = useRouter()
const comicStore = useComicStore()
const userStore = useUserStore()

const comicId = computed(() => route.params.id as string)
const comic = ref<ComicDetail | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const sortDesc = ref(true)
const comments = ref<ApiComment[]>([])
const topComments = ref<ApiComment[]>([])
const commentsPage = ref(1)
const commentsHasMore = ref(false)
const commentsLoading = ref(false)
const commentsLoadingMore = ref(false)
const commentsError = ref<string | null>(null)
const childComments = ref<Record<string, ApiComment[]>>({})
const childCommentsPage = ref<Record<string, number>>({})
const childCommentsHasMore = ref<Record<string, boolean>>({})
const childCommentsLoading = ref<Record<string, boolean>>({})
const childCommentsExpanded = ref<Record<string, boolean>>({})
const childCommentsLoaded = ref<Record<string, boolean>>({})
const commentText = ref('')
const submittingComment = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref('')
const replyVisible = ref(false)
const replyingComment = ref<ApiComment | null>(null)
const replyText = ref('')
const replySubmitting = ref(false)
const commentLikeLoading = ref<Record<string, boolean>>({})

const isFavorite = computed(() => {
  if (comic.value && typeof comic.value.isFavourite === 'boolean') {
    return comic.value.isFavourite
  }
  return userStore.favorites.includes(comicId.value)
})
const readHistory = computed(() => userStore.history.find(h => h.comicId === comicId.value))
const canSubmitComment = computed(() => commentText.value.trim().length > 0 && !submittingComment.value)
const canSubmitReply = computed(() => replyText.value.trim().length > 0 && !replySubmitting.value)
const mergedComments = computed(() => {
  const map = new Map<string, ApiComment>()
  topComments.value.forEach((item) => map.set(item._id, item))
  comments.value.forEach((item) => map.set(item._id, item))
  return Array.from(map.values())
})
const sortedChapters = computed(() => {
  if (!comic.value) return []
  const chapters = [...comic.value.chapters].sort((a, b) => a.order - b.order)
  return sortDesc.value ? chapters.reverse() : chapters
})
const readChapterIds = computed(() => {
  const ids = new Set<string>()
  userStore.history
    .filter(h => h.comicId === comicId.value && typeof h.chapterId === 'string' && h.chapterId.length > 0)
    .forEach(h => ids.add(h.chapterId))
  return ids
})

function buildAvatarUrl(avatar?: { fileServer: string; path: string } | null): string {
  if (avatar?.fileServer && avatar?.path) {
    return `${avatar.fileServer}/static/${avatar.path}`
  }
  return placeholderAvatar
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    comic.value = await comicStore.fetchComicDetail(comicId.value)
    await loadComments(true)
  } catch {
    error.value = '漫画详情加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

function toggleFavorite() {
  userStore.toggleFavorite(comicId.value)
  if (comic.value) {
    comic.value.isFavourite = !comic.value.isFavourite
  }
}

function goToChapter(chapterId: string) {
  if (!chapterId || chapterId === 'undefined') return
  router.push(`/comic/${comicId.value}/chapter/${chapterId}`)
}

function continueReading() {
  const chapters = comic.value?.chapters ?? []
  const historyChapterId = readHistory.value?.chapterId
  if (historyChapterId && chapters.some(c => c._id === historyChapterId)) {
    router.push(`/comic/${comicId.value}/chapter/${historyChapterId}`)
    return
  }

  const first = [...chapters].sort((a, b) => a.order - b.order).find(c => !!c._id)
  if (first) router.push(`/comic/${comicId.value}/chapter/${first._id}`)
}

function formatCommentTime(raw: string) {
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString('zh-CN', { hour12: false })
}

function roleLabel(role?: string) {
  if (!role) return ''
  const normalized = role.toLowerCase()
  if (normalized === 'admin') return '管理员'
  if (normalized === 'mod' || normalized === 'moderator') return '版主'
  if (normalized === 'member' || normalized === 'user') return '用户'
  return role
}

function isMale(gender?: string) {
  if (!gender) return false
  const normalized = gender.toLowerCase()
  return normalized === 'm' || normalized === 'male' || normalized === 'man' || gender === '男'
}

function isFemale(gender?: string) {
  if (!gender) return false
  const normalized = gender.toLowerCase()
  return normalized === 'f' || normalized === 'female' || normalized === 'woman' || gender === '女'
}

function isReplyComment(content?: string) {
  if (!content) return false
  return /^回复\s*@.+[:：]/.test(content.trim())
}

function parsePageNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(1, Math.floor(v))
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.max(1, Math.floor(n))
  }
  return fallback
}

function hasNestedComments(value: unknown): value is { comments: unknown } {
  return typeof value === 'object' && value !== null && 'comments' in value
}

async function loadComments(reset = false, explicitPage?: number) {
  if (reset) {
    commentsPage.value = 1
    comments.value = []
    topComments.value = []
    commentsError.value = null
    childComments.value = {}
    childCommentsPage.value = {}
    childCommentsHasMore.value = {}
    childCommentsLoading.value = {}
    childCommentsExpanded.value = {}
    childCommentsLoaded.value = {}
  }

  const targetPage = reset ? 1 : (explicitPage ?? commentsPage.value)
  if (targetPage === 1) commentsLoading.value = true
  else commentsLoadingMore.value = true

  try {
    commentsError.value = null
    const res = await getComments(comicId.value, targetPage)
    // 兼容两种返回结构：
    // 1) data: { comments: PageResult, topComments: [] }
    // 2) data: { comments: { comments: PageResult, topComments: [] } }
    const payload = (res.data as ApiCommentsResult & { comments?: unknown })
    const normalized = hasNestedComments(payload.comments)
      ? (payload.comments as unknown as ApiCommentsResult)
      : (payload as ApiCommentsResult)

    const pageResult = normalized.comments
    const docs = pageResult.docs ?? []
    const currentPage = parsePageNumber(pageResult.page, targetPage)
    const totalPages = parsePageNumber(pageResult.pages, 1)

    if (targetPage === 1) {
      topComments.value = normalized.topComments ?? []
      comments.value = docs
    } else {
      comments.value = comments.value.concat(docs)
    }

    commentsPage.value = currentPage
    commentsHasMore.value = currentPage < totalPages

    if (comic.value && typeof pageResult.total === 'number') {
      comic.value.totalComments = pageResult.total
    }
  } catch {
    commentsError.value = '评论加载失败，请稍后重试'
  } finally {
    commentsLoading.value = false
    commentsLoadingMore.value = false
  }
}

async function loadMoreComments() {
  if (!commentsHasMore.value || commentsLoadingMore.value || commentsLoading.value) return
  const nextPage = Math.max(1, commentsPage.value + 1)
  await loadComments(false, nextPage)
}

async function loadChildComments(parentId: string, reset = false) {
  if (childCommentsLoading.value[parentId]) return

  const current = childCommentsPage.value[parentId] ?? 0
  const targetPage = reset ? 1 : current + 1
  if (!reset && !(childCommentsHasMore.value[parentId] ?? false)) return

  childCommentsLoading.value[parentId] = true
  try {
    const res = await getCommentChildrens(parentId, targetPage)
    const payload = (res.data as ApiCommentChildrensResult & { comments?: unknown })
    const normalized = hasNestedComments(payload.comments)
      ? ((payload.comments as unknown as ApiCommentChildrensResult).comments)
      : (payload.comments as ApiCommentChildrensResult['comments'])

    const docs = normalized?.docs ?? []
    const currentPage = parsePageNumber(normalized?.page, targetPage)
    const totalPages = parsePageNumber(normalized?.pages, 1)

    if (reset) childComments.value[parentId] = docs
    else childComments.value[parentId] = (childComments.value[parentId] ?? []).concat(docs)

    childCommentsPage.value[parentId] = currentPage
    childCommentsHasMore.value[parentId] = currentPage < totalPages
    childCommentsLoaded.value[parentId] = true
  } catch {
    childCommentsLoaded.value[parentId] = true
  } finally {
    childCommentsLoading.value[parentId] = false
  }
}

async function toggleChildComments(item: ApiComment) {
  const id = item._id
  const expanded = !!childCommentsExpanded.value[id]
  if (expanded) {
    childCommentsExpanded.value[id] = false
    return
  }
  childCommentsExpanded.value[id] = true
  if (!childCommentsLoaded.value[id]) {
    await loadChildComments(id, true)
  }
}

async function loadMoreChildComments(parentId: string) {
  await loadChildComments(parentId, false)
}

async function submitComment() {
  submitError.value = null
  submitSuccess.value = ''

  if (!userStore.token) {
    router.push('/login')
    return
  }

  const content = commentText.value.trim()
  if (!content) {
    submitError.value = '评论内容不能为空'
    return
  }
  if (content.length > 300) {
    submitError.value = '评论内容不能超过 300 字'
    return
  }

  submittingComment.value = true
  try {
    const res = await postComment(comicId.value, content)
    if (res.code !== 200) {
      throw new Error(res.message || '发布失败，请稍后重试')
    }
    commentText.value = ''
    submitSuccess.value = '评论发布成功'
    if (comic.value) comic.value.totalComments = (comic.value.totalComments ?? 0) + 1
    await loadComments(true)
  } catch {
    submitError.value = '发布失败，请稍后重试'
  } finally {
    submittingComment.value = false
  }
}

function openReplyModal(item: ApiComment) {
  replyingComment.value = item
  replyText.value = ''
  replyVisible.value = true
}

function closeReplyModal() {
  replyVisible.value = false
  replyingComment.value = null
  replyText.value = ''
  replySubmitting.value = false
}

async function submitReply() {
  if (!replyingComment.value || !canSubmitReply.value) return
  if (!userStore.token) {
    router.push('/login')
    return
  }

  const raw = replyText.value.trim()
  if (!raw) return
  if (raw.length > 100) return

  replySubmitting.value = true
  try {
    const content = `回复 @${replyingComment.value._user?.name || '匿名用户'}：${raw}`
    const res = await postComment(comicId.value, content)
    if (res.code !== 200) {
      throw new Error(res.message || '回复失败，请稍后重试')
    }
    closeReplyModal()
    submitSuccess.value = '回复发布成功'
    if (comic.value) comic.value.totalComments = (comic.value.totalComments ?? 0) + 1
    await loadComments(true)
  } catch {
    submitError.value = '回复失败，请稍后重试'
  } finally {
    replySubmitting.value = false
  }
}

async function handleLikeComment(item: ApiComment) {
  if (commentLikeLoading.value[item._id]) return
  commentLikeLoading.value[item._id] = true
  try {
    const res = await likeComment(item._id)
    if (res.code !== 200) {
      throw new Error(res.message || '点赞失败')
    }
    const action = String(res.data?.action ?? '').toLowerCase()
    const target = mergedComments.value.find(c => c._id === item._id)
    if (!target) return
    if (action === 'like') {
      target.isLiked = true
      target.likesCount = (target.likesCount ?? 0) + 1
    } else if (action === 'unlike') {
      target.isLiked = false
      target.likesCount = Math.max(0, (target.likesCount ?? 0) - 1)
    } else {
      const nextLiked = !target.isLiked
      target.isLiked = nextLiked
      target.likesCount = Math.max(0, (target.likesCount ?? 0) + (nextLiked ? 1 : -1))
    }
  } catch {
    submitError.value = '点赞失败，请稍后重试'
  } finally {
    commentLikeLoading.value[item._id] = false
  }
}

onMounted(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  void load()
})
</script>

<template>
  <div class="min-h-screen bg-background pb-24 overflow-x-hidden">
    <!-- Back bar -->
    <div class="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 h-14 flex items-center gap-3">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-accent cursor-pointer transition-colors duration-200 hover-lift-btn"
        aria-label="返回"
        @click="router.back()"
      >
        <ArrowLeft class="w-5 h-5 text-foreground" />
      </button>
      <span class="text-base font-bold text-foreground truncate flex-1">漫画详情</span>
      <RouterLink
        to="/"
        class="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200 hover-lift-btn"
        aria-label="主页"
      >
        <Home class="w-5 h-5" />
      </RouterLink>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div class="flex gap-4 hover-lift">
        <div class="w-32 aspect-[3/4] rounded-2xl bg-muted animate-pulse shrink-0" />
        <div class="flex-1 space-y-3 pt-1">
          <div class="h-5 bg-muted animate-pulse rounded-lg w-3/4" />
          <div class="h-4 bg-muted animate-pulse rounded-lg w-1/2" />
          <div class="h-4 bg-muted animate-pulse rounded-lg w-1/3" />
          <div class="flex gap-2 mt-2">
            <div class="h-6 w-16 bg-muted animate-pulse rounded-full" />
            <div class="h-6 w-16 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    </div>

    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <div
      v-else-if="comic"
      class="max-w-4xl mx-auto px-4 py-6 space-y-6"
    >
      <!-- Hero -->
      <div class="flex gap-4 animate__animated animate__fadeInUp" style="animation-delay: 0.02s;">
        <div class="w-32 shrink-0">
          <img
            :src="buildComicImageUrl(comic.thumb.fileServer, comic.thumb.path)"
            :alt="comic.title"
            class="w-full aspect-[3/4] object-cover rounded-2xl shadow-lg ring-1 ring-border"
          />
        </div>
        <div class="flex-1 min-w-0 space-y-2.5">
          <div class="flex items-start gap-2 flex-wrap">
            <h1 class="text-lg font-bold text-foreground leading-tight break-words">{{ comic.title }}</h1>
            <span
              v-if="comic.finished !== undefined"
              class="shrink-0 mt-0.5 text-xs font-bold px-2.5 py-1 rounded-lg leading-none"
              :class="comic.finished ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30' : 'bg-muted text-muted-foreground ring-1 ring-border'"
            >
              {{ comic.finished ? '已完结' : '连载中' }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground">{{ comic.author }}</p>
          <div v-if="comic.likesCount" class="flex items-center gap-1.5">
            <Heart class="w-4 h-4 text-pink-500 fill-pink-500" />
            <span class="text-sm font-bold text-foreground">{{ comic.likesCount.toLocaleString() }} 喜欢</span>
          </div>
          <!-- 浏览次数 & 图片数量 -->
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div v-if="comic.totalViews" class="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye class="w-3.5 h-3.5 shrink-0" />
              <span>{{ comic.totalViews.toLocaleString() }} 浏览</span>
            </div>
            <div v-if="comic.pagesCount" class="flex items-center gap-1 text-xs text-muted-foreground">
              <Images class="w-3.5 h-3.5 shrink-0" />
              <span>{{ comic.pagesCount.toLocaleString() }} 张图片</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            <TagBadge v-for="tag in comic.tags" :key="tag" :tag="tag" />
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="bg-card rounded-2xl p-4 border border-border hover-lift animate__animated animate__fadeInUp" style="animation-delay: 0.08s;">
        <p class="text-sm text-muted-foreground leading-relaxed">{{ comic.description }}</p>
      </div>

      <!-- Creator -->
      <RouterLink
        v-if="comic._creator"
        :to="`/creator/${comic._creator._id}?name=${encodeURIComponent(comic._creator.name)}`"
        class="bg-card rounded-2xl p-4 border border-border flex items-center gap-3 hover:border-primary/40 hover:bg-accent transition-all duration-200 cursor-pointer card-glow hover-lift animate__animated animate__fadeInUp"
        style="animation-delay: 0.14s;"
      >
        <div class="shrink-0 relative">
          <img
            :src="buildAvatarUrl(comic._creator.avatar)"
            :alt="comic._creator.name"
            class="w-[60px] h-[60px] rounded-xl object-cover ring-2 ring-primary/20"
          />
          <div class="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm">
            Lv{{ comic._creator.level }}
          </div>
        </div>
        <div class="flex-1 min-w-0 space-y-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-bold text-foreground truncate">{{ comic._creator.name }}</span>
            <span v-if="comic._creator.title" class="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full leading-none shrink-0">
              {{ comic._creator.title }}
            </span>
          </div>
          <p v-if="comic._creator.slogan" class="text-xs text-muted-foreground truncate">{{ comic._creator.slogan }}</p>
        </div>
      </RouterLink>

      <!-- Actions -->
      <div class="flex gap-3 animate__animated animate__fadeInUp" style="animation-delay: 0.2s;">
        <button
          class="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl gradient-primary text-white font-bold text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-md shadow-primary/25 hover-lift-read"
          @click="continueReading"
        >
          <BookOpen class="w-4 h-4" />
          {{ readHistory ? '继续阅读' : '开始阅读' }}
        </button>
        <button
          class="flex items-center justify-center w-12 h-12 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover-lift"
          :class="isFavorite
            ? 'text-primary bg-primary/10 border-primary/40 shadow-sm shadow-primary/20'
            : 'text-muted-foreground border-border bg-card hover:border-primary/40 hover:text-primary hover:bg-primary/5'"
          :aria-label="isFavorite ? '取消收藏' : '收藏'"
          @click="toggleFavorite"
        >
          <Heart class="w-5 h-5" :class="isFavorite ? 'fill-primary' : ''" />
        </button>
      </div>

      <!-- Chapter list -->
      <div class="space-y-3 animate__animated animate__fadeInUp" style="animation-delay: 0.26s;">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-foreground">
            章节列表
            <span class="text-sm font-normal text-muted-foreground ml-1">({{ comic.chapters?.length ?? 0 }})</span>
          </h2>
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-all duration-200 min-h-[36px] hover-lift-btn"
            @click="sortDesc = !sortDesc"
          >
            <ArrowUpDown class="w-3.5 h-3.5" />
            {{ sortDesc ? '倒序' : '正序' }}
          </button>
        </div>

        <div class="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border stagger-children hover-lift">
          <button
            v-for="chapter in sortedChapters"
            :key="chapter._id"
            class="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent cursor-pointer transition-colors duration-150 min-h-[52px] hover-lift-btn"
            @click="goToChapter(chapter._id)"
          >
            <CheckCircle2
              v-if="readChapterIds.has(chapter._id)"
              class="w-4 h-4 text-primary shrink-0"
            />
            <div v-else class="w-4 h-4 rounded-full border-2 border-border shrink-0" />
            <span
              class="flex-1 text-sm truncate font-medium"
              :class="readChapterIds.has(chapter._id) ? 'text-primary' : 'text-foreground'"
            >
              {{ chapter.title }}
            </span>
            <span v-if="readHistory?.chapterId === chapter._id" class="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
              上次读到
            </span>
          </button>
        </div>
      </div>

      <!-- Comments -->
      <div class="space-y-3 animate__animated animate__fadeInUp" style="animation-delay: 0.32s;">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-foreground flex items-center gap-2">
            <MessageSquare class="w-4 h-4 text-primary" />
            评论区
            <span class="text-sm font-normal text-muted-foreground">
              ({{ comic.totalComments ?? mergedComments.length }})
            </span>
          </h2>
        </div>

        <div class="bg-card rounded-2xl border border-border p-4 space-y-3 hover-lift">
          <textarea
            v-model="commentText"
            rows="3"
            maxlength="300"
            placeholder="说点什么吧..."
            class="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
          />
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs text-muted-foreground">{{ commentText.length }}/300</span>
            <button
              class="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover-lift-btn"
              :disabled="!canSubmitComment"
              @click="submitComment"
            >
              <Send class="w-3.5 h-3.5" />
              {{ submittingComment ? '发布中...' : '发布评论' }}
            </button>
          </div>
          <p v-if="submitError" class="text-xs text-destructive">{{ submitError }}</p>
          <p v-else-if="submitSuccess" class="text-xs text-emerald-600">{{ submitSuccess }}</p>
        </div>

        <div v-if="commentsLoading" class="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div v-for="i in 3" :key="i" class="space-y-2">
            <div class="h-4 bg-muted animate-pulse rounded w-1/3" />
            <div class="h-4 bg-muted animate-pulse rounded w-full" />
          </div>
        </div>

        <div v-else-if="mergedComments.length > 0" class="bg-card rounded-2xl border border-border divide-y divide-border hover-lift">
          <div
            v-for="item in mergedComments"
            :key="item._id"
            class="p-4 space-y-3"
            :class="item.isTop ? 'bg-amber-500/10 border-l-4 border-amber-400' : ''"
          >
            <div class="flex items-start gap-3">
              <img
                :src="buildAvatarUrl(item._user?.avatar)"
                :alt="item._user.name"
                class="w-[60px] h-[60px] rounded-full object-cover ring-1 ring-border"
              />
              <div class="min-w-0 flex-1 space-y-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-sm font-semibold text-foreground">{{ item._user?.name || '匿名用户' }}</span>
                  <span
                    v-if="item._user?.gender?.toLowerCase() === 'bot'"
                    class="inline-flex items-center"
                    aria-label="机器人"
                    title="机器人"
                  >
                    <Bot class="w-3.5 h-3.5" />
                  </span>
                  <span
                    v-else-if="isMale(item._user?.gender)"
                    class="inline-flex items-center"
                    aria-label="男性"
                    title="男性"
                  >
                    <Mars class="w-3.5 h-3.5 text-sky-500" />
                  </span>
                  <span
                    v-else-if="isFemale(item._user?.gender)"
                    class="inline-flex items-center"
                    aria-label="女性"
                    title="女性"
                  >
                    <Venus class="w-3.5 h-3.5 text-pink-500" />
                  </span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style="background: linear-gradient(135deg,var(--color-primary) 0%,var(--color-primary-dark) 100%);">
                    Lv{{ item._user?.level ?? 0 }}
                  </span>
                  <span v-if="item._user?.title" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {{ item._user.title }}
                  </span>
                  <span v-if="item._user?.verified" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                    认证
                  </span>
                  <span v-if="item._user?.role" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {{ roleLabel(item._user.role) }}
                  </span>
                  <span v-if="item.isTop" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">置顶</span>
                  <span v-if="item.hide" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">已隐藏</span>
                  <span class="text-[11px] text-muted-foreground ml-auto">{{ formatCommentTime(item.created_at) }}</span>
                </div>
                <p
                  v-if="!item.hide"
                  class="text-sm leading-relaxed break-words"
                  :class="isReplyComment(item.content)
                    ? 'text-foreground bg-primary/10 border border-primary/30 rounded-xl px-3 py-2'
                    : 'text-foreground'"
                >
                  {{ item.content }}
                </p>
                <p v-else class="text-sm text-muted-foreground italic">该评论已被隐藏</p>
                <div class="border-t border-border/70" />
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-muted-foreground flex items-center gap-3">
                    <span>回复 {{ item.commentsCount ?? 0 }}</span>
                  </div>
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold text-foreground border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors cursor-pointer hover-lift-btn"
                      aria-label="回复评论"
                      :disabled="item.hide"
                      :class="item.hide ? 'opacity-40 cursor-not-allowed' : ''"
                      @click="openReplyModal(item)"
                    >
                      <MessageSquare class="w-3.5 h-3.5" />
                      <span>回复</span>
                    </button>
                    <button
                      v-if="(item.commentsCount ?? 0) > 0"
                      type="button"
                      class="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold text-foreground border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors cursor-pointer hover-lift-btn disabled:opacity-40 disabled:cursor-not-allowed"
                      :disabled="item.hide || childCommentsLoading[item._id]"
                      @click="toggleChildComments(item)"
                    >
                      <MessageSquare class="w-3.5 h-3.5" />
                      <span>
                        {{ childCommentsExpanded[item._id]
                          ? '收起回复'
                          : `查看回复 ${item.commentsCount ?? 0}` }}
                      </span>
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer hover-lift-btn disabled:cursor-not-allowed"
                      :class="item.isLiked
                        ? 'text-white border-transparent bg-primary shadow-sm shadow-primary/30'
                        : 'text-foreground border-border bg-card hover:bg-accent hover:border-primary/40'"
                      aria-label="点赞评论"
                      :disabled="item.hide || commentLikeLoading[item._id]"
                      @click="handleLikeComment(item)"
                    >
                      <Heart class="w-3.5 h-3.5" :class="item.isLiked ? 'fill-primary' : ''" />
                      <span>{{ (item.likesCount ?? 0).toLocaleString() }}</span>
                    </button>
                  </div>
                </div>

                <div
                  v-if="childCommentsExpanded[item._id]"
                  class="rounded-xl border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div
                    v-if="childCommentsLoading[item._id] && (childComments[item._id]?.length ?? 0) === 0"
                    class="text-xs text-muted-foreground"
                  >
                    加载回复中...
                  </div>

                  <template v-else-if="(childComments[item._id]?.length ?? 0) > 0">
                    <div
                      v-for="child in childComments[item._id]"
                      :key="child._id"
                      class="rounded-lg bg-background border border-border p-2.5 space-y-1.5"
                    >
                      <div class="flex items-center gap-2">
                        <img
                          :src="buildAvatarUrl(child._user?.avatar)"
                          :alt="child._user?.name || '匿名用户'"
                          class="w-7 h-7 rounded-full object-cover ring-1 ring-border"
                        />
                        <span class="text-xs font-semibold text-foreground">{{ child._user?.name || '匿名用户' }}</span>
                        <span class="text-[10px] text-muted-foreground ml-auto">{{ formatCommentTime(child.created_at) }}</span>
                      </div>
                      <p
                        class="text-xs leading-relaxed break-words"
                        :class="isReplyComment(child.content)
                          ? 'text-foreground bg-primary/10 border border-primary/30 rounded-lg px-2 py-1.5'
                          : 'text-foreground'"
                      >
                        {{ child.hide ? '该回复已被隐藏' : child.content }}
                      </p>
                    </div>

                    <div class="pt-1">
                  <button
                    v-if="childCommentsHasMore[item._id]"
                    type="button"
                    class="h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground bg-card hover:bg-accent hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover-lift-btn"
                    :disabled="childCommentsLoading[item._id]"
                    @click="loadMoreChildComments(item._id)"
                  >
                        {{ childCommentsLoading[item._id] ? '加载中...' : '加载更多回复' }}
                      </button>
                    </div>
                  </template>

                  <div v-else class="text-xs text-muted-foreground">暂无回复</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          暂无评论，来发布第一条评论吧
        </div>

        <div v-if="commentsError && mergedComments.length === 0" class="text-center">
          <button
            class="h-9 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors hover-lift-btn"
            @click="loadComments(true)"
          >
            评论加载失败，点击重试
          </button>
        </div>

        <div v-if="commentsHasMore" class="text-center">
          <button
            class="h-9 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover-lift-btn"
            :disabled="commentsLoadingMore"
            @click="loadMoreComments"
          >
            {{ commentsLoadingMore ? '加载中...' : '加载更多评论' }}
          </button>
        </div>
      </div>
    </div>

    <Transition name="reply-modal">
      <div
        v-if="replyVisible && replyingComment"
        class="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center px-4"
        @click.self="closeReplyModal"
      >
        <div class="w-full max-w-xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
            <div>
              <h3 class="text-lg font-bold text-foreground">回复评论</h3>
              <p class="text-sm text-muted-foreground">回复 @{{ replyingComment._user?.name || '匿名用户' }}</p>
            </div>
            <button
              class="w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hover-lift-btn"
              aria-label="关闭回复弹窗"
              @click="closeReplyModal"
            >
              ×
            </button>
          </div>

          <div class="px-5 py-4 space-y-4">
            <div class="rounded-2xl border border-border bg-muted/30 p-3 flex gap-3">
              <img
                :src="buildAvatarUrl(replyingComment._user?.avatar)"
                :alt="replyingComment._user?.name || '用户头像'"
                class="w-9 h-9 rounded-lg object-cover shrink-0"
              />
              <div class="min-w-0">
                <p class="text-sm font-semibold text-foreground truncate">
                  {{ replyingComment._user?.name || '匿名用户' }}
                </p>
                <p class="text-sm text-muted-foreground break-words">
                  {{ replyingComment.content }}
                </p>
              </div>
            </div>

            <div class="rounded-2xl border border-border bg-background px-4 py-3">
              <textarea
                v-model="replyText"
                rows="4"
                maxlength="100"
                placeholder="写下你的回复..."
                class="w-full resize-none bg-transparent text-sm text-foreground outline-none"
              />
              <div class="text-right text-xs text-muted-foreground">{{ replyText.length }}/100</div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-border flex items-center gap-3">
            <button
              class="flex-1 h-12 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors hover-lift-btn"
              @click="closeReplyModal"
            >
              取消
            </button>
            <button
              class="flex-1 h-12 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover-lift-btn"
              :disabled="!canSubmitReply"
              @click="submitReply"
            >
              {{ replySubmitting ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hover-lift {
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.hover-lift-btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift-read {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

@media (hover: hover) and (pointer: fine) {
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 26px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .hover-lift-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--color-primary) 18%, transparent);
  }

  .hover-lift-read:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 10px 22px color-mix(in srgb, var(--color-primary) 28%, transparent);
  }
}

.reply-modal-enter-active,
.reply-modal-leave-active {
  transition: opacity 0.2s ease;
}

.reply-modal-enter-from,
.reply-modal-leave-to {
  opacity: 0;
}
</style>
