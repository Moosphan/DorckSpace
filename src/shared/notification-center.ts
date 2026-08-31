export interface NotificationCenterMessage {
  id: number
  key: string
  title: string
  body: string
  route: string | null
  createdAt: string
  readAt: string | null
}
