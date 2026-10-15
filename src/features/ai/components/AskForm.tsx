'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_QUESTION_LENGTH } from '@/features/ai/validations';

interface AskFormProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
}

export function AskForm({ onSubmit, isLoading }: AskFormProps) {
  const [question, setQuestion] = useState('');
  const trimmed = question.trim();
  const canSubmit = trimmed.length > 0 && !isLoading;

  function submit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
    setQuestion('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <label htmlFor="assistant-question" className="sr-only">
        Sua pergunta
      </label>
      <div className="flex items-end gap-2 rounded-2xl border border-outline-variant bg-surface-container p-2">
        <textarea
          id="assistant-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_QUESTION_LENGTH}
          rows={2}
          placeholder="Ex.: Quanto gastei com alimentação este mês?"
          className="max-h-40 min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-on-surface placeholder:text-on-surface-variant outline-none"
        />
        <Button
          type="submit"
          disabled={!canSubmit}
          aria-label={isLoading ? 'Perguntando...' : 'Perguntar'}
          className="h-11 w-11 shrink-0 rounded-xl bg-brand-primary p-0 text-white hover:bg-brand-primary/90"
        >
          <SendHorizontal className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <p className="px-2 text-right text-xs text-on-surface-variant" aria-live="polite">
        {question.length}/{MAX_QUESTION_LENGTH}
      </p>
    </form>
  );
}
