import { defineStore } from 'pinia'
import type { AppearanceSettings, HistoryEntry, TagFilter } from '@/types/common'
import type { UserInfo } from '@/types/user'

const MAX_HISTORY = 100
const MAX_SEARCH_HISTORY = 10

// EXP thresholds per level (index = level, value = total exp needed)
const EXP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]

function calcLevel(exp: number): number {
  let level = 1
  for (let i = EXP_THRESHOLDS.length - 1; i >= 1; i--) {
    if (exp >= EXP_THRESHOLDS[i]) {
      level = i
      break
    }
  }
  return level
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: null as string | null,
    userInfo: null as UserInfo | null,
    appearance: {
      colorMode: 'system',
      themeColor: '#DB547C',
    } as AppearanceSettings,
    tagFilter: {
      mode: 'none',
      whitelist: [],
      blacklist: [],
    } as TagFilter,
    comicListLayout: 'grid' as 'grid' | 'list',
    favorites: [] as string[],
    history: [] as HistoryEntry[],
    searchHistory: [] as string[],
    exp: 0,
    expLevel: 1,
    consecutiveCheckIn: 0,
    lastCheckInDate: null as string | null,
  }),

  actions: {
    login(token: string, userInfo: UserInfo) {
      this.token = token
      this.userInfo = userInfo
    },

    setProfile(userInfo: UserInfo) {
      this.userInfo = userInfo
      // 同步服务端的 exp/level
      this.exp = userInfo.exp
      this.expLevel = userInfo.level
    },

    logout() {
      this.token = null
      this.userInfo = null
      this.favorites = []
      this.history = []
      this.searchHistory = []
      this.exp = 0
      this.expLevel = 1
      this.consecutiveCheckIn = 0
      this.lastCheckInDate = null
    },

    toggleFavorite(comicId: string) {
      const idx = this.favorites.indexOf(comicId)
      if (idx === -1) {
        this.favorites.push(comicId)
      } else {
        this.favorites.splice(idx, 1)
      }
    },

    addHistory(entry: HistoryEntry) {
      // Remove existing entry for same comic (update in place)
      const idx = this.history.findIndex(h => h.comicId === entry.comicId)
      if (idx !== -1) {
        this.history.splice(idx, 1)
      }
      // Prepend newest entry
      this.history.unshift(entry)
      // Trim to max
      if (this.history.length > MAX_HISTORY) {
        this.history = this.history.slice(0, MAX_HISTORY)
      }
    },

    removeHistory(comicId: string) {
      this.history = this.history.filter(h => h.comicId !== comicId)
    },

    clearHistory() {
      this.history = []
    },

    saveTagFilter(filter: TagFilter) {
      this.tagFilter = filter
    },

    saveAppearance(settings: AppearanceSettings) {
      this.appearance = settings
    },

    addSearchHistory(keyword: string) {
      const trimmed = keyword.trim()
      if (!trimmed) return
      // Remove duplicate
      this.searchHistory = this.searchHistory.filter(k => k !== trimmed)
      this.searchHistory.unshift(trimmed)
      if (this.searchHistory.length > MAX_SEARCH_HISTORY) {
        this.searchHistory = this.searchHistory.slice(0, MAX_SEARCH_HISTORY)
      }
    },

    checkIn(punchInLastDay?: string): { expGained: number; levelUp: boolean; newLevel: number } {
      const today = todayStr()
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      // 用服务端返回的上次签到日期判断连续性
      const lastDay = punchInLastDay ?? this.lastCheckInDate

      if (lastDay === today) {
        // 已签到，no-op
        return { expGained: 0, levelUp: false, newLevel: this.expLevel }
      }

      if (lastDay === yesterday) {
        this.consecutiveCheckIn += 1
      } else {
        this.consecutiveCheckIn = 1
      }

      this.lastCheckInDate = today
      if (this.userInfo) this.userInfo.isPunched = true

      let expGained = 10
      if (this.consecutiveCheckIn % 30 === 0) expGained += 50
      else if (this.consecutiveCheckIn % 7 === 0) expGained += 20

      const prevLevel = this.expLevel
      this.exp += expGained
      this.expLevel = calcLevel(this.exp)
      const levelUp = this.expLevel > prevLevel

      return { expGained, levelUp, newLevel: this.expLevel }
    },
  },

  persist: {
    key: 'comic-user',
    storage: localStorage,
  },
})
