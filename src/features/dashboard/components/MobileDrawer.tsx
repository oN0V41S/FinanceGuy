'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, Settings, X } from 'lucide-react';
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

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer panel */}
      <aside 
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72',
          'bg-surface-container animate-slide-in',
          'flex flex-col'
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Without border */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-semibold text-xl text-primary">
              FinanceGuy
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-on-surface-variant hover:bg-surface-container-low transition-colors'
            )}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md',
                  'transition-colors',
                  active
                    ? 'text-primary bg-surface-container-low'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                )}
              >
                <Icon 
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-primary' : 'text-on-surface-variant'
                  )} 
                />
                <span className={cn(
                  'text-sm font-medium',
                  active ? 'text-primary' : 'text-on-surface-variant'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 pt-0">
          <Link
            href={footerItem.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md',
              'transition-colors',
                isActive(footerItem.href)
                  ? 'text-primary bg-surface-container-low'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
            )}
          >
            <Settings 
              className={cn(
                'w-5 h-5',
                isActive(footerItem.href) ? 'text-primary' : 'text-on-surface-variant'
              )} 
            />
            <span className={cn(
              'text-sm font-medium',
              isActive(footerItem.href) ? 'text-primary' : 'text-on-surface-variant'
            )}>
              {footerItem.label}
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}