import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'settings',
  name: 'Settings',
  version: '0.1.0',
  icon: 'settings',
  description: 'Workspace preferences, theme customization, and integrations.',
  routes: [
    {
      path: '/settings',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'Settings', icon: 'settings', path: '/settings', position: 'bottom', order: 99 },
  ],
}

export default manifest
