/**
 * 固定图片服务器配置
 */

export interface ServerInfo {
  url: string
  label: string
}

export interface ServerStatus {
  url: string
  label: string
  latency: number | null
  testing: boolean
}

export const FIXED_IMAGE_SERVER = import.meta.env.VITE_IMAGE_BASE_URL || 'https://pica-img.cobra.watch'

export const ALL_SERVERS: ServerInfo[] = [
  { url: FIXED_IMAGE_SERVER, label: 'Cobra' },
]

/** 兼容旧调用：始终返回固定服务器 */
export function getPreferredServer(): string {
  return FIXED_IMAGE_SERVER
}

/** 兼容旧调用：固定服务器模式下无操作 */
export function setPreferredServer(_url: string | null): void {
  // no-op
}

/** 测试固定服务器可用性 */
export async function testServer(_baseUrl: string): Promise<number> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    await fetch(`${FIXED_IMAGE_SERVER}/static/`, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    })
    clearTimeout(timer)
    return Date.now() - start
  } catch {
    return -1
  }
}

export async function retestServer(baseUrl: string): Promise<number> {
  return testServer(baseUrl)
}

function normalizeComicPath(path: string): string {
  return path
    .replace(/tobeimg/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
}

/** 构建图片 URL - 用于漫画（不带 /static/） */
export function buildComicImageUrl(_fileServer: string | undefined, path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = normalizeComicPath(path)
  return `${FIXED_IMAGE_SERVER}/${normalizedPath}`
}

/** 构建图片 URL - 用于分类（带 /static/，不修改 path） */
export function buildCategoryImageUrl(_fileServer: string | undefined, path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.replace(/^\/+/, '')
  return `${FIXED_IMAGE_SERVER}/static/${normalizedPath}`
}

/** img @error 回调：固定切到 cobra */
export async function handleImageError(
  event: Event,
  path: string,
  _triedServers: Set<string> = new Set(),
): Promise<void> {
  const img = event.target as HTMLImageElement
  const normalizedPath = normalizeComicPath(path)
  img.src = `${FIXED_IMAGE_SERVER}/${normalizedPath}`
}

/** 固定服务器模式：预热仅执行一次固定服务器探测 */
export function warmupServers(_servers: string[]): void {
  void testServer(FIXED_IMAGE_SERVER)
}
