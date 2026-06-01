export interface UsageProviderResult {
  total_tokens: number
  input_tokens: number
  output_tokens: number
  is_available: boolean
  extra?: Record<string, unknown>
}

export type UsageProviderFn = (
  apiKey: string,
  baseUrl?: string,
) => Promise<UsageProviderResult>

class UsageProviderRegistry {
  private providers = new Map<string, UsageProviderFn>()

  register(providerKey: string, fn: UsageProviderFn): void {
    this.providers.set(providerKey.toLowerCase(), fn)
  }

  unregister(providerKey: string): void {
    this.providers.delete(providerKey.toLowerCase())
  }

  get(providerKey: string): UsageProviderFn | undefined {
    return this.providers.get(providerKey.toLowerCase())
  }

  has(providerKey: string): boolean {
    return this.providers.has(providerKey.toLowerCase())
  }

  list(): string[] {
    return Array.from(this.providers.keys())
  }
}

export const usageProviderRegistry = new UsageProviderRegistry()
