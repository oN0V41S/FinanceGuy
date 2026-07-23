'use client';

import { useState } from 'react';
import { Check, Loader2, Moon, Sun } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { updateNicknameAction } from '@/features/auth/actions/updateNicknameAction';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [nickname, setNickname] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await updateNicknameAction(nickname);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Apelido alterado com sucesso' });
      } else {
        setFeedback({ type: 'error', message: res.error ?? 'Erro ao salvar' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
      <div className="flex flex-col divide-y divide-outline-variant">
        {/* a) Apelido */}
        <section className="py-4 first:pt-0">
          <h4 className="text-sm font-semibold text-on-surface">Apelido</h4>
          <p className="text-xs text-on-surface-variant mt-1">
            Como você gostaria de ser chamado no app.
          </p>
          {feedback && (
            <p className={`text-sm mt-2 ${feedback.type === 'success' ? 'text-finance-income' : 'text-finance-expense'}`}>
              {feedback.message}
            </p>
          )}
          <div className="mt-3 flex gap-2 items-center">
            <Input
              id="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Seu apelido"
              aria-label="Apelido"
              className="flex-1"
            />
            <Button
              type="button"
              variant="default"
              size="icon"
              aria-label="Salvar apelido"
              disabled={isSaving || !nickname.trim()}
              onClick={handleSave}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check />}
            </Button>
          </div>
        </section>

        {/* b) Tema — visível, mas não funcional ainda */}
        <section className="py-4">
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
