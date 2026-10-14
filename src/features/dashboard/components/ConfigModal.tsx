'use client';

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [isDark, setIsDark] = useState(true);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
      <div className="flex flex-col divide-y divide-outline-variant">
        {/* b) Tema — visível, mas não funcional ainda */}
        <section className="py-4 first:pt-0">
          <h4 className="text-sm font-semibold text-on-surface">Tema</h4>
          <p className="text-xs text-on-surface-variant mt-1">
            Escolha entre o modo escuro e o claro.
          </p>
          <div className="mt-3 flex items-center gap-3">
            {/* TODO: implementar troca de tema */}
            <Toggle
              checked={isDark}
              onChange={setIsDark}
              disabled
              aria-label="Alternar tema"
              icon={
                isDark ? (
                  <Moon className="size-3 text-on-surface-variant" />
                ) : (
                  <Sun className="size-3 text-on-surface-variant" />
                )
              }
            />
            <span className="text-sm text-on-surface">
              {isDark ? 'Escuro' : 'Claro'}
            </span>
          </div>
        </section>

        {/* c) Excluir conta — não funcional ainda */}
        <section className="py-4 last:pb-0">
          <h4 className="text-sm font-semibold text-on-surface">Zona perigosa</h4>
          <p className="text-xs text-on-surface-variant mt-1">
            Esta ação é irreversível.
          </p>
          <div className="mt-3">
            {/* TODO: implementar exclusão de conta */}
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled
              aria-disabled={true}
              onClick={() => console.log('Excluir conta (não implementado)')}
            >
              Excluir conta
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
