# P1-03 内容生产线：平台版本与发布回执实施计划

> **执行约束：** 每项行为先写失败测试；完成后运行专项测试、类型检查、构建和应用，等待确认后再提交。

## 目标

将本地文章转为可编辑、可复用的平台版本，并让每一次“已复制待发布”与“已发布”的状态有真实本地回执，修复发布面板调用未注册 IPC 的问题。

## 真实状态边界

- 复制到剪贴板只能记录为 `prepared`，不得虚假标记为已发布。
- 用户手动填写真实发布链接并确认后，才创建 `published` 回执。
- 平台版本是文章的本地衍生内容，更新同平台版本时原地覆盖，避免重复。
- 本任务不模拟第三方平台 API 的发布成功；真实平台发布和指标抓取属于下一切片。

## 任务

### P1-03-01 数据层与 IPC

**文件**

- 新增：`src/main/database/repositories/content-variant-repository.ts`
- 新增：`src/main/ipc/content-variants.ts`
- 修改：`src/main/database/migrations/index.ts`
- 修改：`src/main/index.ts`
- 测试：`scripts/test-content-variants.ts`、`scripts/run-content-variants-test.cjs`

**验收**

1. 同一文章、同一平台仅保留一份最新内容版本。
2. 复制准备动作创建 `prepared` 回执，包含平台、版本和创建时间。
3. 确认发布后将回执更新为 `published` 并保存真实链接和时间。
4. 不存在的文章、版本或空平台输入被拒绝。

### P1-03-02 发布工作台

**文件**

- 修改：`src/renderer/modules/writing/components/PublishPanel.tsx`

**验收**

1. 选中平台后生成并保存对应的可编辑版本，再复制到剪贴板。
2. 结果区域明确显示“已复制，待发布”，而不是“已发布”。
3. 用户可输入发布链接并确认，状态才更新为“已发布”。
4. 关闭再打开时能看到已保存的平台版本与最近回执。

### P1-03-03 内容级指标快照与复盘

**文件**

- 修改：`src/main/database/migrations/index.ts`
- 修改：`src/main/database/repositories/content-variant-repository.ts`
- 修改：`src/main/ipc/content-variants.ts`
- 新增：`src/renderer/modules/writing/components/ContentReviewModal.tsx`
- 修改：`src/renderer/modules/writing/components/PublishPanel.tsx`
- 测试：`scripts/test-content-variants.ts`

**验收**

1. 只允许为已确认发布、带真实链接的回执录入内容指标。
2. 同一回执同一天的快照幂等更新，支持浏览、点赞、评论、转发和收藏。
3. 复盘界面显示各平台最近快照、前次快照、互动总量与变化，不将账号总量混入单篇内容表现。
4. 未录入快照的已发布内容显示“等待首个快照”，不显示伪造数据。
