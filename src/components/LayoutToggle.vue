<script setup lang="ts">
import { computed } from 'vue'
import { LayoutGrid, List } from 'lucide-vue-next'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const layout = computed(() => userStore.comicListLayout)

function setLayout(val: 'grid' | 'list') {
  userStore.comicListLayout = val
}
</script>

<template>
  <div class="flex items-center gap-1 bg-muted rounded-lg p-0.5">
    <button
      class="flex items-center justify-center w-9 h-9 rounded-md cursor-pointer transition-all duration-200 min-w-[44px] min-h-[44px]"
      :class="layout === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-gray-600 dark:text-gray-300 hover:text-foreground'"
      @click="setLayout('grid')"
      aria-label="网格布局"
    >
      <LayoutGrid class="w-4 h-4" />
    </button>
    <button
      class="flex items-center justify-center w-9 h-9 rounded-md cursor-pointer transition-all duration-200 min-w-[44px] min-h-[44px]"
      :class="layout === 'list' ? 'bg-background shadow-sm text-primary' : 'text-gray-600 dark:text-gray-300 hover:text-foreground'"
      @click="setLayout('list')"
      aria-label="列表布局"
    >
      <List class="w-4 h-4" />
    </button>
  </div>
</template>
