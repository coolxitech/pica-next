// ===== 真实 API 数据结构 =====

export interface ComicThumb {
  fileServer: string
  path: string
  originalName: string
}

// 漫画摘要（列表展示用）
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

export interface Creator {
  _id: string
  name: string
  title: string
  level: number
  exp: number
  slogan: string
  avatar: { fileServer: string; path: string }
}

// 漫画详情（含章节列表，章节由前端合并）
export interface ComicDetail extends Comic {
  chineseTeam: string
  totalComments: number
  viewsCount: number
  isFavourite: boolean
  isLiked: boolean
  _creator: Creator
  chapters: ChapterSummary[]
}

// 章节摘要
export interface ChapterSummary {
  _id: string
  title: string
  order: number
}

// 章节图片结果
export interface ComicPagesResult {
  pages: PageResult<ComicPage>
  ep: {
    _id: string
    title: string
  }
}

// 章节图片页
export interface ComicPage {
  _id: string
  id: string
  media: {
    originalName: string
    path: string
    fileServer: string
  }
}

// 分类条目
export interface Category {
  _id: string
  title: string
  description: string
  thumb: ComicThumb
}

// 推荐合集
export interface Collection {
  title: string
  comics: Comic[]
}

// 分页结果（真实 API 格式）
export interface PageResult<T> {
  docs: T[]
  total: number
  limit: number
  page: number
  pages: number
}

// 通用 API 响应包装
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 漫画列表查询参数
export interface ComicListParams {
  page?: number
  sort?: 'dd' | 'da' | 'ld' | 'vd'
  c?: string
  t?: string
}

// ===== 用户相关 =====

export interface UserAvatar {
  originalName: string
  path: string
  fileServer: string
}

export interface UserInfo {
  _id: string
  birthday: string
  email: string
  gender: string
  name: string
  slogan: string
  title: string
  verified: boolean
  exp: number
  level: number
  characters: string[]
  created_at: string
  avatar: UserAvatar
  isPunched: boolean
  character: string
}

// ===== 本地状态相关 =====

// 阅读器章节数据（含图片 URL 列表）
export interface Chapter {
  id: string
  title: string
  pages: string[]           // 拼接好的完整图片 URL
  prevChapterId: string | null
  nextChapterId: string | null
}

export interface HistoryEntry {
  comicId: string
  comicTitle: string
  cover: string
  chapterId: string
  chapterTitle: string
  page: number
  readAt: number
}

// 标签筛选配置
export interface TagFilter {
  mode: 'whitelist' | 'blacklist' | 'none'
  whitelist: string[]
  blacklist: string[]
}

// 外观设置
export interface AppearanceSettings {
  colorMode: 'light' | 'dark' | 'system'
  themeColor: string
}

// 预设屏蔽分组
export interface PresetGroup {
  id: string
  name: string
  tags: string[]
}

// ===== 评论相关 =====

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
  avatar?: UserAvatar
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
