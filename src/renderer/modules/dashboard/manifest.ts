import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'dashboard',
  name: 'Dashboard',
  version: '0.1.0',
  icon: 'dashboard',
  description: 'Personal workspace overview with tasks, projects, and activity tracking.',
  routes: [
    {
      path: '/dashboard',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard', position: 'top', order: 1 },
  ],
}

export default manifest
