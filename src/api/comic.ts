import request from '@/utils/request'
import { getPreferredServer } from '@/utils/imageServer'

export interface ComicThumb {
  fileServer: string
  path: string
  originalName: string
}

export interface Comic {
  _id: string
  title: string
  author: string
  description: string
  thumb: ComicThumb
  categories: string[]
  tags: string[]
  pagesCount?: number
  epsCount?: number
  finished: boolean
  totalViews?: number
  likesCount?: number
  totalLikes?: number
}

export interface PageResult<T> {
  docs: T[]
  total: number
  limit: number
  page: number
  pages: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ComicListParams {
  page?: number
  s?: 'dd' | 'da' | 'ld' | 'vd'
  c?: string
  ca?: string
}

export interface Creator {
  _id: string
  name: string
  title: string
  level: number
  exp: number
  slogan: string
  avatar: { fileServer: string; path: string }
}

export interface ComicDetail extends Comic {
  chineseTeam: string
  totalComments: number
  viewsCount: number
  likesCount: number
  isFavourite: boolean
  isLiked: boolean
  _creator: Creator
}

export interface ComicPage {
  _id: string
  id: string
  media: {
    originalName: string
    path: string
    fileServer: string
  }
}

export interface ComicPagesResult {
  pages: PageResult<ComicPage>
  ep: {
    _id: string
    title: string
  }
}

export interface Category {
  _id: string
  title: string
  description: string
  thumb: ComicThumb
}

export interface Collection {
  title: string
  comics: Comic[]
}

export interface CommentUser {
  _id: string
  gender: string
  name: string
  title: string
  verified: boolean
  exp: number
  level: number
  characters: string[]
  role: string
  avatar?: { fileServer: string; path: string; originalName?: string }
  slogan?: string
  character?: string
}

export interface Comment {
  _id: string
  content: string
  _user: CommentUser
  _comic: string
  totalComments: number
  isTop: boolean
  hide: boolean
  created_at: string
  id: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
}

export interface CommentsResult {
  comments: PageResult<Comment>
  topComments: Comment[]
}

export interface CommentChildrensResult {
  comments: PageResult<Comment>
  topComments?: Comment[]
}

/** 递归转换对象中的 fileServer（头像除外，保留响应原始 fileServer） */
function transformResponse(data: any, parentKey?: string): any {
  if (!data || typeof data !== 'object') return data
  
  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => transformResponse(item, parentKey))
  }
  
  const result: any = {}
  for (const key in data) {
    if (key === 'fileServer' && typeof data[key] === 'string') {
      if (parentKey === 'avatar') {
        result[key] = data[key]
      } else {
        const preferred = getPreferredServer()
        result[key] = preferred ?? data[key]
      }
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      result[key] = transformResponse(data[key], key)
    } else {
      result[key] = data[key]
    }
  }
  return result
}

/** 兜底回填头像 fileServer，确保使用接口原始值 */
function restoreAvatarFileServer(source: any, target: any): any {
  if (!source || !target || typeof source !== 'object' || typeof target !== 'object') return target
  if (Array.isArray(source) && Array.isArray(target)) {
    const len = Math.min(source.length, target.length)
    for (let i = 0; i < len; i++) restoreAvatarFileServer(source[i], target[i])
    return target
  }

  for (const key in source) {
    if (key === 'avatar' && source[key] && target[key] && typeof source[key] === 'object' && typeof target[key] === 'object') {
      if (typeof source[key].fileServer === 'string') {
        target[key].fileServer = source[key].fileServer
      }
    }
    restoreAvatarFileServer(source[key], target[key])
  }
  return target
}

type R<T> = Promise<ApiResponse<T>>

/** 漫画列表 */
export const getComics = async (params: ComicListParams = {}): R<{ comics: PageResult<Comic> }> => {
  const response = await request.get('/comics', { params })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 漫画详情 */
export const getComicDetail = async (id: string): R<{ comic: ComicDetail }> => {
  const response = await request.get(`/comics/${id}`)
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 漫画章节列表 */
export const getComicEps = async (
  id: string,
  page = 1,
): R<{ eps: PageResult<{ _id?: string; id?: string; title: string; order: number }> }> => {
  const response = await request.get(`/comics/${id}/eps`, { params: { page } })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 章节图片 */
export const getComicPages = async (id: string, epsOrder: number, page = 1): R<ComicPagesResult> => {
  const response = await request.get(`/comics/${id}/order/${epsOrder}/pages`, { params: { page } })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 搜索漫画 */
export const searchComics = async (
  keyword: string,
  page = 1,
  sort: ComicListParams['s'] = 'dd',
  categories?: string[],
): R<{ comics: PageResult<Comic> }> => {
  const response = await request.post(`/comics/advanced-search?page=${page}`, {
    keyword,
    sort,
    ...(categories && categories.length > 0 ? { categories } : {}),
  })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 分类列表 */
export const getCategories = (): R<{ categories: Category[] }> =>
  request.get('/categories')

/** 收藏/取消收藏 */
export const toggleFavourite = (id: string): R<{ action: string }> =>
  request.post(`/comics/${id}/favourite`)

/** 点赞 */
export const likeComic = (id: string): R<{ action: string }> =>
  request.post(`/comics/${id}/like`)

/** 关键词列表 */
export const getKeywords = (): R<{ keywords: string[] }> =>
  request.get('/keywords')

/** 收藏合集 */
export const getCollections = async (): R<{ collections: Collection[] }> => {
  const response = await request.get('/collections')
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 漫画评论列表 */
export const getComments = async (
  id: string,
  page = 1,
): R<CommentsResult> => {
  const response = await request.get(`/comics/${id}/comments`, { params: { page } })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 评论子回复列表 */
export const getCommentChildrens = async (
  commentId: string,
  page = 1,
): R<CommentChildrensResult> => {
  const response = await request.get(`/comments/${commentId}/childrens`, { params: { page } })
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 发表评论 */
export const postComment = async (
  id: string,
  content: string,
): Promise<{ code: number; message: string }> => {
  const response = await request.post(`/comics/${id}/comments`, { content })
  return {
    code: response.code,
    message: response.message,
  }
}

/** 评论点赞/取消点赞 */
export const likeComment = async (
  id: string,
): Promise<{ code: number; message: string; data: { action: 'like' | 'unlike' | string } }> => {
  const response = await request.post(`/comments/${id}/like`)
  return {
    code: response.code,
    message: response.message,
    data: response.data,
  }
}
