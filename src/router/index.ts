import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.store'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/pages/HomePage.vue') },
    { path: '/category/:tag', component: () => import('@/pages/ComicListPage.vue') },
    { path: '/creator/:id', component: () => import('@/pages/CreatorPage.vue') },
    { path: '/search', component: () => import('@/pages/SearchPage.vue') },
    { path: '/comic/:id', component: () => import('@/pages/ComicDetailPage.vue') },
    { path: '/comic/:id/chapter/:cid', component: () => import('@/pages/ReaderPage.vue') },
    { path: '/favorites', component: () => import('@/pages/FavoritesPage.vue') },
    { path: '/history', component: () => import('@/pages/HistoryPage.vue') },
    { path: '/user', component: () => import('@/pages/UserProfilePage.vue') },
    { path: '/settings', component: () => import('@/pages/SettingsPage.vue') },
    { path: '/filter', component: () => import('@/pages/TagFilterPage.vue') },
    { path: '/login', component: () => import('@/pages/LoginPage.vue') },
    { path: '/register', component: () => import('@/pages/RegisterPage.vue') },
  ],
})

const PUBLIC_ROUTES = ['/login', '/register']

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!PUBLIC_ROUTES.includes(to.path) && !userStore.token) {
    return { path: '/login' }
  }
})

export default router
