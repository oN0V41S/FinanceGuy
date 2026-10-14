'use client';

import { useState } from 'react';
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionSummaryDto } from '@/features/ai/types';

interface ConversationSidebarProps {
  sessions: SessionSummaryDto[];
  activeId: string | null;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const UNTITLED = 'Nova conversa';
const ICON_BUTTON = 'size-11 shrink-0 text-on-surface-variant hover:text-on-surface';

export function ConversationSidebar({
  sessions,
  activeId,
  isLoading,
  error,
  disabled = false,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const startEdit = (session: SessionSummaryDto) => {
    setConfirmingId(null);
    setEditingId(session.id);
    setDraft(session.title ?? '');
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const ok = await onRename(editingId, draft);
    if (ok) setEditingId(null);
  };

  const confirmDelete = async (id: string) => {
    const ok = await onDelete(id);
    if (ok) setConfirmingId(null);
  };

  return (
    <nav aria-label="Conversas" className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" onClick={onNew} disabled={disabled} className="w-full">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nova conversa
      </Button>

      {error && (
        <div role="alert" className="rounded-xl bg-finance-expense/10 text-finance-expense p-3 text-sm">
          {error}
        </div>
      )}

      {isLoading && sessions.length === 0 && (
        <div data-testid="sessions-skeleton" className="space-y-2" aria-busy="true">
          <span className="sr-only">Carregando conversas...</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && sessions.length === 0 && !error && (
        <p className="text-sm text-on-surface-variant">Suas conversas aparecerão aqui.</p>
      )}

      <ul className="space-y-1">
        {sessions.map((session) => {
          const isActive = session.id === activeId;
          const label = session.title || UNTITLED;
          if (editingId === session.id) {
            return (
              <li key={session.id} className="flex items-center gap-1">
                <input
                  aria-label="Novo título da conversa"
                  value={draft}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="min-h-11 min-w-0 flex-1 rounded-lg bg-surface-container px-3 text-sm text-on-surface"
                />
                <Button type="button" variant="ghost" className={ICON_BUTTON} aria-label="Salvar título" onClick={() => void commitEdit()}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" className={ICON_BUTTON} aria-label="Cancelar edição" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            );
          }
          if (confirmingId === session.id) {
            return (
              <li key={session.id} className="rounded-lg bg-finance-expense/10 p-2 text-sm text-on-surface">
                <p className="mb-2">Excluir “{label}”? Isso apaga as mensagens.</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void confirmDelete(session.id)}>
                    Excluir
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                    Manter
                  </Button>
                </div>
              </li>
            );
          }
          return (
            <li key={session.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                disabled={disabled}
                aria-current={isActive ? 'true' : undefined}
                className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left text-sm ${
                  isActive ? 'bg-surface-container-high text-on-surface font-medium' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
              <Button type="button" variant="ghost" className={ICON_BUTTON} aria-label={`Renomear conversa ${label}`} onClick={() => startEdit(session)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="ghost" className={ICON_BUTTON} aria-label={`Excluir conversa ${label}`} onClick={() => setConfirmingId(session.id)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
