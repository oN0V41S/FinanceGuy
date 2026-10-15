'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateNicknameAction } from '@/features/auth/actions/updateNicknameAction';

export function NicknameForm() {
  const [nickname, setNickname] = useState('');
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
    <section className="px-3 py-2">
      <h4 className="text-sm font-semibold text-on-surface">Apelido</h4>
      <p className="text-xs text-on-surface-variant mt-1">Como você gostaria de ser chamado no app.</p>
      {feedback && (
        <p className={`text-sm mt-2 ${feedback.type === 'success' ? 'text-finance-income' : 'text-finance-expense'}`}>
          {feedback.message}
        </p>
      )}
      <div className="mt-2 flex gap-2 items-center">
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
  );
}
