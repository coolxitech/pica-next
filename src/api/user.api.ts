import request from '@/api/http'
import type { ApiResponse, PageResult } from '@/types/common'
import { getPreferredServer } from '@/utils/image-url'
import type { Comic } from '@/types/comic'

export interface LoginParams {
  email?: string
  username?: string
  password: string
}

export interface RegisterParams {
  email: string
  username: string
  password: string
}

export interface UserAvatar {
  originalName: string
  path: string
  fileServer: string
}

export interface UserProfile {
  _id: string
  birthday: string
  email: string
  gender: string
  name: string
  slogan: string
  title: string
  verified: boolean
  exp: number
  level: number
  characters: string[]
  created_at: string
  avatar: UserAvatar
  isPunched: boolean
  character: string
}

/** 递归转换对象中的 fileServer（头像除外，保留响应原始 fileServer） */
function transformResponse(data: any, parentKey?: string): any {
  if (!data || typeof data !== 'object') return data
  
  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => transformResponse(item, parentKey))
  }
  
  const result: any = {}
  for (const key in data) {
    if (key === 'fileServer' && typeof data[key] === 'string') {
      if (parentKey === 'avatar') {
        result[key] = data[key]
      } else {
        const preferred = getPreferredServer()
        result[key] = preferred ?? data[key]
      }
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      result[key] = transformResponse(data[key], key)
    } else {
      result[key] = data[key]
    }
  }
  return result
}

/** 兜底回填 avatar/thumb 的 fileServer，确保使用接口原始值 */
function restoreAvatarFileServer(source: any, target: any): any {
  if (!source || !target || typeof source !== 'object' || typeof target !== 'object') return target
  if (Array.isArray(source) && Array.isArray(target)) {
    const len = Math.min(source.length, target.length)
    for (let i = 0; i < len; i++) restoreAvatarFileServer(source[i], target[i])
    return target
  }

  for (const key in source) {
    if (key === 'avatar' && source[key] && target[key] && typeof source[key] === 'object' && typeof target[key] === 'object') {
      if (typeof source[key].fileServer === 'string') {
        target[key].fileServer = source[key].fileServer
      }
    }
    if (key === 'thumb' && source[key] && target[key] && typeof source[key] === 'object' && typeof target[key] === 'object') {
      if (typeof source[key].fileServer === 'string') {
        target[key].fileServer = source[key].fileServer
      }
    }
    restoreAvatarFileServer(source[key], target[key])
  }
  return target
}

type R<T> = Promise<ApiResponse<T>>

/** 登录 */
export const login = async (params: LoginParams): R<{ token: string }> => {
  const normalized = {
    email: params.email ?? params.username ?? '',
    password: params.password,
  }
  const response = await request.post('/auth/sign-in', normalized)
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 注册 */
export const register = async (params: RegisterParams): R<{ token: string; user: UserProfile }> => {
  const response = await request.post('/auth/register', params)
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 获取个人信息 */
export const getProfile = async (): R<{ user: UserProfile }> => {
  const response = await request.get('/users/profile')
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 每日签到 */
export const punchIn = async (): R<{ res: { status: string; punchInLastDay: string } }> => {
  const response = await request.post('/users/punch-in')
  const data = restoreAvatarFileServer(response.data, transformResponse(response.data))
  return {
    code: response.code,
    message: response.message,
    data,
  }
}

/** 获取收藏漫画列表 */
export const getFavourites = async (params: {
  page?: number
  s?: 'dd' | 'da' | 'ld' | 'vd'
  limit?: number
}): R<{ comics: PageResult<Comic> }> => {
  const response = await request.get('/users/favourite', { params })
  // 收藏列表保留接口原始 fileServer，避免封面被替换为固定图片服务器
  const data = response.data
  return {
    code: response.code,
    message: response.message,
    data,
  }
}
