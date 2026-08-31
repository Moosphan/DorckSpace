# P1-04 时间盒与专注记录实施计划

> **执行约束：** 每项行为先写失败测试；完成后运行专项测试、类型检查、构建和应用，等待确认后才提交。

## 目标

为任务提供可审计的本地专注会话，让用户明确开始和结束一次专注，自动累计任务实际工时并回流活动统计。

## 数据与行为边界

- 一次只允许一个进行中的专注会话，避免重复计时。
- 停止会话根据主进程当前时间计算分钟数；少于一分钟不写入任务和活动统计。
- 专注会话保留开始、结束、时长和任务 ID；任务删除后会话保留但解除关联。
- 任务的 `actual_hours` 由已完成的会话累加；`estimated_hours` 仅由用户填写，不自动伪造。

## 任务

### P1-04-01 专注会话数据层和 IPC

**文件**

- 新增：`src/main/database/repositories/focus-session-repository.ts`
- 新增：`src/main/ipc/focus-sessions.ts`
- 修改：`src/main/database/migrations/index.ts`
- 修改：`src/main/index.ts`
- 测试：`scripts/test-focus-sessions.ts`、`scripts/run-focus-sessions-test.cjs`

**验收**

1. 开始会话必须关联存在且未完成的任务，且不能同时有第二个活动会话。
2. 停止会话按真实起止时间计算分钟数，累计任务实际工时并记录当天 `focus_session` 活动。
3. 查询活动会话与任务近期会话均返回规范化 DTO。

### P1-04-02 Dashboard 专注卡片

**文件**

- 新增：`src/renderer/modules/dashboard/components/FocusSessionCard.tsx`
- 修改：`src/renderer/modules/dashboard/index.tsx`

**验收**

1. 选择待办任务并开始 25 分钟专注；卡片显示实时经过时间和任务预估/实际时长。
2. 停止后显示本次专注分钟数，并刷新活动热力图所在的 Dashboard 状态。
3. 重启页面后仍能恢复显示进行中的本地会话。
