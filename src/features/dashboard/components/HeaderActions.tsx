'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { HeaderIconButton } from './HeaderIconButton';
import { ProfileDropdown } from './ProfileDropdown';
import { ConfigModal } from './ConfigModal';

interface HeaderActionsProps {
  onLogout: () => void;
}

export function HeaderActions({ onLogout }: HeaderActionsProps) {
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 shrink-0 ml-auto">
      <HeaderIconButton
        icon={<Settings className="size-5" />}
        label="Configurações"
        onClick={() => setConfigOpen(true)}
      />

      <ProfileDropdown onLogout={onLogout} />

      {configOpen && (
        <ConfigModal isOpen={true} onClose={() => setConfigOpen(false)} />
      )}
    </div>
  );
}
