<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Comic } from '@/types/comic'
import placeholderImg from '@/assets/placeholder.jpg'
import { buildComicImageUrl } from '@/utils/image-url'

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
    class="group block cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all duration-300 card-glow min-w-0 animate-scale-in"
  >
    <!-- Cover -->
    <div class="relative aspect-[3/4] overflow-hidden bg-muted">
      <img
        v-if="comic.thumb?.path"
        :src="coverSrc"
        :alt="comic.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
        @error="(e) => ((e.target as HTMLImageElement).src = placeholderImg)"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-3xl font-black text-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
      >
        {{ comic.title.charAt(0) }}
      </div>

      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <!-- Finished badge -->
      <span
        v-if="comic.finished"
        class="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full leading-none shadow-sm"
      >
        完结
      </span>
    </div>

    <!-- Info -->
    <div class="p-2.5 space-y-0.5 min-w-0">
      <p class="text-sm font-semibold text-foreground line-clamp-2 leading-snug break-words">{{ comic.title }}</p>
      <p class="text-xs text-muted-foreground truncate">{{ comic.author }}</p>
    </div>
  </RouterLink>
</template>
