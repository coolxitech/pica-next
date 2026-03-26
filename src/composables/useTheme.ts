import { watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/user'
import { applyThemeColor, applyColorMode } from '@/utils/theme'

export function useTheme() {
  const userStore = useUserStore()
  const { appearance } = storeToRefs(userStore)

  // Handle system preference changes when mode is 'system'
  let mediaQuery: MediaQueryList | null = null

  function onSystemPreferenceChange() {
    if (appearance.value.colorMode === 'system') {
      applyColorMode('system')
    }
  }

  function applyAll() {
    applyThemeColor(appearance.value.themeColor)
    applyColorMode(appearance.value.colorMode)
  }

  // Watch for appearance changes and re-apply
  watch(
    appearance,
    (val) => {
      applyThemeColor(val.themeColor)
      applyColorMode(val.colorMode)
    },
    { deep: true }
  )

  onMounted(() => {
    // Apply on mount
    applyAll()

    // Listen for system color scheme changes
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemPreferenceChange)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', onSystemPreferenceChange)
  })

  return { applyAll }
}
