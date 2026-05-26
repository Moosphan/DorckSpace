import type { IPCResponse } from '@shared/types/ipc'

/**
 * Safe IPC invoke wrapper with typed response
 */
export async function ipcInvoke<T = unknown>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const response: IPCResponse<T> = await window.electronAPI.invoke(channel, ...args)
  if (!response.success) {
    throw new Error(response.error || 'IPC call failed')
  }
  return response.data as T
}
