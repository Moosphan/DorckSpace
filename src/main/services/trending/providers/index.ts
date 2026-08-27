import type { TrendingProvider } from './types'
import { ProductHuntProvider } from './producthunt-provider'
import { LinuxDoProvider } from './linuxdo-provider'
import { createDouyinProvider, createXiaohongshuProvider } from './configurable-social-provider'

export function createTrendingProviders(): TrendingProvider[] {
  return [
    createXiaohongshuProvider(),
    createDouyinProvider(),
    new ProductHuntProvider(),
    new LinuxDoProvider(),
  ]
}
