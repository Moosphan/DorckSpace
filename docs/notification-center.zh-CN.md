# 消息中心技术设计

## 目标

为 MyDashboard 的任务提醒、RSS 更新、AI Reset Radar 与趋势更新提供统一的本地消息中心。用户可通过右上角铃铛查看未读列表；仅有未读消息时显示红点；同一消息不会因为定时检查或应用重启重复弹出系统通知。

## 架构

```text
业务服务
  -> sendDedupedNotification(key, options)
  -> notification_center_messages 唯一键写入
  -> 主进程推送 notification:center:new
  -> Renderer 未读内存列表与红点
  -> macOS 系统通知
```

SQLite 的唯一键是最终去重边界。业务服务必须为每类事实生成稳定的 `key`，例如 `task-due:<taskId>:<dueDate>`、`rss-new:<feedId>:<date>` 与 `reset-radar:<signalId>`。当插入因唯一键冲突而失败时，不广播事件、不弹系统通知，也不重复写入消息中心。

## 数据模型

迁移 `031_notification_center_messages` 创建 `notification_center_messages`：

| 字段 | 说明 |
| --- | --- |
| `id` | 本地消息 ID |
| `notification_key` | 业务幂等键，唯一 |
| `title` / `body` | 展示给消息中心与系统通知的内容 |
| `route` | 已校验的应用内跳转路径，可为空 |
| `created_at` | 首次发现时间 |
| `read_at` | 已读时间；为空代表未读 |

未读查询使用 `idx_notification_center_unread(read_at, created_at DESC)`。当前消息中心只读取未读消息，最多 50 条；已读消息不在面板中展示。

## 主进程接口

| IPC | 用途 |
| --- | --- |
| `notification:center:listUnread` | 应用启动时读取一次未读列表 |
| `notification:center:markRead` | 点击单条消息后标记已读 |
| `notification:center:markAllRead` | 用户显式清空未读状态 |
| `notification:center:new` | 新消息写入成功后推送完整消息 |
| `notification:center:read` | 单条已读状态推送 |
| `notification:center:allRead` | 全部已读状态推送 |

预加载层仅暴露 `onNotificationCenterEvent`，并要求事件频道属于固定白名单。业务消息的跳转路径继续经 `normalizeNotificationRoute` 校验，避免通知内容将渲染进程带到外部或不支持的路由。

## 前端状态与交互

`MainLayout` 在挂载时读取一次未读列表，此后仅消费主进程事件，不轮询。铃铛红点由 `unreadMessages.length > 0` 驱动。

- 点击铃铛：打开未读消息列表，不自动清空未读状态。
- 点击单条消息：乐观移除本地未读项，调用 `markRead`，再按合法 `route` 跳转。
- 点击“全部已读”：乐观清空列表并调用 `markAllRead`。
- 点击 macOS 系统通知：主进程先标记消息已读，再聚焦窗口并发送既有的 `notification:navigate` 事件。

## 去重与弹窗策略

1. 业务源只调用 `sendDedupedNotification`。
2. 主进程先将消息写入带唯一约束的 SQLite 表。
3. 只有插入成功，才广播 `notification:center:new` 并调用 `Notification.show()`。
4. 同一键即使在进程重启后再次检测到，也会因数据库唯一约束被拒绝。
5. 无键的手动 IPC 通知生成随机 `manual:*` 键，视为用户主动创建的新通知。

该顺序避免了“同一轮检查重复请求导致重复弹窗”，同时将消息中心与系统弹窗绑定到同一份事实记录。

## 验证

- `pnpm test:notification-center`：首次写入、重复唯一键与单条已读。
- `pnpm test:notification-navigation`：消息跳转路由白名单。
- `pnpm typecheck`：预加载和渲染端的 IPC 类型。
- `pnpm build`：生产 Electron bundle。

## 限制

消息中心当前不保留已读历史，也不提供删除、筛选、跨设备同步或用户级通知偏好。这些能力列入 Backlog，避免初版把消息中心扩展为完整收件箱。
