'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, ArrowLeftRight } from 'lucide-react';
import { HeaderBrand } from './HeaderBrand';
import { HeaderActions } from './HeaderActions';
import { HeaderIconButton } from './HeaderIconButton';
import { logoutAction } from '@/features/auth/actions/logoutAction';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
];

interface HeaderLayoutProps {
  onOpenMobileDrawer?: () => void;
}

export function HeaderLayout({ onOpenMobileDrawer }: HeaderLayoutProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await logoutAction();
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 bg-surface-container">
      <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-3 items-center">
        {/* Left: hamburger (mobile) + brand */}
        <div className="flex items-center gap-2">
          <HeaderIconButton
            icon={<Menu className="w-5 h-5" />}
            label="Abrir menu"
            onClick={onOpenMobileDrawer}
            className="md:hidden"
          />
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
