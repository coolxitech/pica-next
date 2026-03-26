<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, LogOut, Zap, Heart, History, ChevronRight } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'
import CheckInCard from '@/components/user/CheckInCard.vue'
import { punchIn, getProfile } from '@/api/user.api'
import placeholderAvatar from '@/assets/placeholder_avatar.png'

const router = useRouter()
const userStore = useUserStore()

const EXP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]

const userInfo = computed(() => userStore.userInfo)
const userAvatarUrl = computed(() => {
  if (userInfo.value?.avatar?.fileServer && userInfo.value?.avatar?.path) {
    return `${userInfo.value.avatar.fileServer}/static/${userInfo.value.avatar.path}`
  }
  return placeholderAvatar
})
const exp = computed(() => userInfo.value?.exp ?? userStore.exp)
const level = computed(() => userInfo.value?.level ?? userStore.expLevel)

const currentLevelExp = computed(() => EXP_THRESHOLDS[level.value] ?? 0)
const nextLevelExp = computed(() => EXP_THRESHOLDS[level.value + 1] ?? EXP_THRESHOLDS[EXP_THRESHOLDS.length - 1])
const expProgress = computed(() => {
  const range = nextLevelExp.value - currentLevelExp.value
  if (range <= 0) return 100
  return Math.min(100, Math.round(((exp.value - currentLevelExp.value) / range) * 100))
})
const isMaxLevel = computed(() => level.value >= EXP_THRESHOLDS.length - 1)
const checkInLoading = ref(false)

const toast = ref<{ message: string; visible: boolean }>({ message: '', visible: false })

function showToast(msg: string) {
  toast.value = { message: msg, visible: true }
  setTimeout(() => { toast.value.visible = false }, 3000)
}

async function handleCheckIn() {
  if (checkInLoading.value) return
  checkInLoading.value = true
  try {
    const res = await punchIn()
    const { punchInLastDay } = res.data.res
    userStore.checkIn(punchInLastDay)
    const profileRes = await getProfile()
    userStore.setProfile(profileRes.data.user)
    showToast('签到成功')
  } catch (e: unknown) {
    const errMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
    if (errMsg.toLowerCase().includes('punch') || errMsg.includes('已')) {
      showToast('今日已签到')
    } else {
      showToast('签到失败，请稍后重试')
    }
  } finally {
    checkInLoading.value = false
  }
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  try {
    const res = await getProfile()
    userStore.setProfile(res.data.user)
  } catch { /* 静默失败 */ }
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20 overflow-x-hidden">
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-fade-up">

      <!-- User Info Card -->
      <div class="relative rounded-3xl overflow-hidden border border-border">
        <!-- Background gradient -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div class="relative p-5 space-y-4">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="relative shrink-0">
              <div class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/30 shadow-lg animate-float">
                <img
                  :src="userAvatarUrl"
                  :alt="userInfo?.name ?? '用户头像'"
                  class="w-full h-full object-cover"
                />
              </div>
              <!-- Level badge -->
              <div class="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                Lv{{ level }}
              </div>
            </div>

            <!-- Name & Email -->
            <div class="flex-1 min-w-0 space-y-1">
              <p class="text-lg font-bold text-foreground truncate">
                {{ userInfo?.name ?? '用户' }}
              </p>
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail class="w-3.5 h-3.5 shrink-0" />
                <span class="truncate">{{ userInfo?.email ?? '' }}</span>
              </div>
            </div>
          </div>

          <!-- EXP Progress -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5">
                <Zap class="w-3.5 h-3.5 text-yellow-500" />
                <span class="font-bold text-foreground">{{ exp }} EXP</span>
              </div>
              <span v-if="!isMaxLevel" class="text-muted-foreground">
                距 Lv{{ level + 1 }} 还需 {{ nextLevelExp - exp }} EXP
              </span>
              <span v-else class="text-primary font-semibold">已达最高等级</span>
            </div>
            <div class="h-2 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full gradient-primary rounded-full transition-all duration-700 ease-out"
                :style="{ width: `${expProgress}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Check-in Card -->
      <CheckInCard :loading="checkInLoading" @check-in="handleCheckIn" />

      <!-- Quick Links -->
      <div class="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
        <RouterLink
          to="/favorites"
          class="flex items-center gap-3 px-5 py-4 hover:bg-accent cursor-pointer transition-colors duration-150"
        >
          <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Heart class="w-4.5 h-4.5 text-primary" />
          </div>
          <span class="flex-1 text-sm font-semibold text-foreground">我的收藏</span>
          <ChevronRight class="w-4 h-4 text-muted-foreground" />
        </RouterLink>
        <RouterLink
          to="/history"
          class="flex items-center gap-3 px-5 py-4 hover:bg-accent cursor-pointer transition-colors duration-150"
        >
          <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <History class="w-4.5 h-4.5 text-primary" />
          </div>
          <span class="flex-1 text-sm font-semibold text-foreground">阅读历史</span>
          <ChevronRight class="w-4 h-4 text-muted-foreground" />
        </RouterLink>
      </div>

      <!-- Logout -->
      <button
        class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-border text-sm font-semibold text-destructive hover:bg-destructive/5 hover:border-destructive/30 cursor-pointer transition-all duration-200"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4" />
        退出登录
      </button>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast.visible"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap max-w-[90vw] text-center"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
