import type {
  ModuleManifest,
  RouteConfig,
  NavItemConfig,
  WidgetConfig,
} from '@shared/types/module'

class ModuleRegistry {
  private modules = new Map<string, ModuleManifest>()

  register(manifest: ModuleManifest): void {
    this.modules.set(manifest.id, manifest)
  }

  unregister(id: string): void {
    this.modules.delete(id)
  }

  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id)
  }

  getAll(): ModuleManifest[] {
    return Array.from(this.modules.values())
  }

  getEnabled(enabledIds: string[]): ModuleManifest[] {
    return this.getAll().filter((m) => enabledIds.includes(m.id))
  }

  getRoutes(enabledIds: string[]): RouteConfig[] {
    return this.getEnabled(enabledIds).flatMap((m) => m.routes)
  }

  getNavItems(enabledIds: string[]): NavItemConfig[] {
    return this.getEnabled(enabledIds)
      .flatMap((m) => m.navItems)
      .sort((a, b) => a.order - b.order)
  }

  getWidgets(zone: string, enabledIds: string[]): WidgetConfig[] {
    return this.getEnabled(enabledIds)
      .flatMap((m) => m.widgets ?? [])
      .filter((w) => w.zone === zone)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  has(id: string): boolean {
    return this.modules.has(id)
  }
}

export const moduleRegistry = new ModuleRegistry()
