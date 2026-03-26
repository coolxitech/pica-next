<script setup lang="ts">
defineProps<{
  tag: string
}>()
</script>

<template>
  <RouterLink
    :to="`/category/${encodeURIComponent(tag)}`"
    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer transition-all duration-200 select-none border border-primary/20 hover:border-primary hover:shadow-sm animate-scale-bounce"
  >
    {{ tag }}
  </RouterLink>
</template>
