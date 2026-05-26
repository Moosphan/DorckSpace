<div align="center">

# DorckDashboard

**本地优先的个人生产力工作空间 (macOS)**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm)](https://pnpm.io/)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## 项目简介

DorckDashboard 是一款**本地优先**、注重隐私的生产力工作空间，基于 Electron + React 构建。所有数据存储在本地 -- 无需云端同步，无需注册账号，无追踪。它将项目管理、内容创作、媒体整理、RSS 阅读和 AI 工具管理整合到一个精心设计的桌面应用中。

采用 **"Vibrant Workspace"** 设计语言 -- 融合现代极简主义与柔和几何风格，配备 Material Design 3 色彩体系、紫色调环境阴影和药丸形交互元素。

---

## 功能特性

### 仪表盘 (Dashboard)
- **聚焦项目** -- 置顶当前主项目，实时追踪进度
- **优先级任务** -- 支持高/中/低优先级标签，行内创建，快速操作
- **实时时钟与天气** -- 秒级时钟更新，可配置城市的实时天气 (wttr.in API)
- **活跃热力图** -- 4 周活动网格，可视化活跃度

### 写作工坊 (Writing Studio)
- **富文本编辑器** -- 基于 Tiptap/ProseMirror 的所见即所得编辑器，完整工具栏（加粗、斜体、标题、列表、代码块、引用、任务列表）
- **源码模式** -- WYSIWYG 与 HTML 源码一键切换
- **自动保存** -- 2 秒防抖持久化
- **多平台发布** -- 导出到博客 (HTML)、Notion、掘金 (Markdown)、微信公众号 (富文本)、Medium
- **分类管理** -- 自定义文章分类

### 视频工坊 (Video Studio)
- **视频封面网格** -- 响应式卡片布局，支持缩略图、时长叠加、状态筛选
- **音频素材库** -- 管理音频文件 (WAV, MP3, M4A, FLAC, OGG)
- **演示文稿管理** -- 导入和整理 HTML 演示文稿

### 洞察 (Insights)
- **RSS 阅读器** -- 订阅源管理，按日期/分类/收藏筛选，标记已读，每 30 分钟自动抓取
- **订阅源管理器** -- 添加/编辑/删除订阅源，URL 验证与标题自动检测；内置 Hacker News、TechCrunch、GitHub Blog、DEV.to 预设
- **社交数据分析** -- 追踪 Bilibili、YouTube、小红书的粉丝数和互动数据

### AI 实验室 (AI Lab)
- **订阅追踪** -- 监控 AI 服务订阅 (OpenAI, Anthropic, Google, Midjourney) 及 Token 用量
- **工具目录** -- 快速访问 8 款 AI 工具 (Claude, ChatGPT, Gemini, Copilot, DALL-E 3, Midjourney, Perplexity, ElevenLabs)
- **内置浏览器** -- 持久化 Webview，带地址栏、导航和快捷访问栏

### 全局功能
- **命令面板** (Cmd+K) -- 跨文章、任务、笔记、草稿的全文搜索，支持键盘导航
- **深色模式** -- 跟随系统自动切换浅色/深色主题
- **模块化架构** -- 通过 `feature.config.ts` 启用/禁用功能模块
- **扩展点系统** -- 4 层级 14 种扩展点类型，支持深度定制

---

## 技术栈

| 层级 | 技术 |
|---|---|
| **运行时** | Electron 33, Node.js |
| **前端** | React 18, TypeScript 5.7, React Router 6 |
| **样式** | Tailwind CSS 3.4, Radix UI, Material Symbols Outlined |
| **状态管理** | Zustand 5 |
| **编辑器** | Tiptap 3 (ProseMirror), lowlight |
| **数据库** | SQLite 3 (better-sqlite3, WAL 模式) |
| **构建** | electron-vite 2, Vite 6, pnpm |
| **打包** | electron-builder |

---

## 系统架构

```
DorckDashboard
├── src/main/              # Electron 主进程
│   ├── database/          # SQLite (22 张表, 6 次迁移, 7 个仓储)
│   ├── ipc/               # IPC 处理器 (8 个模块, 60+ 通道)
│   └── services/          # 天气、RSS 抓取、通知、设置、文件 I/O
├── src/preload/           # 上下文桥接 (类型化的 electronAPI)
├── src/renderer/          # React SPA
│   ├── modules/           # 6 个功能模块
│   ├── components/        # 共享 UI 原语 (13 个组件)
│   ├── stores/            # Zustand 状态库
│   ├── lib/               # 模块注册表、扩展注册表、模块加载器
│   └── hooks/             # IPC 数据/变更 Hooks
└── src/shared/            # 跨进程共享的类型和常量
```

**数据流：** 渲染进程 -> IPC (`invoke`) -> 主进程 -> 仓储层 -> SQLite -> 响应

所有 IPC 处理器返回类型化的 `{ success, data?, error? }` 响应结构。渲染进程通过 `useIpcData`（读取）和 `useIpcMutation`（写入）Hooks 实现响应式数据获取。

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 9

### 安装

```bash
git clone https://github.com/Moosphan/DorckSpace.git
cd DorckSpace
pnpm install
```

### 开发

```bash
pnpm dev
```

### 构建

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

---

## 目录结构

```
├── src/
│   ├── main/                       # Electron 主进程
│   │   ├── database/               # SQLite 层 (连接、迁移、仓储)
│   │   ├── ipc/                    # IPC 处理器模块
│   │   └── services/               # 后台服务
│   ├── preload/                    # 预加载脚本 (上下文桥接)
│   ├── renderer/                   # React 前端
│   │   ├── modules/                # 功能模块
│   │   ├── components/             # 共享 UI 组件
│   │   ├── stores/                 # Zustand 状态库
│   │   ├── lib/                    # 核心库
│   │   └── hooks/                  # 自定义 Hooks
│   └── shared/                     # 共享类型与常量
├── feature.config.ts               # 模块启用/禁用配置
├── tailwind.config.ts              # 设计系统 Token
└── electron.vite.config.ts         # 构建配置
```

---

## 设计系统

**Vibrant Workspace** 设计系统规范：

- **色彩：** Material Design 3 调色板，活力紫主色 (`#6B38D4`)，琥珀副色 (`#FEC300`)，完整的 Surface 层级体系，支持深色模式
- **字体：** 阿里巴巴普惠体 3.0 + Plus Jakarta Sans，字号从 `headline-xl` (40px) 到 `label-sm` (12px)
- **间距：** Base-4 网格系统 (`xs: 4px` 到 `xl: 80px`)
- **形状：** 药丸形按钮/标签，24px 卡片圆角，8px 基础圆角
- **阴影：** 紫色调环境阴影营造层次感
- **图标：** 统一使用 Google Material Symbols Outlined

---

## 数据库

SQLite 数据库，涵盖 6 个领域共 22 张表：

| 领域 | 表 |
|---|---|
| **核心** | `user_profile`, `settings` |
| **仪表盘** | `projects`, `tasks`, `calendar_events`, `activity_log` |
| **写作** | `articles`, `article_publish_records`, `notes`, `drafts` |
| **视频** | `video_assets` |
| **洞察** | `rss_feeds`, `rss_articles`, `social_accounts`, `social_metrics` |
| **AI 实验室** | `ai_subscriptions`, `ai_tools` |

所有数据本地存储于 `<userData>/database/dashboard.db`，启用 WAL 日志模式和外键约束。

---

## 参与贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 开源协议

本项目基于 Apache License 2.0 开源 -- 详见 [LICENSE](LICENSE) 文件。

---

<div align="center">

**由 [Moosphan](https://github.com/Moosphan) 精心打造**

</div>
