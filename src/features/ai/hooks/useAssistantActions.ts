'use client';

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { clearCacheByPrefix } from '@/shared/hooks/useLocalStorageCache';
import { TRANSACTIONS_CACHE_PREFIX } from '@/features/transactions/hooks/useTransactions';
import type {
  ActionCardDto,
  CancelQueueRequest,
  ChatMessage,
  ConfirmActionsRequest,
  ConfirmActionsResponse,
  NextStepsDto,
  SelectCandidateRequest,
  UpdateActionRequest,
} from '@/features/ai/types';

/** Resposta (assumida) de PATCH /[id], POST /[id]/select e POST /[id]/cancel. */
export interface SingleActionResponse {
  card: ActionCardDto;
  nextSteps: NextStepsDto;
}

/** Resposta (assumida) de POST /api/ai/actions/cancel. */
export interface CancelQueueResponse {
  cards: ActionCardDto[];
  nextSteps: NextStepsDto;
}

export interface UseAssistantActionsResult {
  busyIds: ReadonlySet<string>;
  /** Erros inline por id de card. */
  errors: Record<string, string>;
  /** Erros inline por fila (cancelar restantes). */
  queueErrors: Record<string, string>;
  confirm: (ids: string[]) => Promise<void>;
  update: (id: string, fields: Record<string, unknown>) => Promise<boolean>;
  select: (id: string, index: number) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  cancelQueue: (queueId: string) => Promise<void>;
}

interface Options {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

const MSG_NETWORK = 'Sem conexão no momento. Nada foi alterado, tente novamente.';
const MSG_GENERIC = 'Não consegui concluir agora. Tente novamente.';

class ActionRequestError extends Error {}

/** Substitui cards (por id) e próximos passos nas mensagens que os contêm. */
export function applyCardUpdates(
  messages: ChatMessage[],
  cards: ActionCardDto[],
  nextSteps?: NextStepsDto,
): ChatMessage[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return messages.map((message) => {
    if (message.kind !== 'action_cards') return message;
    if (!message.actions.some((card) => byId.has(card.id))) return message;
    return {
      ...message,
      actions: message.actions.map((card) => byId.get(card.id) ?? card),
      nextSteps: nextSteps ?? message.nextSteps,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function request<T>(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ActionRequestError(MSG_NETWORK);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const serverMessage = isRecord(data) && typeof data.error === 'string' ? data.error : null;
    throw new ActionRequestError(serverMessage ?? MSG_GENERIC);
  }
  return data as T;
}

function messageOf(error: unknown): string {
  return error instanceof ActionRequestError ? error.message : MSG_GENERIC;
}

export function useAssistantActions({ setMessages }: Options): UseAssistantActionsResult {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [queueErrors, setQueueErrors] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const begin = useCallback((ids: string[]): string[] => {
    const free = ids.filter((id) => !inFlight.current.has(id));
    if (free.length === 0) return [];
    free.forEach((id) => inFlight.current.add(id));
    setBusyIds(new Set(inFlight.current));
    setErrors((prev) => {
      const next = { ...prev };
      free.forEach((id) => delete next[id]);
      return next;
    });
    return free;
  }, []);

  const end = useCallback((ids: string[]) => {
    ids.forEach((id) => inFlight.current.delete(id));
    setBusyIds(new Set(inFlight.current));
  }, []);

  const fail = useCallback((ids: string[], message: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = message;
      });
      return next;
    });
  }, []);

  const confirm = useCallback(
    async (ids: string[]) => {
      const active = begin(ids);
      if (active.length === 0) return;
      try {
        const data = await request<ConfirmActionsResponse>(
          '/api/ai/actions/confirm',
          'POST',
          { ids: active } satisfies ConfirmActionsRequest,
        );
        if (!isRecord(data) || !Array.isArray(data.results)) {
          throw new ActionRequestError(MSG_GENERIC);
        }
        const cards = data.results.map((item) => item.card).filter(Boolean);
        setMessages((prev) => applyCardUpdates(prev, cards, data.nextSteps));
        if (data.results.some((item) => item.status === 'confirmed')) {
          clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
        }
      } catch (error) {
        fail(active, messageOf(error));
      } finally {
        end(active);
      }
    },
    [begin, end, fail, setMessages],
  );

  const applySingle = useCallback(
    (data: unknown): boolean => {
      if (!isRecord(data) || !isRecord(data.card)) return false;
      const { card, nextSteps } = data as unknown as SingleActionResponse;
      setMessages((prev) => applyCardUpdates(prev, [card], nextSteps));
      return true;
    },
    [setMessages],
  );

  const runSingle = useCallback(
    async (id: string, url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<boolean> => {
      const active = begin([id]);
      if (active.length === 0) return false;
      try {
        const data = await request<SingleActionResponse>(url, method, body);
        if (!applySingle(data)) throw new ActionRequestError(MSG_GENERIC);
        return true;
      } catch (error) {
        fail([id], messageOf(error));
        return false;
      } finally {
        end(active);
      }
    },
    [applySingle, begin, end, fail],
  );

  const update = useCallback(
    (id: string, fields: Record<string, unknown>) =>
      runSingle(id, `/api/ai/actions/${id}`, 'PATCH', { fields } satisfies UpdateActionRequest),
    [runSingle],
  );

  const select = useCallback(
    async (id: string, index: number) => {
      await runSingle(id, `/api/ai/actions/${id}/select`, 'POST', { index } satisfies SelectCandidateRequest);
    },
    [runSingle],
  );

  const cancel = useCallback(
    async (id: string) => {
      await runSingle(id, `/api/ai/actions/${id}/cancel`, 'POST');
    },
    [runSingle],
  );

  const cancelQueue = useCallback(
    async (queueId: string) => {
      const key = `queue:${queueId}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      setQueueErrors((prev) => {
        const next = { ...prev };
        delete next[queueId];
        return next;
      });
      try {
        const data = await request<CancelQueueResponse>(
          '/api/ai/actions/cancel',
          'POST',
          { queueId } satisfies CancelQueueRequest,
        );
        if (!isRecord(data) || !Array.isArray(data.cards)) {
          throw new ActionRequestError(MSG_GENERIC);
        }
        setMessages((prev) => applyCardUpdates(prev, data.cards, data.nextSteps));
      } catch (error) {
        setQueueErrors((prev) => ({ ...prev, [queueId]: messageOf(error) }));
      } finally {
        inFlight.current.delete(key);
      }
    },
    [setMessages],
  );

  return { busyIds, errors, queueErrors, confirm, update, select, cancel, cancelQueue };
}
