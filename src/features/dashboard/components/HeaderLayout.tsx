'use client';

import { Menu } from 'lucide-react';
import { HeaderIconButton } from './HeaderIconButton';
import { HeaderBrand } from './HeaderBrand';
import { HeaderSearch } from './HeaderSearch';
import { HeaderActions } from './HeaderActions';
import { logoutAction } from '@/features/auth/actions/logoutAction';

interface HeaderLayoutProps {
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

export function HeaderLayout({ isDrawerOpen, onToggleDrawer }: HeaderLayoutProps) {
  async function handleLogout() {
    await logoutAction();
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-container">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Left - Menu + Brand (visible on all screen sizes) */}
        <div className="flex items-center gap-3 shrink-0">
          <HeaderIconButton
            icon={<Menu className="size-5" />}
            label="Abrir menu"
            onClick={onToggleDrawer}
            aria-expanded={isDrawerOpen ?? false}
          />

          <HeaderBrand />
        </div>

        {/* Center - Search + Assistente IA (desktop only, truly centered) */}
        <HeaderSearch />

        {/* Right - Notificações + Perfil */}
        <HeaderActions onLogout={handleLogout} />
      </div>
    </header>
  );
}
