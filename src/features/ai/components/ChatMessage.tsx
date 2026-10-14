'use client';

import { Sparkles } from 'lucide-react';
import { MarkdownContent } from '@/features/ai/components/MarkdownContent';
import { ActionCardList } from '@/features/ai/components/ActionCardList';
import { NextSteps } from '@/features/ai/components/NextSteps';
import { CompactedDivider } from '@/features/ai/components/CompactedDivider';
import type { UseAssistantActionsResult } from '@/features/ai/hooks/useAssistantActions';
import type { ActionCardsChatMessage, ChatMessage as ChatMessageData } from '@/features/ai/types';

interface ChatMessageProps {
  message: ChatMessageData;
  /** API de ações (useAssistantActions). Sem ela, os cards ficam sem interação. */
  actions?: UseAssistantActionsResult;
}

const EMPTY_BUSY: ReadonlySet<string> = new Set<string>();

function ActionCardsMessage({
  message,
  actions,
}: {
  message: ActionCardsChatMessage;
  actions?: UseAssistantActionsResult;
}) {
  const busyIds = actions?.busyIds ?? EMPTY_BUSY;
  const queueError = actions?.queueErrors[message.queueId];
  const queueBusy = message.actions.some((card) => busyIds.has(card.id));

  return (
    <div className="flex items-start gap-3" data-testid="chat-message-actions">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="w-full min-w-0 max-w-[90%] space-y-3">
        <ActionCardList
          cards={message.actions}
          canConfirmAll={message.nextSteps.canConfirmAll}
          busyIds={busyIds}
          errors={actions?.errors}
          onConfirm={(id) => void actions?.confirm([id])}
          onConfirmAll={(ids) => void actions?.confirm(ids)}
          onUpdate={(id, fields) => actions?.update(id, fields) ?? false}
          onCancel={(id) => void actions?.cancel(id)}
          onSelect={(id, index) => void actions?.select(id, index)}
        />
        <NextSteps
          nextSteps={message.nextSteps}
          busy={queueBusy}
          onCancelRemaining={() => void actions?.cancelQueue(message.queueId)}
        />
        {queueError && (
          <p className="text-sm text-finance-expense" role="alert">
            {queueError}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({ message, actions }: ChatMessageProps) {
  switch (message.kind ?? 'text') {
    case 'action_cards':
      return <ActionCardsMessage message={message as ActionCardsChatMessage} actions={actions} />;
    case 'compacted':
      return <CompactedDivider />;
    default:
      break;
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="chat-message-user">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-primary px-4 py-2.5 text-white">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3" data-testid="chat-message-assistant">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 max-w-[90%] rounded-2xl rounded-tl-md bg-surface-container px-4 py-3">
        <MarkdownContent content={message.content} />
        {'truncated' in message && message.truncated && (
          <p className="mt-2 text-xs text-on-surface-variant">
            A resposta foi encurtada. Faça uma pergunta mais específica para ver os detalhes.
          </p>
        )}
      </div>
    </div>
  );
}
