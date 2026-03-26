# Pica Next

基于 Vue 3 + TypeScript + Vite 的漫画浏览前端项目，包含登录注册、首页推荐、分类筛选、详情页、阅读器、收藏与历史等核心功能。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia + pinia-plugin-persistedstate
- Tailwind CSS v4 + shadcn-vue
- Axios

## 环境要求

- Node.js 18+
- pnpm 8+

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境（默认端口 8891）
pnpm dev
```

启动后访问：`http://localhost:8891`

## 环境变量

复制 `.env.example` 为 `.env` 并按需填写：

```bash
VITE_API_BASE_URL=
VITE_IMAGE_BASE_URL=
```

说明：
- `VITE_API_BASE_URL`：后端 API 地址
- `VITE_IMAGE_BASE_URL`：图片服务地址

## 使用前提（必须先部署 API）

本项目是前端工程，必须有可用的后端 API 和图片服务才可正常使用。  
如果不部署后端或不配置反向代理，页面会出现请求失败、图片无法加载等问题。

推荐做法：
- 先部署你的 API 服务（或可访问的上游 API）
- 用 Nginx 做反向代理，统一对外提供地址
- 在 `.env` 里填写代理后的地址

示例：

```bash
VITE_API_BASE_URL=https://your-domain.com/api
VITE_IMAGE_BASE_URL=https://your-domain.com/img
```

## 可用脚本

```bash
# 本地开发
pnpm dev

# 类型检查 + 生产构建
pnpm build

# 预览生产构建结果
pnpm preview
```

## 目录结构

```text
src/
  api/          # 接口请求封装
  components/   # 通用组件
  composables/  # 组合式逻辑
  pages/        # 页面级组件
  router/       # 路由配置
  store/        # Pinia 状态管理
  types/        # TypeScript 类型定义
  utils/        # 工具函数与请求封装
```

## 构建与部署

执行 `pnpm build` 后，产物默认输出到 `dist/` 目录，可通过静态服务器或 Nginx 部署。

## Nginx 配置示例

下面给出一个完整示例：同一域名下提供前端静态资源，并把 `/api`、`/img` 分别反代到 API 服务和图片服务。

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    root /var/www/pica-next/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反代
    location ^~ /api/ {
        proxy_pass https://picaapi.go2778.com/;
        proxy_set_header Host picaapi.go2778.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_server_name on;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # 图片服务反代
    location ^~ /img/ {
        proxy_pass https://img.safedataplj.com/;
        proxy_set_header Host img.safedataplj.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_server_name on;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

如果你想直接使用仓库中的配置片段，也可以参考：
- [nginx.conf](E:/Project/Web/pica-next/nginx.conf)
