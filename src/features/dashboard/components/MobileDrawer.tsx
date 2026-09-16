'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, TrendingUp, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Investimentos', href: '/investimentos', icon: TrendingUp },
];

const FOOTER_ITEM = { label: 'Configurações', href: '/settings', icon: Settings };

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="drawer-overlay"
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72',
          'bg-surface-container flex flex-col',
          'transition-transform duration-200 ease-out',
          'translate-x-0',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-semibold text-xl text-primary">FinanceGuy</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center p-2 rounded-md text-neutral hover:bg-surface-container-low transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                  active
                    ? 'text-primary bg-surface-container-low'
                    : 'text-neutral hover:bg-surface-container-low',
                )}
              >
                <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-neutral')} />
                <span className={cn('text-sm font-medium', active ? 'text-primary' : 'text-neutral')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 pt-0">
          <Link
            href={FOOTER_ITEM.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
              isActive(FOOTER_ITEM.href)
                ? 'text-primary bg-surface-container-low'
                : 'text-neutral hover:bg-surface-container-low',
            )}
          >
            <Settings className={cn('w-5 h-5', isActive(FOOTER_ITEM.href) ? 'text-primary' : 'text-neutral')} />
            <span className={cn('text-sm font-medium', isActive(FOOTER_ITEM.href) ? 'text-primary' : 'text-neutral')}>
              {FOOTER_ITEM.label}
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
