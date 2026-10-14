'use client';

import { useEffect, useRef } from 'react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AskForm } from '@/features/ai/components/AskForm';
import { ChatMessage } from '@/features/ai/components/ChatMessage';
import { useAssistant } from '@/features/ai/hooks/useAssistant';

export default function AssistentePage() {
  const { status, messages, error, ask, hydrate, newConversation, isHydrating, isStartingNew, actions } =
    useAssistant();
  const isLoading = status === 'loading';
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading, error]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col pb-24 md:pb-0">
        <HeaderLayout />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-display">Assistente</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Pergunte sobre suas transações, metas e investimentos.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void newConversation()}
                disabled={isLoading || isStartingNew}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nova conversa
              </Button>
            </div>

            <section
              aria-label="Conversa"
              aria-live="polite"
              aria-busy={isHydrating || isStartingNew}
              className="space-y-4 min-h-[40vh]"
            >
              {isHydrating && messages.length === 0 && (
                <div data-testid="history-skeleton" className="space-y-3" aria-busy="true">
                  <span className="sr-only">Carregando conversa...</span>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}

              {messages.length === 0 && !isLoading && (
                <p className="text-sm text-on-surface-variant">
                  Faça uma pergunta para receber uma resposta com base nos seus dados financeiros.
                </p>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} actions={actions} />
              ))}

              {isLoading && (
                <div data-testid="answer-skeleton" className="space-y-3 pl-11" aria-busy="true">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-finance-expense/10 text-finance-expense p-4 text-sm"
                >
                  {error}
                </div>
              )}

              <div ref={endRef} />
            </section>

            <div className="sticky bottom-20 md:bottom-4 space-y-2 bg-background pt-2">
              <AskForm onSubmit={ask} isLoading={isLoading} />
              <p className="text-xs text-on-surface-variant">
                Dados financeiros resumidos (sem senhas, e-mail ou identificadores) são enviados ao
                Google para gerar a resposta. O assistente não oferece aconselhamento profissional.
              </p>
            </div>
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
