import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user.store'

export function useSearchHistory() {
  const userStore = useUserStore()
  const { searchHistory } = storeToRefs(userStore)

  function add(keyword: string) {
    userStore.addSearchHistory(keyword)
  }

  function remove(keyword: string) {
    userStore.searchHistory = userStore.searchHistory.filter(k => k !== keyword)
  }

  function clear() {
    userStore.searchHistory = []
  }

  return {
    history: searchHistory,
    add,
    remove,
    clear,
  }
}
