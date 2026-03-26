import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_KEY  = 'C69BAF41DA5ABD1FFEDC6D2FEA56B'
const HMAC_KEY = '~d}$Q7$eIni=V)9\\RK/P.RM4;9[7|@/CA}b~OW!3?EV`:<>M7pddUBL5n|0/*Cn'
const NONCE_CHARS = 'abcdefhijkmnprstwxyz2345678'
const NONCE = generateNonce()

function generateNonce(length = 32): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += NONCE_CHARS[Math.floor(Math.random() * NONCE_CHARS.length)]
  }
  return result
}

async function hmacSha256(message: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function buildSignature(pathForSign: string, timestamp: string, method: string): Promise<string> {
  const raw = (pathForSign + timestamp + NONCE + method + API_KEY).toLowerCase()
  return hmacSha256(raw, HMAC_KEY)
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'accept': 'application/vnd.picacomic.com.v1+json',
  },
}) as Omit<
  AxiosInstance,
  'request' | 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch' | 'postForm' | 'putForm' | 'patchForm'
> & {
  request<T = any, D = any>(config: AxiosRequestConfig<D>): Promise<T>
  get<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  delete<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  head<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  options<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  patch<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  postForm<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  putForm<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  patchForm<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
}

request.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const method    = (config.method ?? 'get').toUpperCase()

    let pathForSign = (config.url ?? '/').replace(/^\//, '')
    if (method === 'GET' && config.params && Object.keys(config.params).length > 0) {
      pathForSign += '?' + new URLSearchParams(config.params).toString()
    }

    const signature = await buildSignature(pathForSign, timestamp, method)

    config.headers['content-type'] = 'application/json; charset=UTF-8'

    // 从 pinia persist 存储中读取 token
    const token = (() => {
      try {
        const raw = localStorage.getItem('comic-user')
        return raw ? JSON.parse(raw)?.token : null
      } catch { return null }
    })()
    if (token) config.headers['authorization'] = token

    config.headers['app-channel']   = '1'
    config.headers['app-platform']  = 'android'
    config.headers['app-uuid']      = 'webUUIDv2'
    config.headers['app-version']   = '20251017'
    config.headers['image-quality'] = localStorage.getItem('image-quality') ?? 'medium'
    config.headers['nonce']         = NONCE
    config.headers['time']          = timestamp
    config.headers['signature']     = signature

    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('comic-user')
      try {
        const { useUserStore } = await import('@/store/user')
        const userStore = useUserStore()
        userStore.logout()
      } catch {
        // ignore store cleanup failure, keep redirect behavior
      }
      const { default: router } = await import('../router/index')
      const currentPath = router.currentRoute.value.fullPath
      const isAuthRoute = currentPath === '/login' || currentPath === '/register'
      if (!isAuthRoute) {
        router.push({ path: '/login', query: { redirect: currentPath } })
      }
    }
    return Promise.reject(error)
  },
)

export default request
