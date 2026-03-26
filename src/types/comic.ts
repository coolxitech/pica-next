import type { PageResult } from './common'
import type { CommentUser } from './user'

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

export interface Creator {
  _id: string
  name: string
  title: string
  level: number
  exp: number
  slogan: string
  avatar: { fileServer: string; path: string }
}

export interface ChapterSummary {
  _id: string
  title: string
  order: number
}

export interface ComicDetail extends Comic {
  chineseTeam: string
  totalComments: number
  viewsCount: number
  isFavourite: boolean
  isLiked: boolean
  _creator: Creator
  chapters: ChapterSummary[]
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

export interface ComicListParams {
  page?: number
  sort?: 'dd' | 'da' | 'ld' | 'vd'
  c?: string
  t?: string
}

export interface Chapter {
  id: string
  title: string
  pages: string[]
  prevChapterId: string | null
  nextChapterId: string | null
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
