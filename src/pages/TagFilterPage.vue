<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp, Plus, X, Check } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'

const userStore = useUserStore()

const whiteInput = ref('')
const blackInput = ref('')

const presets = [
  {
    id: 'bl_femboy',
    name: '耽美相关',
    description: '屏蔽耽美、伪娘等相关内容',
    keywords: ['耽美花園', '偽娘哲學', '扶他樂園', '耽美', '偽娘', '扶他', 'BL', '腐向', '男同', '伪娘'],
  },
  {
    id: 'ai_art',
    name: 'AI作画',
    description: '屏蔽AI生成的作品内容',
    keywords: ['AI作畫', 'AI作画', 'AI绘画', 'AI生成', 'AI画作', 'Midjourney', 'Stable Diffusion', 'NovelAI', 'AI创作', 'AI艺术'],
  },
  {
    id: 'ntr',
    name: 'NTR相关',
    description: '屏蔽牛头人等争议内容',
    keywords: ['NTR', '牛头人', '绿帽', '寝取', '寝取られ', 'Netorare', '出轨', '背叛', '绿化', '牛头'],
  },
  {
    id: 'heavy',
    name: '重口',
    description: '屏蔽重口味暴力内容',
    keywords: ['SM', '重口地帶', '強暴', '輪姦', '凌辱'],
  },
]

const expanded = ref<Record<string, boolean>>({})
const toggleExpand = (id: string) => { expanded.value[id] = !expanded.value[id] }

// ── 白名单 ──
function addWhite() {
  const v = whiteInput.value.trim()
  if (!v || userStore.tagFilter.whitelist.includes(v)) { whiteInput.value = ''; return }
  const whitelist = [...userStore.tagFilter.whitelist, v]
  userStore.saveTagFilter({ ...userStore.tagFilter, whitelist, mode: 'whitelist' })
  whiteInput.value = ''
}

function removeWhite(item: string) {
  const whitelist = userStore.tagFilter.whitelist.filter(w => w !== item)
  const mode = whitelist.length === 0 && userStore.tagFilter.mode === 'whitelist' ? 'none' : userStore.tagFilter.mode
  userStore.saveTagFilter({ ...userStore.tagFilter, whitelist, mode })
}

// ── 黑名单 ──
function addBlack() {
  const v = blackInput.value.trim()
  if (!v || userStore.tagFilter.blacklist.includes(v)) { blackInput.value = ''; return }
  const blacklist = [...userStore.tagFilter.blacklist, v]
  const mode = userStore.tagFilter.mode !== 'whitelist' ? 'blacklist' : userStore.tagFilter.mode
  userStore.saveTagFilter({ ...userStore.tagFilter, blacklist, mode })
  blackInput.value = ''
}

function removeBlack(item: string) {
  const blacklist = userStore.tagFilter.blacklist.filter(b => b !== item)
  const mode = blacklist.length === 0 && userStore.tagFilter.mode === 'blacklist' ? 'none' : userStore.tagFilter.mode
  userStore.saveTagFilter({ ...userStore.tagFilter, blacklist, mode })
}

// ── 预设 ──
function addedCount(keywords: string[]) {
  return keywords.filter(k => userStore.tagFilter.blacklist.includes(k)).length
}

function addAllPreset(keywords: string[]) {
  const blacklist = [...new Set([...userStore.tagFilter.blacklist, ...keywords])]
  const mode = userStore.tagFilter.mode !== 'whitelist' ? 'blacklist' : userStore.tagFilter.mode
  userStore.saveTagFilter({ ...userStore.tagFilter, blacklist, mode })
}

function removeAllPreset(keywords: string[]) {
  const blacklist = userStore.tagFilter.blacklist.filter(b => !keywords.includes(b))
  const mode = blacklist.length === 0 && userStore.tagFilter.mode === 'blacklist' ? 'none' : userStore.tagFilter.mode
  userStore.saveTagFilter({ ...userStore.tagFilter, blacklist, mode })
}

function toggleKeyword(k: string) {
  if (userStore.tagFilter.blacklist.includes(k)) {
    removeBlack(k)
  } else {
    addBlack()
    // 直接处理，不走 input
    const blacklist = [...userStore.tagFilter.blacklist, k]
    const mode = userStore.tagFilter.mode !== 'whitelist' ? 'blacklist' : userStore.tagFilter.mode
    userStore.saveTagFilter({ ...userStore.tagFilter, blacklist, mode })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 class="text-xl font-bold text-foreground">内容筛选</h1>

      <!-- 白名单 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
          <span class="text-sm font-semibold text-foreground">白名单</span>
          <span class="text-xs text-muted-foreground">只显示包含以下标签的漫画</span>
        </div>

        <div class="rounded-xl bg-card border border-border p-4 space-y-3">
          <div class="flex flex-wrap gap-2 min-h-[32px]">
            <span
              v-for="item in userStore.tagFilter.whitelist"
              :key="item"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
            >
              {{ item }}
              <button class="opacity-60 hover:opacity-100 cursor-pointer transition-opacity" @click="removeWhite(item)">
                <X class="w-3 h-3" />
              </button>
            </span>
            <span v-if="userStore.tagFilter.whitelist.length === 0" class="text-xs text-muted-foreground">暂无</span>
          </div>

          <div class="flex gap-2">
            <input
              v-model="whiteInput"
              type="text"
              placeholder="输入标签后回车添加"
              class="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none border border-transparent focus:border-green-400 transition-colors"
              @keydown.enter="addWhite"
            />
            <button
              class="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium cursor-pointer hover:bg-green-600 transition-colors"
              @click="addWhite"
            >
              <Plus class="w-3.5 h-3.5" />添加
            </button>
          </div>
        </div>
      </section>

      <!-- 黑名单 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
          <span class="text-sm font-semibold text-foreground">黑名单</span>
          <span class="text-xs text-muted-foreground">屏蔽包含以下标签的漫画</span>
        </div>

        <div class="rounded-xl bg-card border border-border p-4 space-y-3">
          <div class="flex flex-wrap gap-2 min-h-[32px]">
            <span
              v-for="item in userStore.tagFilter.blacklist"
              :key="item"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
            >
              {{ item }}
              <button class="opacity-60 hover:opacity-100 cursor-pointer transition-opacity" @click="removeBlack(item)">
                <X class="w-3 h-3" />
              </button>
            </span>
            <span v-if="userStore.tagFilter.blacklist.length === 0" class="text-xs text-muted-foreground">暂无</span>
          </div>

          <div class="flex gap-2">
            <input
              v-model="blackInput"
              type="text"
              placeholder="输入标签后回车添加"
              class="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none border border-transparent focus:border-red-400 transition-colors"
              @keydown.enter="addBlack"
            />
            <button
              class="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-medium cursor-pointer hover:bg-red-600 transition-colors"
              @click="addBlack"
            >
              <Plus class="w-3.5 h-3.5" />添加
            </button>
          </div>
        </div>
      </section>

      <!-- 一键屏蔽预设 -->
      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
          <span class="text-sm font-semibold text-foreground">一键屏蔽</span>
          <span class="text-xs text-muted-foreground">快速添加常见屏蔽词组</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="preset in presets"
            :key="preset.id"
            class="rounded-xl bg-card border border-border overflow-hidden hover:border-red-200 dark:hover:border-red-800 transition-colors"
          >
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-3 p-4">
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="text-sm font-semibold text-foreground">{{ preset.name }}</span>
                <span class="text-xs text-muted-foreground">{{ preset.description }}</span>
              </div>
              <span class="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                {{ addedCount(preset.keywords) }}/{{ preset.keywords.length }}
              </span>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 px-4 pb-3 -mt-1">
              <button
                class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-150"
                :class="addedCount(preset.keywords) === preset.keywords.length
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'bg-card text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950'"
                @click="addedCount(preset.keywords) === preset.keywords.length ? removeAllPreset(preset.keywords) : addAllPreset(preset.keywords)"
              >
                <X v-if="addedCount(preset.keywords) === preset.keywords.length" class="w-3 h-3" />
                <Plus v-else class="w-3 h-3" />
                {{ addedCount(preset.keywords) === preset.keywords.length ? '删除全部' : '添加全部' }}
              </button>
              <button
                class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground cursor-pointer hover:border-foreground/30 hover:text-foreground transition-all duration-150"
                @click="toggleExpand(preset.id)"
              >
                <ChevronUp v-if="expanded[preset.id]" class="w-3 h-3" />
                <ChevronDown v-else class="w-3 h-3" />
                {{ expanded[preset.id] ? '收起' : '展开' }}
              </button>
            </div>

            <!-- 展开的关键词 -->
            <div v-if="expanded[preset.id]" class="px-4 pb-4 border-t border-border pt-3">
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="kw in preset.keywords"
                  :key="kw"
                  class="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150 text-left overflow-hidden"
                  :class="userStore.tagFilter.blacklist.includes(kw)
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                    : 'bg-muted border-transparent text-muted-foreground hover:border-red-200 dark:hover:border-red-800 hover:text-red-600'"
                  @click="toggleKeyword(kw)"
                >
                  <Check v-if="userStore.tagFilter.blacklist.includes(kw)" class="w-3 h-3 shrink-0" />
                  <span class="truncate">{{ kw }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
