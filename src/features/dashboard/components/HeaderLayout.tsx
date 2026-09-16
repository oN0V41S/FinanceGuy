'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { HeaderBrand } from './HeaderBrand';
import { HeaderActions } from './HeaderActions';
import { logoutAction } from '@/features/auth/actions/logoutAction';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Investimentos', href: '/investimentos', icon: TrendingUp },
];

export function HeaderLayout() {
  const pathname = usePathname();

  async function handleLogout() {
    await logoutAction();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 bg-surface-container">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between md:grid md:grid-cols-3">
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <HeaderBrand />
        </div>

        {/* Center: desktop navigation */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(href)
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right: actions */}
        <div className="flex justify-end">
          <HeaderActions onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
