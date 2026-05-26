import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'video',
  name: 'Video Studio',
  version: '0.1.0',
  icon: 'movie',
  description: 'Manage video covers, audio assets, and HTML presentations.',
  routes: [
    {
      path: '/video',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'Video', icon: 'movie', path: '/video', position: 'top', order: 3 },
  ],
}

export default manifest
