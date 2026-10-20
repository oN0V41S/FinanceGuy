'use client';

import { Button } from '@/components/ui/button';
import type { NextStepsDto } from '@/features/ai/types';

interface NextStepsProps {
  nextSteps: NextStepsDto;
  onCancelRemaining: () => void;
  busy?: boolean;
}

export function NextSteps({ nextSteps, onCancelRemaining, busy = false }: NextStepsProps) {
  const { total, done, failed, cancelled, next } = nextSteps;
  const remaining = total - done - failed - cancelled;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"
      aria-live="polite"
    >
      <p>
        ✔ {done}/{total} concluídas
        {failed > 0 && ` · ${failed} não concluída${failed > 1 ? 's' : ''}`}
        {remaining > 0 && next ? ` · Próximo: ${next}` : ''}
      </p>
      {remaining > 0 && (
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onCancelRemaining}
          className="min-h-12 shrink-0"
        >
          Cancelar restantes
        </Button>
      )}
    </div>
  );
}
