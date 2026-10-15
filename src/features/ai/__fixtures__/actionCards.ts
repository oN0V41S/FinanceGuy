import type {
  ActionCardDto,
  ActionFieldDto,
  ActionCardsChatMessage,
  NextStepsDto,
} from '@/features/ai/types';

export function field(overrides: Partial<ActionFieldDto> & Pick<ActionFieldDto, 'key'>): ActionFieldDto {
  return {
    label: overrides.key,
    value: null,
    display: '',
    editable: true,
    missing: false,
    ...overrides,
  };
}

export function transactionFields(
  over: Partial<Record<string, Partial<ActionFieldDto>>> = {},
): ActionFieldDto[] {
  const base: ActionFieldDto[] = [
    field({ key: 'type', label: 'Tipo', value: 'expense', display: 'Despesa' }),
    field({ key: 'title', label: 'Título', value: 'Mercado', display: 'Mercado' }),
    field({ key: 'value', label: 'Valor', value: 50, display: 'R$ 50,00' }),
    field({ key: 'date', label: 'Data', value: '2026-10-13', display: '13/10/2026' }),
    field({ key: 'category', label: 'Categoria', value: 'Alimentação', display: 'Alimentação' }),
    field({ key: 'responsible', label: 'Responsável', value: 'Ana', display: 'Ana' }),
    field({ key: 'paid', label: 'Pago', value: true, display: 'Pago' }),
  ];
  return base.map((f) => ({ ...f, ...(over[f.key] ?? {}) }));
}

export function makeCard(overrides: Partial<ActionCardDto> = {}): ActionCardDto {
  return {
    id: 'a1',
    queueId: 'q1',
    position: 0,
    entity: 'transaction',
    op: 'create',
    status: 'ready',
    destructive: false,
    fields: transactionFields(),
    missingFields: [],
    expiresAt: '2026-10-13T12:10:00.000Z',
    ...overrides,
  };
}

export function makeNextSteps(overrides: Partial<NextStepsDto> = {}): NextStepsDto {
  return { total: 1, done: 0, failed: 0, cancelled: 0, canConfirmAll: false, ...overrides };
}

export function makeCardsMessage(
  actions: ActionCardDto[],
  nextSteps: Partial<NextStepsDto> = {},
  id = 'm1',
): ActionCardsChatMessage {
  return {
    id,
    role: 'assistant',
    kind: 'action_cards',
    queueId: actions[0]?.queueId ?? 'q1',
    content: `${actions.length} ação(ões) para confirmar`,
    actions,
    nextSteps: makeNextSteps({ total: actions.length, ...nextSteps }),
  };
}
