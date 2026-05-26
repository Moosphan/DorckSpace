import type { ComponentType, LazyExoticComponent } from 'react'

// ─── Module Manifest ───────────────────────────────────────────

export interface ModuleManifest {
  /** Unique identifier, e.g. 'writing' */
  id: string
  /** Display name */
  name: string
  /** Semantic version */
  version: string
  /** Material Symbol icon name */
  icon: string
  /** Short description */
  description: string
  /** Routes provided by this module */
  routes: RouteConfig[]
  /** Sidebar navigation items */
  navItems: NavItemConfig[]
  /** Widgets that can be embedded in other pages */
  widgets?: WidgetConfig[]
  /** Database migrations for this module */
  migrations?: MigrationConfig[]
  /** Lifecycle hooks */
  onActivate?(): Promise<void>
  onDeactivate?(): Promise<void>
}

export interface RouteConfig {
  /** Route path, e.g. '/writing' */
  path: string
  /** Lazy-loaded page component */
  component: LazyExoticComponent<ComponentType>
  /** Layout mode */
  layout?: 'default' | 'fullscreen'
}

export interface NavItemConfig {
  /** Display label */
  label: string
  /** Material Symbol icon name */
  icon: string
  /** Route path */
  path: string
  /** 'top' = main menu, 'bottom' = below spacer */
  position: 'top' | 'bottom'
  /** Sort weight (lower = earlier) */
  order: number
}

export interface WidgetConfig {
  /** Unique widget ID */
  id: string
  /** Target page zone: 'dashboard', 'writing', 'video', 'insights', 'ai-lab' */
  zone: string
  /** Widget component */
  component: ComponentType
  /** Widget title */
  title: string
  /** Material Symbol icon */
  icon?: string
  /** Size in Bento Grid */
  defaultSize?: 'sm' | 'md' | 'lg'
  /** Sort weight */
  order?: number
}

export interface MigrationConfig {
  /** Migration version number */
  version: number
  /** Migration name */
  name: string
  /** SQL to execute */
  sql: string
}

// ─── Extension Points ──────────────────────────────────────────

/** All supported extension point types across 4 levels */
export type ExtensionPointType =
  // L0 Module level
  | 'module'
  // L1 Zone level
  | 'page.zone'
  // L2 Component level
  | 'widget'
  | 'settings.panel'
  | 'toolbar.action'
  | 'sidebar.nav'
  | 'context.menu'
  | 'dropdown.action'
  // L3 Element level
  | 'settings.item'
  | 'quick.action'
  | 'status.indicator'
  | 'tab'
  | 'editor.toolbar'

/** A single extension contribution */
export interface ExtensionContribution {
  /** Unique ID */
  id: string
  /** Extension point type */
  type: ExtensionPointType
  /** Target location ID, e.g. 'dashboard', 'settings.general', 'sidebar.bottom' */
  target?: string
  /** Component to render (for widget/settings.panel/settings.item) */
  component?: ComponentType
  /** Sort weight (lower = earlier) */
  order?: number
  /** Replace an existing contribution by ID */
  replace?: string
  /** Whether this contribution is disabled */
  disabled?: boolean
  /** Source: 'builtin' | 'plugin:<plugin-id>' */
  source?: string
  // Additional metadata
  label?: string
  icon?: string
  path?: string
  action?: string
  [key: string]: unknown
}
