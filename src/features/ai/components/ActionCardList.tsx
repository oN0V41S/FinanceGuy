'use client';

import { Button } from '@/components/ui/button';
import { ActionCard } from '@/features/ai/components/ActionCard';
import type { ActionCardDto } from '@/features/ai/types';

interface ActionCardListProps {
  cards: ActionCardDto[];
  /** `nextSteps.canConfirmAll` do servidor. */
  canConfirmAll: boolean;
  busyIds?: ReadonlySet<string>;
  errors?: Record<string, string>;
  /** Erro do lote (ex.: falha de rede em "Confirmar todas"). */
  batchError?: string | null;
  onConfirm: (id: string) => void;
  onConfirmAll: (ids: string[]) => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<boolean> | boolean;
  onCancel: (id: string) => void;
  onSelect: (id: string, index: number) => void;
}

const BLOCKING_STATUSES = new Set(['needs_input', 'awaiting_pick']);

export function ActionCardList({
  cards,
  canConfirmAll,
  busyIds,
  errors = {},
  batchError = null,
  onConfirm,
  onConfirmAll,
  onUpdate,
  onCancel,
  onSelect,
}: ActionCardListProps) {
  const readyIds = cards.filter((c) => c.status === 'ready').map((c) => c.id);
  const allValid = !cards.some((c) => BLOCKING_STATUSES.has(c.status));
  const showConfirmAll = canConfirmAll && allValid && readyIds.length >= 2;
  const anyBusy = cards.some((c) => busyIds?.has(c.id) || c.status === 'confirming');

  return (
    <div className="space-y-3" data-testid="action-card-list">
      {cards.map((card) => (
        <ActionCard
          key={card.id}
          card={card}
          busy={busyIds?.has(card.id) ?? false}
          error={errors[card.id] ?? null}
          onConfirm={onConfirm}
          onUpdate={onUpdate}
          onCancel={onCancel}
          onSelect={onSelect}
        />
      ))}

      {batchError && (
        <p className="text-sm text-finance-expense" role="alert">
          {batchError}
        </p>
      )}

      {showConfirmAll && (
        <Button
          type="button"
          disabled={anyBusy}
          onClick={() => onConfirmAll(readyIds)}
          className="w-full"
        >
          Confirmar todas ({readyIds.length})
        </Button>
      )}
    </div>
  );
}
