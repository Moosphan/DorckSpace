# P1-02 基于引用的研究助手实施计划

> **执行约束：** 每个功能行为先写失败测试，完成后运行专项测试、类型检查、构建和应用；等待确认后才提交并进入下一项任务。

## 目标

让用户在 Research Library 中明确选中素材后，调用已配置的 AI 服务生成可追溯的研究简报，并将结果保存为文章草稿或灵感。任何未选中的个人数据都不进入模型请求。

## 架构与边界

- 素材筛选、提示词构造和模型调用全部发生在主进程；渲染层只提交素材 ID 与研究意图。
- 仅使用用户在 AI Lab 已配置且有 API Key 的活动订阅；优先支持 OpenAI-compatible `/v1/chat/completions`。
- 请求内容只包括选中的 `research_materials`（标题、摘录、作者、标签、URL），并使用稳定的 `[S1]`、`[S2]` 来源编号。
- 结果必须存储输入素材 ID、生成内容、模型信息和创建时间，可追溯且可复用；不保存 API Key。
- 模型输出不可信时，UI 仍显示本地生成的来源清单；保存动作由用户显式触发，不自动改写文章或创建灵感。

## 任务

### P1-02-01 研究会话与受控调用

**文件**

- 新增：`src/main/database/repositories/research-assistant-repository.ts`
- 新增：`src/main/services/research-assistant-service.ts`
- 新增：`src/main/ipc/research-assistant.ts`
- 修改：`src/main/database/migrations/index.ts`
- 修改：`src/main/index.ts`
- 测试：`scripts/test-research-assistant.ts`、`scripts/run-research-assistant-test.cjs`

**验证行为**

1. 传入素材 ID 时只加载这些素材，按输入顺序生成 `[S1]`、`[S2]` 来源上下文。
2. 空素材、重复 ID 或不存在 ID 被拒绝，不触发任何网络请求。
3. 每次成功生成都保存会话、结果与来源 ID；读取历史能返回来源列表。
4. 模型适配器接收 OpenAI-compatible endpoint、解密后的 API Key 与明确的中文研究提示词。

### P1-02-02 Writing Studio 研究工作台

**文件**

- 新增：`src/renderer/modules/writing/components/ResearchAssistantModal.tsx`
- 修改：`src/renderer/modules/writing/components/ResearchLibraryModal.tsx`
- 修改：`src/renderer/modules/writing/index.tsx`

**验证行为**

1. 素材库支持多选，并清楚显示已选数量。
2. 只有选中素材后才能打开研究助手；弹窗展示将发送的来源和研究意图。
3. 生成结果突出展示简报和 `[S#]` 引用，来源卡片可以打开原始 URL。
4. 用户可以明确选择“保存为文章草稿”或“保存为灵感”，并得到成功或失败反馈。

### P1-02-03 保存与回归验证

**文件**

- 修改：`src/main/ipc/research-assistant.ts`
- 修改：`scripts/test-research-assistant.ts`

**验证行为**

1. 保存草稿时创建文章，标题来源于研究意图，内容包括简报与来源参考。
2. 保存灵感时创建 `ideas` 记录，内容包括研究结论与来源参考。
3. 运行 `pnpm test:research-assistant`、`pnpm test:research-materials`、`pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm dev:launchd`。
