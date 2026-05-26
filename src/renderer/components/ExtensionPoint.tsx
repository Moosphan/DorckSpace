import { type ReactNode } from 'react'
import type { ExtensionPointType, ExtensionContribution } from '@shared/types/module'
import { extensionRegistry } from '@/lib/extension-registry'

interface ExtensionPointProps {
  /** Extension point type to render */
  type: ExtensionPointType
  /** Target location ID */
  target?: string
  /** Fallback content when no contributions exist */
  fallback?: ReactNode
  /** Wrapper class name */
  className?: string
}

function ContributionRenderer({ contribution }: { contribution: ExtensionContribution }) {
  const { component: Component, label, icon } = contribution

  if (Component) {
    return <Component />
  }

  // For nav items / actions without a component, render a basic button
  if (label) {
    return (
      <button className="flex items-center gap-base px-md py-sm rounded-full text-on-surface-variant hover:bg-primary-fixed/50 transition-colors font-label-md">
        {icon && <span className="material-symbols-outlined">{icon}</span>}
        {label}
      </button>
    )
  }

  return null
}

export function ExtensionPoint({
  type,
  target,
  fallback = null,
  className,
}: ExtensionPointProps) {
  const contributions = extensionRegistry.get(type, target)

  if (contributions.length === 0) {
    return <>{fallback}</>
  }

  return (
    <div className={className}>
      {contributions.map((item) => (
        <ContributionRenderer key={item.id} contribution={item} />
      ))}
    </div>
  )
}

/** Hook to access extension registry in components */
export function useExtensionRegistry() {
  return extensionRegistry
}
