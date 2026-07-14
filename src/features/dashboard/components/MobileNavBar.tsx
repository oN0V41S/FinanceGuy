'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight } from 'lucide-react';
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
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-surface-container rounded-xl shadow-lg">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                'transition-colors',
                active
                  ? 'text-secondary bg-surface-container-low rounded-xl'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 transition-colors',
                  active ? 'text-secondary' : 'text-on-surface-variant'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  active ? 'text-secondary' : 'text-on-surface-variant'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}