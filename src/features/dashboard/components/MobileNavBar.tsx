'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
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
  {
    label: 'Investimentos',
    href: '/investimentos',
    icon: TrendingUp,
  },
];

export function MobileNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-4 left-4 right-4 z-40 rounded-full',
        'bg-surface-container/70 backdrop-blur-xl backdrop-saturate-150',
        'border border-outline-variant/20',
        'shadow-soft',
      )}
    >
      <div className="relative flex justify-around items-center h-16 px-1.5">
        {/* specular highlight along the top edge of the glass pill */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-on-surface/40 to-transparent"
        />

        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-full transition-colors',
                'h-12 w-12',
                active
                  ? 'bg-primary text-on-primary shadow-soft'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}