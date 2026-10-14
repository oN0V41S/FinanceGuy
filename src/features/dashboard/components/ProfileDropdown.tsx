'use client';

import { useEffect, useRef, useState } from 'react';
import { UserCircle2, LogOut, UserRound } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { ProfileEditor } from '@/features/ai/components/ProfileEditor';
import { useAiProfile } from '@/features/ai/hooks/useAiProfile';
import { HeaderIconButton } from './HeaderIconButton';
import { NicknameForm } from './NicknameForm';

interface ProfileDropdownProps {
  onLogout: () => void;
}

export function ProfileDropdown({ onLogout }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const aiProfile = useAiProfile();
  const { load: loadProfile } = aiProfile;
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

  function handleOpenProfile() {
    setOpen(false);
    setProfileOpen(true);
    void loadProfile();
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
          className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-outline-variant bg-surface-container py-1 text-on-surface shadow"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleOpenProfile}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container-low"
          >
            <UserRound className="size-4" />
            Perfil
          </button>
          <div role="separator" className="my-1 h-px bg-outline-variant" />
          <NicknameForm />
          <div role="separator" className="my-1 h-px bg-outline-variant" />
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

      <Modal isOpen={profileOpen} onClose={() => setProfileOpen(false)} title="Perfil">
        <ProfileEditor
          initial={aiProfile.profile}
          error={aiProfile.error}
          isBusy={aiProfile.isBusy}
          onSave={aiProfile.save}
          onClose={() => setProfileOpen(false)}
        />
      </Modal>
    </div>
  );
}
