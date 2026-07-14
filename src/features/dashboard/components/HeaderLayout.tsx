'use client';

import React from 'react';
import { Wallet, Sparkles, Bell, UserCircle2, Menu } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { cn } from '@/lib/utils';

interface HeaderLayoutProps {
  onOpenMobileDrawer?: () => void;
}

export function HeaderLayout({ onOpenMobileDrawer }: HeaderLayoutProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface-container">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Side - Mobile: Menu + Logo | Desktop: Search + IA */}
        <div className="flex items-center gap-3">
          {/* Mobile - Menu Button */}
          <button
            type="button"
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-neutral hover:bg-surface-container-low transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            aria-label="Abrir menu"
            onClick={onOpenMobileDrawer}
          >
            <Menu className="w-5 h-5" />
          </button>

        {/* Mobile - Logo */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-semibold text-lg text-primary">
            FinanceGuy
          </span>
        </div>

          {/* Desktop - Search + IA */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-[480px]">
              <SearchInput placeholder="Buscar transações..." />
            </div>
            <button
              type="button"
              className={cn(
                'flex items-center justify-center p-2.5 rounded-md',
                'text-secondary hover:bg-surface-container-low transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary/50'
              )}
              aria-label="Assistente IA"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Side - Mobile: IA + Bell + Profile | Desktop: Bell + Profile */}
        <div className="flex items-center gap-1">
          {/* Mobile - IA Button */}
          <button
            type="button"
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-secondary hover:bg-surface-container-low transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            aria-label="Assistente IA"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Mobile + Desktop - Bell Button */}
          <button
            type="button"
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-neutral hover:bg-surface-container-low transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Mobile + Desktop - Profile Button */}
          <button
            type="button"
            className={cn(
              'flex items-center justify-center p-2 rounded-md',
              'text-neutral hover:bg-surface-container-low transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            aria-label="Perfil"
          >
            <UserCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}