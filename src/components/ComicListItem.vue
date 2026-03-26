<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Comic } from '@/types/index'
import placeholderImg from '@/assets/placeholder.jpg'
import { buildComicImageUrl } from '@/utils/imageServer'

const props = defineProps<{ comic: Comic }>()
const route = useRoute()

const coverSrc = computed(() => {
  if (!props.comic.thumb?.path) return ''
  if (route.path.startsWith('/favorites')) {
    if (/^https?:\/\//i.test(props.comic.thumb.path)) return props.comic.thumb.path
    const base = (props.comic.thumb.fileServer ?? '').replace(/\/$/, '')
    const cleanPath = props.comic.thumb.path
      .replace(/^\/+/, '')
      .replace(/^static\//, '')
    if (!base) return cleanPath
    return `${base}/static/${cleanPath}`
  }
  return buildComicImageUrl(props.comic.thumb.fileServer, props.comic.thumb.path)
})
</script>

<template>
  <RouterLink
    :to="`/comic/${comic._id}`"
    class="group flex gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 cursor-pointer transition-all duration-300 card-glow min-w-0 animate-fade-up"
  >
    <!-- Thumbnail -->
    <div class="relative shrink-0 w-16 rounded-xl overflow-hidden bg-muted" style="height: 88px;">
      <img
        v-if="comic.thumb?.path"
        :src="coverSrc"
        :alt="comic.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
        @error="(e) => ((e.target as HTMLImageElement).src = placeholderImg)"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-xl font-black text-primary/30">
        {{ comic.title.charAt(0) }}
      </div>
      <span
        v-if="comic.finished"
        class="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
      >
        完结
      </span>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
      <div class="space-y-0.5 min-w-0">
        <p class="text-sm font-semibold text-foreground line-clamp-2 leading-snug break-words">{{ comic.title }}</p>
        <p class="text-xs text-muted-foreground truncate">{{ comic.author }}</p>
      </div>
      <div class="flex flex-wrap gap-1 mt-1">
        <span
          v-for="cat in comic.categories.slice(0, 2)"
          :key="cat"
          class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
        >{{ cat }}</span>
      </div>
    </div>
  </RouterLink>
</template>
