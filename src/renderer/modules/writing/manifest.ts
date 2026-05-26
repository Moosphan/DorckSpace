import { lazy } from 'react'
import type { ModuleManifest } from '@shared/types/module'

const manifest: ModuleManifest = {
  id: 'writing',
  name: 'Writing Studio',
  version: '0.1.0',
  icon: 'edit_note',
  description: 'Manage drafts, research, notes, and multi-platform publishing.',
  routes: [
    {
      path: '/writing',
      component: lazy(() => import('./index')),
    },
  ],
  navItems: [
    { label: 'Writing', icon: 'edit_note', path: '/writing', position: 'top', order: 2 },
  ],
}

export default manifest
