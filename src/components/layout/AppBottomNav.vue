<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Home, Search, User, Settings } from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { label: '首页', icon: Home, to: '/' },
  { label: '搜索', icon: Search, to: '/search' },
  { label: '设置', icon: Settings, to: '/settings' },
  { label: '我的', icon: User, to: '/user' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/90 backdrop-blur-xl animate-fade-up bottom-nav-glow">
    <ul class="flex items-center justify-around h-16 px-1">
      <li v-for="item in navItems" :key="item.to" class="flex-1">
        <RouterLink
          :to="item.to"
          class="flex flex-col items-center justify-center gap-1 min-h-[52px] cursor-pointer transition-all duration-200 relative"
          :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 transition-transform duration-200"
            :class="isActive(item.to) ? 'scale-110' : ''"
          />
          <span class="text-[9px] leading-none font-medium">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
