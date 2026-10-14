'use client';

import { Sparkles } from 'lucide-react';
import { MarkdownContent } from '@/features/ai/components/MarkdownContent';
import type { ChatMessage as ChatMessageData } from '@/features/ai/types';

export function ChatMessage({ message }: { message: ChatMessageData }) {
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
        {message.truncated && (
          <p className="mt-2 text-xs text-on-surface-variant">
            A resposta foi encurtada. Faça uma pergunta mais específica para ver os detalhes.
          </p>
        )}
      </div>
    </div>
  );
}
