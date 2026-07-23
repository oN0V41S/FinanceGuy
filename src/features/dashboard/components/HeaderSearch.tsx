'use client';

import { Sparkles } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { HeaderIconButton } from './HeaderIconButton';

export function HeaderSearch() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center gap-2">
      <div className="w-[480px] max-w-full">
        <SearchInput placeholder="Buscar transações..." />
      </div>
      <HeaderIconButton
        icon={<Sparkles className="size-5" />}
        label="Assistente IA"
      />
    </div>
  );
}
