import type {
  ExtensionContribution,
  ExtensionPointType,
} from '@shared/types/module'

class ExtensionPointRegistry {
  private contributions = new Map<string, ExtensionContribution>()
  private replacedIds = new Set<string>()

  register(contribution: ExtensionContribution): void {
    // If this contribution replaces another, mark the target as replaced
    if (contribution.replace) {
      this.replacedIds.add(contribution.replace)
    }
    this.contributions.set(contribution.id, contribution)
  }

  unregister(id: string): void {
    this.contributions.delete(id)
    this.replacedIds.delete(id)
  }

  registerAll(contributions: ExtensionContribution[]): void {
    for (const c of contributions) {
      this.register(c)
    }
  }

  get(type: ExtensionPointType, target?: string): ExtensionContribution[] {
    return Array.from(this.contributions.values())
      .filter((c) => {
        if (c.type !== type) return false
        if (target && c.target !== target) return false
        if (c.disabled) return false
        if (this.replacedIds.has(c.id)) return false
        return true
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  getById(id: string): ExtensionContribution | undefined {
    return this.contributions.get(id)
  }

  getAll(): ExtensionContribution[] {
    return Array.from(this.contributions.values())
  }

  replace(targetId: string, replacement: ExtensionContribution): void {
    this.replacedIds.add(targetId)
    this.register({ ...replacement, replace: targetId })
  }

  reorder(type: ExtensionPointType, target: string, orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const existing = this.contributions.get(id)
      if (existing && existing.type === type && existing.target === target) {
        this.contributions.set(id, { ...existing, order: index })
      }
    })
  }

  disable(id: string): void {
    const existing = this.contributions.get(id)
    if (existing) {
      this.contributions.set(id, { ...existing, disabled: true })
    }
  }

  enable(id: string): void {
    const existing = this.contributions.get(id)
    if (existing) {
      this.contributions.set(id, { ...existing, disabled: false })
    }
  }

  clear(): void {
    this.contributions.clear()
    this.replacedIds.clear()
  }
}

export const extensionRegistry = new ExtensionPointRegistry()
