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

export interface HistoryEntry {
  comicId: string
  comicTitle: string
  cover: string
  chapterId: string
  chapterTitle: string
  page: number
  readAt: number
}

export interface TagFilter {
  mode: 'whitelist' | 'blacklist' | 'none'
  whitelist: string[]
  blacklist: string[]
}

export interface AppearanceSettings {
  colorMode: 'light' | 'dark' | 'system'
  themeColor: string
}

export interface PresetGroup {
  id: string
  name: string
  tags: string[]
}
