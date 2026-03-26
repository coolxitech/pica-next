/**
 * 将 hex 颜色转换为 oklch 字符串（格式：'oklch(L C H)'）
 * 路径：hex → linear RGB → OKLab → OKLCH
 */
export function hexToOklch(hex: string): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean

  // sRGB → linear
  const toLinear = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const r = toLinear(parseInt(full.slice(0, 2), 16) / 255)
  const g = toLinear(parseInt(full.slice(2, 4), 16) / 255)
  const b = toLinear(parseInt(full.slice(4, 6), 16) / 255)

  // linear RGB → OKLab (Björn Ottosson's matrix)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s

  // OKLab → OKLCH
  const C = Math.sqrt(a * a + bVal * bVal)
  let H = Math.atan2(bVal, a) * (180 / Math.PI)
  if (H < 0) H += 360

  const Lp = Math.round(L * 1000) / 1000
  const Cp = Math.round(C * 1000) / 1000
  const Hp = Math.round(H * 10) / 10

  return `oklch(${Lp} ${Cp} ${Hp})`
}

/**
 * 将主题色注入 CSS 变量 --primary 和 --ring（oklch 格式，兼容 Tailwind v4）
 */
export function applyThemeColor(hex: string): void {
  const oklch = hexToOklch(hex)
  document.documentElement.style.setProperty('--primary', oklch)
  document.documentElement.style.setProperty('--ring', oklch)
}

/**
 * 切换色彩模式（light / dark / system）
 */
export function applyColorMode(mode: 'light' | 'dark' | 'system'): void {
  const html = document.documentElement

  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'light') {
    html.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}
