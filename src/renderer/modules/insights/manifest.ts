import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'insights',
  name: 'Insights',
  version: '0.1.0',
  icon: 'analytics',
  description: 'RSS feeds, social analytics, and content performance across platforms.',
  routes: [
    {
      path: '/insights',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'Insights', icon: 'analytics', path: '/insights', position: 'top', order: 4 },
  ],
}

export default manifest
