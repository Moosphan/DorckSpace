import { type ReactNode, useMemo, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { extensionRegistry } from '@/lib/extension-registry'
import { SearchPanel } from '@/components/SearchPanel'
import type { ExtensionContribution } from '@shared/types/module'

interface MainLayoutProps {
  children: ReactNode
}

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: ExtensionContribution
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-base rounded-full px-md py-sm font-label-md transition-all active:scale-95',
        isActive
          ? 'bg-primary-fixed dark:bg-primary-container text-on-primary-fixed-variant dark:text-on-primary-container'
          : 'text-on-surface-variant hover:bg-primary-fixed/50 dark:hover:bg-primary-container/50',
      )}
    >
      <span
        className={cn('material-symbols-outlined', isActive && 'fill')}
        style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
      >
        {item.icon}
      </span>
      {item.label}
    </button>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Read navigation from extension registry
  const topNavItems = useMemo(
    () => extensionRegistry.get('sidebar.nav', 'sidebar.top'),
    [],
  )
  const bottomNavItems = useMemo(
    () => extensionRegistry.get('sidebar.nav', 'sidebar.bottom'),
    [],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-[280px] shrink-0 bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant/30">
        {/* Logo - pt-12 clears macOS traffic lights */}
        <div className="p-md pt-12">
          <div className="flex items-center gap-sm mb-lg">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined fill">dashboard</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
                DorckDashboard
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant opacity-70">
                Productivity Engine
              </p>
            </div>
          </div>

          <button className="w-full bg-primary text-on-primary rounded-full py-sm px-md flex items-center justify-center gap-base mb-lg font-label-md hover:brightness-110 transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Project
          </button>
        </div>

        {/* Navigation - driven by ExtensionPointRegistry */}
        <nav className="flex-1 px-sm space-y-xs overflow-y-auto">
          {topNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => item.path && navigate(item.path)}
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto p-md space-y-sm">
          {bottomNavItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => item.path && navigate(item.path)}
            />
          ))}

          {/* User Card */}
          <div className="p-sm bg-surface-container rounded-2xl flex items-center gap-sm">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
              D
            </div>
            <div className="overflow-hidden">
              <p className="font-label-md text-on-surface truncate">Dorck</p>
              <p className="text-[10px] text-on-surface-variant truncate">Workspace Owner</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md flex justify-between items-center w-full px-md py-2 border-b border-outline-variant/30">
          <div className="flex items-center gap-md flex-1">
            <div
              className="relative w-full max-w-sm cursor-pointer"
              onClick={() => setSearchOpen(true)}
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <div className="w-full bg-surface-container-low border-2 border-transparent rounded-full px-md py-1.5 pl-9 font-body-sm text-body-sm text-on-surface-variant/60">
                Search everything...
                <kbd className="ml-2 text-[10px] font-bold bg-surface-container px-1.5 py-0.5 rounded">⌘K</kbd>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full border-2 border-surface" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs cursor-pointer">
              D
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Global Search Panel (Cmd+K) */}
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
