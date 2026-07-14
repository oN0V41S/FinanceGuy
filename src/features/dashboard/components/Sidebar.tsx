'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, Settings, PanelLeftClose, PanelLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Transações',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
];

const footerItem = {
  label: 'Configurações',
  href: '/settings',
  icon: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside 
      className={cn(
        'hidden md:flex h-screen bg-surface-container flex-col flex-shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-4 flex items-center gap-3',
        collapsed && 'justify-center'
      )}>
        {!collapsed && (
          <>
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-sans font-semibold text-xl text-primary">
              FinanceGuy
            </span>
          </>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'mx-2 mb-2 p-2 rounded-md',
          'text-on-surface-variant hover:bg-surface-container-low',
          'transition-colors flex items-center justify-center'
        )}
        aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 p-4 flex flex-col gap-1',
        collapsed && 'px-2'
      )}>
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`icon-${item.icon.name}`}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'text-primary bg-surface-container-low'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              )}
            >
              <Icon
                data-testid={`icon-${item.icon.name}`}
                className={cn(
                  'w-5 h-5 transition-colors flex-shrink-0',
                  active ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        'p-4 pt-0',
        collapsed && 'px-2'
      )}>
        <Link
          href={footerItem.href}
          className={cn(
            'group flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
            collapsed && 'justify-center px-0',
            isActive(footerItem.href)
              ? 'text-primary bg-surface-container-low'
              : 'text-on-surface hover:bg-surface-container-low'
          )}
        >
          <Settings
            className={cn(
              'w-5 h-5 transition-colors flex-shrink-0',
              isActive(footerItem.href) ? 'text-primary' : 'text-on-surface-variant'
            )}
          />
          {!collapsed && (
            <span className={cn(
              'text-sm font-medium',
              isActive(footerItem.href) ? 'text-primary' : 'text-on-surface-variant'
            )}>
              {footerItem.label}
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}