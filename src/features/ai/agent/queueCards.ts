import type { QueueCardLookup, QueueCardState } from '../session/session.service';
import { computeNextSteps, toCard } from './cards';
import type { AdapterRegistry } from './entityAdapters/types';
import type { IPendingActionRepository } from './repositories/IPendingAction.repository';

export interface QueueCardLookupDeps {
  pending: IPendingActionRepository;
  adapters: AdapterRegistry;
  now?: () => Date;
}

/**
 * Estado real dos cards por fila, a partir das ações pendentes (fonte da verdade).
 * Usado na hidratação da sessão para o reload mostrar confirmada/cancelada/expirada.
 */
export function createQueueCardLookup(deps: QueueCardLookupDeps): QueueCardLookup {
  const now = deps.now ?? (() => new Date());
  return async (userId, queueIds) => {
    const at = now();
    // Libera ações vencidas e confirmações presas; falha aqui não bloqueia a leitura.
    await deps.pending.expireStale(userId, at).catch(() => 0);
    const states = new Map<string, QueueCardState>();
    for (const queueId of queueIds) {
      const records = await deps.pending.listByQueue(queueId, userId);
      if (records.length === 0) continue;
      states.set(queueId, {
        actions: records.map((record) => toCard(record, { adapters: deps.adapters, now: at })),
        nextSteps: computeNextSteps(records, deps.adapters, at),
      });
    }
    return states;
  };
}
