import { defineStore } from 'pinia'
import type { Category, ComicDetail, Comic, PageResult, ComicPagesResult, ChapterSummary, Chapter } from '@/types/index'
import {
  getCategories,
  getComicDetail,
  getComicEps,
  getComicPages,
  searchComics,
  getComics,
  getKeywords,
} from '@/api/comic'

function loadCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export interface ComicListCache {
  docs: Comic[]
  total: number
  page: number
}

export const useComicStore = defineStore('comics', {
  state: () => ({
    categories: loadCache<Category[]>('cache_categories') ?? [] as Category[],
    hotKeywords: loadSessionCache<string[]>('cache_keywords') ?? [] as string[],
    comicCache: {} as Record<string, ComicDetail>,
    // 列表缓存：key 为 tag 或 "search:<keyword>"
    listCache: {} as Record<string, ComicListCache>,
  }),

  actions: {
    async fetchCategories(): Promise<Category[]> {
      if (this.categories.length > 0) return this.categories
      try {
        const res = await getCategories()
        this.categories = res.data.categories.filter((c) => !!c._id && !!c.title)
        localStorage.setItem('cache_categories', JSON.stringify(this.categories))
      } catch (e) {
        console.error('获取分类失败', e)
      }
      return this.categories
    },

    async fetchHotKeywords(): Promise<string[]> {
      if (this.hotKeywords.length > 0) return this.hotKeywords
      try {
        const res = await getKeywords()
        this.hotKeywords = res.data.keywords
        sessionStorage.setItem('cache_keywords', JSON.stringify(this.hotKeywords))
      } catch (e) {
        console.error('获取关键词失败', e)
      }
      return this.hotKeywords
    },

    async fetchComicDetail(id: string): Promise<ComicDetail> {
      const cached = this.comicCache[id]
      if (cached) {
        const hasValidChapters =
          Array.isArray(cached.chapters)
          && cached.chapters.length > 0
          && cached.chapters.every(c => typeof c._id === 'string' && c._id.length > 0)

        if (hasValidChapters) return cached
        delete this.comicCache[id]
      }
      const res = await getComicDetail(id)
      const detail = res.data.comic as ComicDetail

      // 拉取所有章节（API 分页，每页最多 40 条）
      const firstPage = await getComicEps(id, 1)
      const { docs, pages } = firstPage.data.eps
      let allEps = [...docs]
      for (let p = 2; p <= pages; p++) {
        const r = await getComicEps(id, p)
        allEps = allEps.concat(r.data.eps.docs)
      }
      detail.chapters = allEps
        .map(ep => ({
          _id: ep._id ?? ep.id ?? '',
          title: ep.title,
          order: ep.order,
        }))
        .filter(ep => !!ep._id)

      if (detail.chapters.length === 0) {
        throw new Error('章节数据异常，未找到可读章节')
      }

      this.comicCache[id] = detail
      return detail
    },

    async fetchComicEps(comicId: string, page = 1): Promise<PageResult<ChapterSummary>> {
      const res = await getComicEps(comicId, page)
      const eps = res.data.eps
      return {
        ...eps,
        docs: eps.docs
          .map(ep => ({
            _id: ep._id ?? ep.id ?? '',
            title: ep.title,
            order: ep.order,
          }))
          .filter(ep => !!ep._id),
      }
    },

    async fetchComicPages(comicId: string, epsOrder: number, page = 1): Promise<ComicPagesResult> {
      const res = await getComicPages(comicId, epsOrder, page)
      return res.data
    },

    async searchComics(keyword: string, categories: string[] = [], page = 1): Promise<PageResult<Comic>> {
      const res = await searchComics(keyword, page, 'dd', categories)
      return res.data.comics
    },

    async fetchComics(params = {}): Promise<PageResult<Comic>> {
      const res = await getComics(params)
      return res.data.comics
    },

    async fetchComicsByTag(tag: string, page = 1): Promise<PageResult<Comic>> {
      const res = await getComics({ c: tag, page, s: 'dd' })
      return res.data.comics
    },

    setListCache(key: string, cache: ComicListCache) {
      this.listCache[key] = cache
    },

    getListCache(key: string): ComicListCache | null {
      return this.listCache[key] ?? null
    },

    clearListCache(key: string) {
      delete this.listCache[key]
    },

    async fetchComicsByCreator(creator: string, page = 1): Promise<PageResult<Comic>> {
      const res = await getComics({ ca: creator, page, s: 'dd' })
      return res.data.comics
    },

    /**
     * 获取章节完整图片列表
     * @param comicId 漫画 ID
     * @param chapterId 章节 _id（从 ChapterSummary 来）
     */
    async fetchChapter(comicId: string, chapterId: string): Promise<Chapter> {
      // 1. 确保漫画详情已加载（含章节列表）
      const detail = await this.fetchComicDetail(comicId)
      const chapters = detail.chapters // ChapterSummary[]，按 order 排序

      // 2. 找到目标章节的 order
      const idx = chapters.findIndex(c => c._id === chapterId)
      if (idx === -1) throw new Error('章节不存在')
      const target = chapters[idx]

      // 3. 拉取所有图片页（API 分页）
      const firstRes = await getComicPages(comicId, target.order, 1)
      const { pages: firstPages, ep } = firstRes.data
      let allDocs = [...firstPages.docs]
      for (let p = 2; p <= firstPages.pages; p++) {
        const r = await getComicPages(comicId, target.order, p)
        allDocs = allDocs.concat(r.data.pages.docs)
      }

      // 4. 拼接图片 URL
      const pageUrls = allDocs.map(doc => `${doc.media.fileServer}/static/${doc.media.path}`)

      // 5. 计算上一章 / 下一章（chapters 按 order 升序）
      const sorted = [...chapters].sort((a, b) => a.order - b.order)
      const sortedIdx = sorted.findIndex(c => c._id === chapterId)
      const prevChapter = sortedIdx > 0 ? sorted[sortedIdx - 1] : null
      const nextChapter = sortedIdx < sorted.length - 1 ? sorted[sortedIdx + 1] : null

      return {
        id: target._id,
        title: ep.title || target.title,
        pages: pageUrls,
        prevChapterId: prevChapter?._id ?? null,
        nextChapterId: nextChapter?._id ?? null,
      }
    },
  },
})
