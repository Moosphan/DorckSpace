# P0 可信工作台实施计划

> **执行说明：** 按任务逐项实施。每项任务都必须先写失败测试，再实现、验证、运行应用并等待用户确认，确认后才能提交和进入下一项。

**目标：** 建立可信的本地工作台基础，让 Dashboard 数据真实、可恢复并能直接支持个人行动。

**架构：** 数据持久化和聚合全部留在 Electron 主进程；通过明确的 IPC 通道返回规范化数据；React 只负责渲染视图状态。每个 P0 项目都必须独立测试、运行和确认后再提交。

**技术栈：** Electron 33、React 18、TypeScript 5.7、SQLite/better-sqlite3、Tailwind CSS、Node 内置测试运行器。

## 全局约束

- P0 必须保持本地优先，不依赖云端账户。
- 网络、数据库、备份和密钥操作必须留在主进程。
- 不得向 renderer 暴露 Cookie、access token、API key 或私有 provider 原始响应。
- 未明确标注状态时，不得展示 fixture 数据。
- 使用现有语义化设计 Token 和当前主题色。
- 每个任务都遵循红灯、绿灯、验证、用户确认、提交流程。
- 不得将 .dev-logs/ 加入提交。

---

### 任务 1：用持久化活动替换热力图 mock 数据

**文件：** 新建 activity-log-repository.ts、test-activity-log.ts；修改 tasks.ts、articles.ts、main/index.ts、ActivityHeatmap.tsx 和 package.json。

**产出：** ActivityLogRepository.record()、ActivityLogRepository.getRecentDays() 和 activity:getRecent。

- [ ] 编写失败测试：在 2026-08-28 记录 task_completed 和 article_edited 后，返回一天且强度为 2。
- [ ] 运行 pnpm test:activity，确认因 Repository 和脚本不存在而失败。
- [ ] 按日期和活动类型 upsert，强度上限为 4，并累加持续时间。
- [ ] 仅在任务状态转为 completed 时记录 task_completed；文章内容保存时记录 article_edited。
- [ ] 渲染最近 28 天真实数据和明确空状态，删除 mockData。
- [ ] 运行 pnpm test:activity、pnpm typecheck 和 pnpm lint。
- [ ] 运行 pnpm dev:launchd，观察热力图变化并请求用户确认。
- [ ] 仅在用户确认后执行 git commit -m "feat: track real dashboard activity"。

### 任务 2：构建 Dashboard 今日工作台

**文件：** 新建 dashboard-overview-service.ts、dashboard.ts、TodayOverview.tsx、test-dashboard-overview.ts；修改 main/index.ts、dashboard/index.tsx 和 package.json。

**产出：** dashboard:getTodayOverview，包含焦点项目、下一里程碑、3 个可执行任务、逾期数量和最近文章。

- [ ] 编写逾期任务和高优先级任务排序的失败测试。
- [ ] 运行 pnpm test:dashboard-overview，确认因服务不存在而按预期失败。
- [ ] 在主进程实现单一聚合边界，按逾期、优先级、截止日期和创建时间排序。
- [ ] 最多渲染 3 个任务，提供任务/项目直达操作和明确空状态。
- [ ] 运行专项测试、类型检查、Lint 和 pnpm dev:launchd。
- [ ] 用户确认后执行 git commit -m "feat: add dashboard today overview"。

### 任务 3：闭合项目、任务和里程碑进度链路

**Files:** Create test-project-progress.ts; modify project, task and milestone repositories plus FocusProjectCard.tsx and ProjectManagerDialog.tsx.

- [ ] 编写失败测试，断言完成任务数除以非取消任务数的推导结果。
- [ ] 运行 pnpm test:project-progress，确认因统计能力不存在而失败。
- [ ] 实现推导进度：排除 cancelled 任务，无符合条件任务时返回 0。
- [ ] 使用现有紧凑设计 Token 展示下一里程碑和阻塞项。
- [ ] 运行项目测试、专项测试、类型检查、Lint 和 pnpm dev:launchd。
- [ ] 用户确认后执行 git commit -m "feat: derive project progress from tasks"。

### 任务 4：将命令搜索升级为统一实体搜索

**Files:** Create test-unified-search.ts; modify src/main/ipc/search.ts, SearchPanel.tsx and package.json.

- [ ] 编写项目和文章跨实体匹配的失败测试。
- [ ] 运行 pnpm test:search，确认按预期失败。
- [ ] 规范化空输入，并为所有支持的实体增加安全适配器。
- [ ] 在保持键盘导航的同时增加类型、时间和安全直达操作。
- [ ] 运行专项测试、类型检查、Lint 和 pnpm dev:launchd。
- [ ] 用户确认后执行 git commit -m "feat: unify workspace search"。

### 任务 5：增加本地备份和恢复校验

**Files:** Create backup-service.ts, backup.ts and test-backup-service.ts; modify main/index.ts, Settings and package.json.

- [ ] 编写 manifest 校验和往返恢复的失败测试。
- [ ] 运行 pnpm test:backup，确认实现前失败。
- [ ] 创建包含格式版本、时间戳和文件哈希的归档，并在修改数据前完成校验。
- [ ] 在 Settings 增加操作；恢复前先创建备份，并要求重启应用。
- [ ] 运行专项测试、类型检查、Lint 和 pnpm dev:launchd。
- [ ] 用户确认后执行 git commit -m "feat: add local workspace backups"。

### 任务 6：强化后台刷新、来源健康和通知

**Files:** Create test-provider-health.ts; modify trending, Reset Radar, notification service and their renderer surfaces plus package.json.

- [ ] 编写 fixture 标记和重复通知抑制的失败测试。
- [ ] 运行 pnpm test:provider-health，确认按预期失败。
- [ ] 结合超时、TTL、退避和禁止响应体日志，统一 ok、warn、stale、error、fixture 状态。
- [ ] 在热门内容和 Reset Radar 诊断中展示实时、缓存、过期、fixture 和失败状态。
- [ ] 运行热门内容、Reset Radar、专项测试、类型检查、Lint 和 pnpm dev:launchd。
- [ ] 用户确认后执行 git commit -m "feat: add provider health diagnostics"。

## 计划自检

- P0 backlog 已将任务 1-6 一一对应到 P0-01 至 P0-06。
- 数据库、网络、备份和密钥操作均保留在主进程。
- 每项任务都有自动化验证、运行应用确认和提交门槛。
- 语义 RAG 搜索、自动发布和完整项目详情页均不属于 P0。
