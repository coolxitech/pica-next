<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, ArrowUp } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import { getProfile } from '@/api/user'
import { useUserStore } from '@/store/user'
import Navbar from '@/components/Navbar.vue'
import BottomNav from '@/components/BottomNav.vue'

useTheme()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const AUTH_ROUTES = ['/login', '/register']
const showChrome = computed(() => !AUTH_ROUTES.includes(route.path) && !route.path.includes('/chapter/'))
const showFilterFab = computed(() => showChrome.value && route.path !== '/filter')

const showBackTop = ref(false)

function onScroll() {
  showBackTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  if (!userStore.token) return
  try {
    const res = await getProfile()
    userStore.setProfile(res.data.user)
  } catch {
    // 忽略刷新失败，避免影响主流程
  }
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
    <Navbar v-if="showChrome" />
    <main class="flex-1 min-w-0" :class="showChrome ? 'pt-14 pb-16 md:pb-0' : ''">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['ComicListPage', 'SearchPage', 'HomePage']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
    <BottomNav v-if="showChrome" />

    <!-- 移动端筛选浮动按钮 -->
    <button
      v-if="showFilterFab"
      class="md:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-2xl gradient-primary text-white float-glow flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-150 hover:shadow-xl hover:shadow-primary/40"
      aria-label="内容筛选"
      @click="router.push('/filter')"
    >
      <Filter class="w-5 h-5" />
    </button>

    <!-- 回到顶部按钮 -->
    <Transition name="back-top">
      <button
        v-if="showChrome && showBackTop"
        class="fixed bottom-20 right-4 md:bottom-8 z-50 w-12 h-12 rounded-2xl bg-card border border-border text-muted-foreground float-glow flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-150 hover:text-primary hover:border-primary/40"
        :class="showFilterFab ? 'md:right-4 bottom-36' : ''"
        aria-label="回到顶部"
        @click="scrollToTop"
      >
        <ArrowUp class="w-5 h-5" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.page-enter-active {
  animation: pageEnter 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.page-leave-active {
  animation: pageLeave 0.22s cubic-bezier(0.4, 0, 1, 1) both;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes pageLeave {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(1.01);
    filter: blur(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    animation: none;
  }
}

.back-top-enter-active {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.back-top-leave-active {
  animation: scaleIn 0.15s cubic-bezier(0.4, 0, 1, 1) reverse both;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
