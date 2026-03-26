<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { LogIn, Settings, Filter } from 'lucide-vue-next'
import { useUserStore } from '@/store/user'
import placeholderAvatar from '@/assets/placeholder_avatar.png'
import SearchBar from './SearchBar.vue'

const router = useRouter()
const userStore = useUserStore()
const isLoggedIn = computed(() => !!userStore.token)
const avatar = computed(() => userStore.userInfo?.avatar)
const avatarUrl = computed(() => {
  if (avatar.value?.fileServer && avatar.value?.path) {
    return `${avatar.value.fileServer}/static/${avatar.value.path}`
  }
  return placeholderAvatar
})
const username = computed(() => userStore.userInfo?.name)

function goUser() {
  router.push(isLoggedIn.value ? '/user' : '/login')
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl animate-fade-down nav-glow">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3 min-w-0">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2 shrink-0 cursor-pointer min-h-[44px] group">
        <div class="w-8 h-8 rounded-xl overflow-hidden shadow-sm ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-200">
          <img src="/favicon.png" alt="哔咔漫画" class="w-full h-full object-contain" />
        </div>
        <span class="font-bold text-base text-foreground tracking-tight">哔咔漫画</span>
      </RouterLink>

      <!-- SearchBar：仅桌面端显示 -->
      <div class="hidden md:flex flex-1 justify-center px-2 min-w-0">
        <SearchBar />
      </div>

      <!-- 移动端占位，保持头像靠右 -->
      <div class="flex-1 md:hidden" />

      <!-- Right area -->
      <div class="shrink-0 flex items-center gap-0.5">
        <RouterLink
          to="/settings"
          class="hidden md:flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
          aria-label="设置"
        >
          <Settings class="w-4.5 h-4.5" />
        </RouterLink>

        <RouterLink
          to="/filter"
          class="hidden md:flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
          aria-label="内容筛选"
        >
          <Filter class="w-4.5 h-4.5" />
        </RouterLink>

        <button
          class="flex items-center gap-1.5 cursor-pointer min-w-[40px] min-h-[40px] justify-center rounded-xl hover:bg-accent transition-all duration-200"
          @click="goUser"
        >
          <img
            v-if="isLoggedIn"
            :src="avatarUrl"
            :alt="username"
            class="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30"
          />
          <template v-else>
            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <LogIn class="w-4 h-4 text-muted-foreground" />
            </div>
          </template>
        </button>
      </div>
    </div>
  </header>
</template>
