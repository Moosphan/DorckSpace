export interface IPCResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface IPCChannel<TRequest = unknown, TResponse = unknown> {
  request: TRequest
  response: IPCResponse<TResponse>
}
