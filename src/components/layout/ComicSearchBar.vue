<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, Clock } from 'lucide-vue-next'
import { useSearchHistory } from '@/composables/useSearchHistory'

const router = useRouter()
const { history, add, remove, clear } = useSearchHistory()

const query = ref('')
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const hasHistory = computed(() => history.value.length > 0)

function onFocus() { showDropdown.value = true }
function onBlur() { setTimeout(() => { showDropdown.value = false }, 200) }

function submit() {
  const q = query.value.trim()
  if (!q) return
  add(q)
  showDropdown.value = false
  router.push({ path: '/search', query: { q } })
}

function selectHistory(keyword: string) {
  query.value = keyword
  add(keyword)
  showDropdown.value = false
  router.push({ path: '/search', query: { q: keyword } })
}

function clearQuery() {
  query.value = ''
  showDropdown.value = true
  inputRef.value?.focus()
}
</script>

<template>
  <div class="relative w-full max-w-md">
    <div
      class="flex items-center gap-2 bg-muted/60 rounded-xl px-3 h-9 border border-border focus-within:border-primary focus-within:bg-background focus-within:shadow-sm transition-all duration-200"
    >
      <Search class="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        placeholder="搜索漫画..."
        class="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground min-w-0"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter="submit"
      />
      <button
        v-if="query"
        class="cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center justify-center w-5 h-5 rounded-full hover:bg-border"
        @click="clearQuery"
      >
        <X class="w-3 h-3" />
      </button>
    </div>

    <!-- History dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown && hasHistory"
        class="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
      >
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">搜索历史</span>
          <button
            class="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors duration-200 px-2 py-1 rounded-lg hover:bg-primary/10"
            @click="clear"
          >
            清除
          </button>
        </div>
        <ul class="py-1">
          <li
            v-for="keyword in history"
            :key="keyword"
            class="flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent cursor-pointer transition-colors duration-150 group"
            @click="selectHistory(keyword)"
          >
            <Clock class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span class="flex-1 text-sm text-foreground truncate">{{ keyword }}</span>
            <button
              class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer p-1 rounded-lg hover:bg-border"
              @click.stop="remove(keyword)"
            >
              <X class="w-3 h-3" />
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
