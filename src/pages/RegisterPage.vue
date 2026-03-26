<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user.store'
import { register as apiRegister } from '@/api'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({ username: '', email: '', password: '' })
const errors = reactive({ username: '', email: '', password: '' })
const serverError = ref('')
const loading = ref(false)
const showPassword = ref(false)
const ready = ref(false)

onMounted(() => { setTimeout(() => { ready.value = true }, 50) })

function validateUsername(v: string) {
  if (!v) return '请输入用户名'
  if (v.length < 4) return '用户名至少 4 个字符'
  if (v.length > 20) return '用户名最多 20 个字符'
  return ''
}
function validateEmail(v: string) {
  if (!v) return '请输入邮箱'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '邮箱格式不正确'
  return ''
}
function validatePassword(v: string) {
  if (!v) return '请输入密码'
  if (v.length < 8) return '密码至少 8 位'
  if (!/[a-zA-Z]/.test(v)) return '密码需包含字母'
  if (!/[0-9]/.test(v)) return '密码需包含数字'
  return ''
}
function validate() {
  errors.username = validateUsername(form.username)
  errors.email = validateEmail(form.email)
  errors.password = validatePassword(form.password)
  return !errors.username && !errors.email && !errors.password
}

async function handleSubmit() {
  serverError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    const res = await apiRegister({
      username: form.username,
      email: form.email,
      password: form.password,
    })
      userStore.login(res.data.token, res.data.user as import('@/types/user').UserInfo)
    router.push('/')
  } catch (err: any) {
    serverError.value = err?.response?.data?.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-root">
    <!-- 左侧装饰面板 -->
    <div class="deco-panel" aria-hidden="true">
      <div class="deco-bg"></div>
      <div class="deco-title-wrap">
        <span class="deco-kanji">哔</span>
        <span class="deco-kanji deco-kanji-2">咔</span>
      </div>
      <div class="panel-frame panel-frame-1"></div>
      <div class="panel-frame panel-frame-2"></div>
      <div class="panel-frame panel-frame-3"></div>
      <div class="speed-lines" aria-hidden="true">
        <span v-for="i in 12" :key="i" class="speed-line" :style="`--i:${i}`"></span>
      </div>
      <div class="deco-tagline">
        <span>加入我们</span>
        <strong>开始你的故事</strong>
      </div>
    </div>

    <!-- 右侧注册区 -->
    <div class="form-panel">
      <!-- Logo -->
      <div
        class="logo-area animate__animated animate__fadeInDown"
        :style="{ animationDuration: '0.5s', animationDelay: '0s', opacity: ready ? undefined : 0 }"
      >
        <div class="logo-badge">
          <img src="/favicon.png" alt="哔咔漫画" class="w-full h-full object-contain rounded-[10px]" />
        </div>
        <span class="logo-text">哔咔漫画</span>
      </div>

      <!-- 标题 -->
      <div
        class="form-heading animate__animated animate__fadeInUp"
        :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.1s' : '9999s' }"
      >
        <h1>创建账号</h1>
        <p>注册后即可开始阅读</p>
      </div>

      <!-- 卡片 -->
      <div
        class="form-card animate__animated animate__fadeInUp"
        :style="{ animationDuration: '0.55s', animationDelay: ready ? '0.18s' : '9999s' }"
      >
        <Transition name="shake-in">
          <div v-if="serverError" class="server-error" role="alert">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ serverError }}
          </div>
        </Transition>

        <form @submit.prevent="handleSubmit" novalidate>
          <!-- 用户名 -->
          <div
            class="field-group animate__animated animate__fadeInUp"
            :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.25s' : '9999s' }"
          >
            <label for="username" class="field-label">
              用户名
              <span class="field-hint">4-20 个字符</span>
            </label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              placeholder="请输入用户名"
              maxlength="20"
              class="field-input"
              :class="{ 'field-input--error': errors.username }"
              @blur="errors.username = validateUsername(form.username)"
            />
            <Transition name="err-slide">
              <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
            </Transition>
          </div>

          <!-- 邮箱 -->
          <div
            class="field-group animate__animated animate__fadeInUp"
            :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.32s' : '9999s' }"
          >
            <label for="email" class="field-label">邮箱</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="your@email.com"
              class="field-input"
              :class="{ 'field-input--error': errors.email }"
              @blur="errors.email = validateEmail(form.email)"
            />
            <Transition name="err-slide">
              <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
            </Transition>
          </div>

          <!-- 密码 -->
          <div
            class="field-group animate__animated animate__fadeInUp"
            :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.38s' : '9999s' }"
          >
            <label for="password" class="field-label">
              密码
              <span class="field-hint">≥8 位，含字母和数字</span>
            </label>
            <div class="field-input-wrap">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="请输入密码"
                class="field-input field-input--pw"
                :class="{ 'field-input--error': errors.password }"
                @blur="errors.password = validatePassword(form.password)"
              />
              <button
                type="button"
                class="pw-toggle"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
                <Transition name="icon-swap" mode="out-in">
                  <EyeOff v-if="showPassword" key="off" class="w-4 h-4" />
                  <Eye v-else key="on" class="w-4 h-4" />
                </Transition>
              </button>
            </div>
            <Transition name="err-slide">
              <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
            </Transition>
          </div>

          <!-- 提交 -->
          <div
            class="animate__animated animate__fadeInUp"
            :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.44s' : '9999s' }"
          >
            <button
              type="submit"
              :disabled="loading"
              class="submit-btn"
            >
              <Transition name="icon-swap" mode="out-in">
                <Loader2 v-if="loading" key="spin" class="w-4 h-4 animate-spin" />
              </Transition>
              <span>{{ loading ? '注册中...' : '注册' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 登录链接 -->
      <p
        class="register-link animate__animated animate__fadeIn"
        :style="{ animationDuration: '0.5s', animationDelay: ready ? '0.55s' : '9999s' }"
      >
        已有账号？
        <RouterLink to="/login" class="register-link__a">立即登录</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-root {
  min-height: 100svh;
  display: flex;
  background: var(--background);
}

.deco-panel {
  display: none;
  position: relative;
  overflow: hidden;
  flex: 0 0 420px;
  background: linear-gradient(145deg, #DB2777 0%, #9d174d 60%, #831843 100%);
}
@media (min-width: 900px) {
  .deco-panel { display: flex; flex-direction: column; justify-content: flex-end; padding: 3rem; }
}

.deco-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(0,0,0,0.2) 0%, transparent 50%);
}

.deco-title-wrap {
  position: absolute;
  top: -20px;
  right: -30px;
  display: flex;
  flex-direction: column;
  line-height: 1;
  pointer-events: none;
  animation: floatY 6s ease-in-out infinite;
}
.deco-kanji {
  font-size: clamp(8rem, 14vw, 14rem);
  font-weight: 900;
  color: rgba(255,255,255,0.07);
  letter-spacing: -0.05em;
  display: block;
}
.deco-kanji-2 { margin-top: -2rem; color: rgba(255,255,255,0.05); }

.panel-frame {
  position: absolute;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 4px;
}
.panel-frame-1 { width: 120px; height: 80px; top: 15%; left: 10%; transform: rotate(-3deg); }
.panel-frame-2 { width: 80px; height: 100px; top: 28%; left: 22%; transform: rotate(2deg); }
.panel-frame-3 { width: 60px; height: 60px; top: 20%; left: 38%; transform: rotate(-1deg); }

.speed-lines { position: absolute; inset: 0; pointer-events: none; }
.speed-line {
  position: absolute;
  left: 50%; top: 50%;
  width: 2px; height: 60%;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent);
  transform-origin: top center;
  transform: rotate(calc(var(--i) * 30deg)) translateX(-50%);
}

.deco-tagline { position: relative; z-index: 1; color: rgba(255,255,255,0.9); font-size: 1.1rem; line-height: 1.4; }
.deco-tagline strong { display: block; font-size: 2rem; font-weight: 900; color: #fff; letter-spacing: -0.02em; }

@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}

.form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  min-height: 100svh;
}

.logo-area { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 2rem; }
.logo-badge {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #DB2777, #9d174d);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 4px 16px rgba(219,39,119,0.4);
}
.logo-badge svg { width: 22px; height: 22px; }
.logo-text { font-size: 1.5rem; font-weight: 800; color: var(--foreground); letter-spacing: -0.03em; }

.form-heading { text-align: center; margin-bottom: 1.75rem; animation-fill-mode: both; }
.form-heading h1 { font-size: 1.75rem; font-weight: 800; color: var(--foreground); letter-spacing: -0.03em; line-height: 1.2; }
.form-heading p { margin-top: 0.375rem; font-size: 0.875rem; color: var(--muted-foreground); }

.form-card {
  width: 100%; max-width: 380px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08);
  animation-fill-mode: both;
}
:global(.dark) .form-card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}

.server-error {
  display: flex; align-items: center; gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  font-size: 0.8125rem;
}

.field-group { margin-bottom: 1.125rem; animation-fill-mode: both; }
.field-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--foreground); margin-bottom: 0.5rem; letter-spacing: 0.01em; }
.field-hint { font-weight: 400; color: var(--muted-foreground); margin-left: 0.375rem; }

.field-input {
  width: 100%; height: 44px;
  padding: 0 0.875rem;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.9375rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}
.field-input::placeholder { color: var(--muted-foreground); }
.field-input:focus { border-color: #DB2777; box-shadow: 0 0 0 3px rgba(219,39,119,0.15); }
.field-input--error { border-color: #ef4444; }
.field-input--error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }

.field-input-wrap { position: relative; }
.field-input--pw { padding-right: 2.75rem; }
.pw-toggle {
  position: absolute; right: 0; top: 0;
  height: 44px; width: 44px;
  display: flex; align-items: center; justify-content: center;
  color: var(--muted-foreground);
  cursor: pointer; transition: color 0.2s;
  background: none; border: none;
}
.pw-toggle:hover { color: var(--foreground); }
.field-error { margin-top: 0.375rem; font-size: 0.75rem; color: #ef4444; }

.submit-btn {
  width: 100%; height: 46px;
  margin-top: 0.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #DB2777 0%, #be185d 100%);
  color: #fff;
  font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.02em;
  cursor: pointer; border: none;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 4px 16px rgba(219,39,119,0.4);
  position: relative; overflow: hidden;
}
.submit-btn::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(219,39,119,0.5); }
.submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: 0 2px 8px rgba(219,39,119,0.3); }
.submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.register-link { margin-top: 1.5rem; font-size: 0.875rem; color: var(--muted-foreground); animation-fill-mode: both; }
.register-link__a { color: #DB2777; font-weight: 600; text-decoration: none; transition: opacity 0.2s; cursor: pointer; }
.register-link__a:hover { opacity: 0.75; text-decoration: underline; }

.shake-in-enter-active { animation: shakeIn 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
.shake-in-leave-active { transition: opacity 0.2s; }
.shake-in-leave-to { opacity: 0; }
@keyframes shakeIn {
  0%   { transform: translateX(0); opacity: 0; }
  10%  { transform: translateX(-8px); opacity: 1; }
  30%  { transform: translateX(6px); }
  50%  { transform: translateX(-4px); }
  70%  { transform: translateX(3px); }
  90%  { transform: translateX(-1px); }
  100% { transform: translateX(0); }
}

.err-slide-enter-active { transition: all 0.22s ease; }
.err-slide-leave-active  { transition: all 0.18s ease; }
.err-slide-enter-from, .err-slide-leave-to { opacity: 0; transform: translateY(-4px); }

.icon-swap-enter-active, .icon-swap-leave-active { transition: all 0.18s ease; }
.icon-swap-enter-from { opacity: 0; transform: scale(0.6) rotate(-30deg); }
.icon-swap-leave-to   { opacity: 0; transform: scale(0.6) rotate(30deg); }

.animate__animated { animation-fill-mode: both; }

@media (prefers-reduced-motion: reduce) {
  .deco-title-wrap { animation: none; }
  .animate__animated { animation: none !important; opacity: 1 !important; }
}
</style>
