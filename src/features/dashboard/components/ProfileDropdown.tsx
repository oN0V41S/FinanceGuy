'use client';

import { useEffect, useRef, useState } from 'react';
import { UserCircle2, LogOut } from 'lucide-react';
import { HeaderIconButton } from './HeaderIconButton';

interface ProfileDropdownProps {
  onLogout: () => void;
}

export function ProfileDropdown({ onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    onLogout();
  }

  function toggleOpen() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="relative" ref={containerRef}>
      <HeaderIconButton
        icon={<UserCircle2 className="size-5" />}
        label="Perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleOpen}
      />

      {open && (
        <div
          role="menu"
          aria-label="Menu do perfil"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-outline-variant bg-surface-container py-1 text-on-surface shadow"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container-low"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
