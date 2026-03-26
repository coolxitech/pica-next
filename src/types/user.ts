export interface UserAvatar {
  originalName: string
  path: string
  fileServer: string
}

export interface UserInfo {
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

export interface CommentUser {
  _id: string
  gender: string
  name: string
  title: string
  verified: boolean
  exp: number
  level: number
  characters: string[]
  role: string
  avatar?: UserAvatar
  slogan?: string
  character?: string
}
