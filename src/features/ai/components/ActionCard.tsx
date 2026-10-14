'use client';

import { useState } from 'react';
import { Check, Pencil, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActionEditForm } from '@/features/ai/components/ActionEditForm';
import { CandidatePicker } from '@/features/ai/components/CandidatePicker';
import { MissingFieldsNotice } from '@/features/ai/components/MissingFieldsNotice';
import type { ActionCardDto, ActionFieldDto, AgentEntity, AgentOp } from '@/features/ai/types';

export interface ActionCardProps {
  card: ActionCardDto;
  /** Requisição em andamento para este card (desabilita os botões). */
  busy?: boolean;
  /** Erro inline (rede/servidor). O card segue editável para nova tentativa. */
  error?: string | null;
  onConfirm: (id: string) => void;
  /** Devolve true quando salvou (fecha o formulário); false mantém aberto. */
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<boolean> | boolean;
  onCancel: (id: string) => void;
  onSelect: (id: string, index: number) => void;
}

const NOUNS: Record<AgentEntity, { noun: string; feminine: boolean }> = {
  transaction: { noun: 'Lançamento', feminine: false },
  investment: { noun: 'Investimento', feminine: false },
  category: { noun: 'Categoria', feminine: true },
};

const DONE_VERBS: Record<AgentOp, string> = {
  create: 'registrad',
  update: 'alterad',
  delete: 'removid',
};

function doneText(entity: AgentEntity, op: AgentOp): string {
  const { noun, feminine } = NOUNS[entity];
  return `${noun} ${DONE_VERBS[op]}${feminine ? 'a' : 'o'}.`;
}

function findField(fields: ActionFieldDto[] | undefined, key: string): ActionFieldDto | undefined {
  return fields?.find((f) => f.key === key);
}

function headline(card: ActionCardDto): string {
  const { noun } = NOUNS[card.entity];
  if (card.op === 'update') return `Alterar ${noun.toLowerCase()}`;
  if (card.op === 'delete') return `Remover ${noun.toLowerCase()}`;
  if (card.entity === 'transaction') {
    return findField(card.fields, 'type')?.value === 'income' ? 'Nova receita' : 'Nova despesa';
  }
  return `Novo ${noun.toLowerCase()}`;
}

function ItemSummary({ fields }: { fields: ActionFieldDto[] }) {
  const type = findField(fields, 'type')?.value === 'income' ? 'income' : 'expense';
  const title = findField(fields, 'title')?.display;
  const value = findField(fields, 'value')?.display;
  const category = findField(fields, 'category');
  const paid = findField(fields, 'paid');
  const date = findField(fields, 'date')?.display;
  const responsible = findField(fields, 'responsible')?.display;
  const Icon = type === 'income' ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-start gap-3">
      <span
        data-testid="action-card-type"
        data-type={type}
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          type === 'income'
            ? 'bg-finance-income/15 text-finance-income'
            : 'bg-finance-expense/15 text-finance-expense',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {title && <p className="truncate font-medium text-on-surface">{title}</p>}
        <p className="font-mono text-lg font-semibold text-on-surface">{value || 'R$ —'}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {category?.display && (
            <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs text-on-surface-variant">
              {category.display}
            </span>
          )}
          {paid && (
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs',
                paid.value === true
                  ? 'bg-finance-income/15 text-finance-income'
                  : 'bg-finance-recurring/15 text-finance-recurring',
              )}
            >
              {paid.display || (paid.value === true ? 'Pago' : 'Pendente')}
            </span>
          )}
        </div>
        {(date || responsible) && (
          <p className="text-xs text-on-surface-variant">
            {[date, responsible].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

function ChangeList({ fields, before }: { fields: ActionFieldDto[]; before: ActionFieldDto[] }) {
  const changes = fields.flatMap((field) => {
    const old = findField(before, field.key);
    return old && old.display !== field.display ? [{ field, old }] : [];
  });
  if (changes.length === 0) return null;

  return (
    <ul className="space-y-1 rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface-variant">
      {changes.map(({ field, old }) => (
        <li key={field.key}>
          <span className="font-medium text-on-surface">{field.label}:</span> de{' '}
          <span className="line-through">{old.display || '—'}</span> para{' '}
          <span className="font-medium text-on-surface">{field.display || '—'}</span>
        </li>
      ))}
    </ul>
  );
}

const ICON_BUTTON = 'size-12';

export function ActionCard({ card, busy = false, error = null, onConfirm, onUpdate, onCancel, onSelect }: ActionCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const confirming = card.status === 'confirming' || busy;
  const destructive = card.destructive || card.op === 'delete';
  const open = card.status === 'needs_input' || card.status === 'ready' || card.status === 'confirming';
  const canEdit = card.op !== 'delete' && card.fields.some((f) => f.editable);
  const resolved = !open && card.status !== 'awaiting_pick';

  const handleUpdate = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const saved = await onUpdate(card.id, fields);
      if (saved) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const resolvedText: Partial<Record<ActionCardDto['status'], string>> = {
    confirmed: doneText(card.entity, card.op),
    cancelled: 'Cancelada. Nada foi alterado.',
    expired: 'Esta ação expirou. Peça de novo se ainda quiser.',
    failed: card.message ?? 'Não consegui concluir esta ação. Nada foi perdido, você pode pedir de novo.',
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border p-4',
        destructive
          ? 'border-finance-expense/40 bg-finance-expense/10'
          : 'border-transparent bg-surface-container-low',
        (card.status === 'cancelled' || card.status === 'expired') && 'opacity-70',
      )}
      data-testid="action-card"
      data-status={card.status}
    >
      <p
        className={cn(
          'text-xs font-medium uppercase tracking-wide',
          destructive ? 'text-finance-expense' : 'text-on-surface-variant',
        )}
      >
        {headline(card)}
      </p>

      {destructive ? (
        <>
          <p className="text-sm text-on-surface-variant">Será removido:</p>
          <ItemSummary fields={card.before ?? card.fields} />
        </>
      ) : (
        <>
          <ItemSummary fields={card.fields} />
          {card.op === 'update' && card.before && <ChangeList fields={card.fields} before={card.before} />}
        </>
      )}

      {card.status === 'needs_input' && <MissingFieldsNotice missingFields={card.missingFields} />}

      {card.status === 'awaiting_pick' && card.candidates && (
        <CandidatePicker
          candidates={card.candidates}
          disabled={busy}
          onSelect={(index) => onSelect(card.id, index)}
        />
      )}

      {confirming && (
        <p className="text-sm text-on-surface-variant" role="status">
          Salvando…
        </p>
      )}

      {resolved && resolvedText[card.status] && (
        <p className="text-sm text-on-surface-variant" role="status">
          {resolvedText[card.status]}
        </p>
      )}

      {editing && open ? (
        <ActionEditForm
          card={card}
          saving={saving}
          error={error}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      ) : (
        error && (
          <p className="text-sm text-finance-expense" role="alert">
            {error}
          </p>
        )
      )}

      {(open || card.status === 'awaiting_pick') && !editing && (
        <div className="flex items-center justify-end gap-2">
          {open && canEdit && (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Alterar"
              title="Alterar"
              disabled={confirming}
              onClick={() => setEditing(true)}
              className={ICON_BUTTON}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Cancelar"
            title="Cancelar"
            disabled={confirming}
            onClick={() => onCancel(card.id)}
            className={ICON_BUTTON}
          >
            <X aria-hidden="true" />
          </Button>
          {open && (
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'default'}
              size="icon-lg"
              aria-label={destructive ? 'Confirmar remoção' : 'Confirmar'}
              title={destructive ? 'Confirmar remoção' : 'Confirmar'}
              disabled={card.status === 'needs_input' || confirming}
              onClick={() => onConfirm(card.id)}
              className={ICON_BUTTON}
            >
              <Check aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
