'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAX_PROFILE_LENGTH } from '@/features/ai/validations';

interface ProfileEditorProps {
  initial: string;
  error: string | null;
  isBusy: boolean;
  onSave: (text: string) => Promise<boolean>;
  onClose: () => void;
}

export function ProfileEditor({ initial, error, isBusy, onSave, onClose }: ProfileEditorProps) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    setText(initial);
  }, [initial]);

  const save = async () => {
    if (await onSave(text)) onClose();
  };

  return (
    <section aria-label="Perfil" className="space-y-3 rounded-xl bg-surface-container p-4">
      <div>
        <h2 className="text-base font-semibold text-on-surface">Seu perfil</h2>
        <p className="text-sm text-on-surface-variant">
          Conte quem você é e seus objetivos. O assistente usa isso para personalizar as respostas.
        </p>
      </div>
      <textarea
        aria-label="Descrição do perfil"
        value={text}
        maxLength={MAX_PROFILE_LENGTH}
        rows={6}
        disabled={isBusy}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: Tenho 28 anos, quero juntar uma reserva de emergência e começar a investir."
        className="w-full resize-y rounded-lg bg-surface px-3 py-2 text-sm text-on-surface"
      />
      <div className="text-xs text-on-surface-variant">
        {text.length}/{MAX_PROFILE_LENGTH}
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-finance-expense/10 text-finance-expense p-3 text-sm">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={isBusy}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={isBusy}>
          Fechar
        </Button>
      </div>
    </section>
  );
}
