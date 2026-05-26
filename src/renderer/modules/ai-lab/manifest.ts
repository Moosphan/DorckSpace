import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'ai-lab',
  name: 'AI Lab',
  version: '0.1.0',
  icon: 'science',
  description: 'AI subscription management, tool directory, and Agent integration.',
  routes: [
    {
      path: '/ai-lab',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'AI Lab', icon: 'science', path: '/ai-lab', position: 'top', order: 5 },
  ],
}

export default manifest
