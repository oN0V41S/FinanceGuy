'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { PanelLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AskForm } from '@/features/ai/components/AskForm';
import { ChatMessage } from '@/features/ai/components/ChatMessage';
import { ConversationSidebar } from '@/features/ai/components/ConversationSidebar';
import { useAssistant } from '@/features/ai/hooks/useAssistant';
import { useConversations } from '@/features/ai/hooks/useConversations';

export default function AssistentePage() {
  const {
    status,
    messages,
    error,
    ask,
    hydrate,
    newConversation,
    openConversation,
    sessionId,
    isHydrating,
    isStartingNew,
    actions,
  } = useAssistant();
  const conversations = useConversations();
  const { refresh: refreshSessions, remove: removeSession } = conversations;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoading = status === 'loading';
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Mantém a lista em dia: ao carregar, ao trocar de conversa e após cada resposta (título novo).
  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions, sessionId, status]);

  const handleSelect = (id: string) => {
    setSidebarOpen(false);
    void openConversation(id);
  };

  const handleNew = () => {
    setSidebarOpen(false);
    void newConversation();
  };

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const ok = await removeSession(id);
      // Excluiu a conversa aberta: abre uma nova em vez de deixar a tela com mensagens órfãs.
      if (ok && id === sessionId) await newConversation();
      return ok;
    },
    [removeSession, sessionId, newConversation],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading, error]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <HeaderLayout />

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fechar conversas"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}
        <aside
          aria-label="Barra lateral de conversas"
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-surface-container p-4 transition-transform duration-200 md:static md:z-auto md:w-72 md:max-w-none md:shrink-0 md:translate-x-0 md:bg-surface-container-low ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full invisible md:visible'
          }`}
        >
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-semibold text-on-surface">Conversas</span>
            <Button type="button" variant="ghost" size="icon" aria-label="Fechar menu de conversas" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <ConversationSidebar
            sessions={conversations.sessions}
            activeId={sessionId}
            isLoading={conversations.isLoading}
            error={conversations.error}
            disabled={isLoading || isStartingNew}
            onSelect={handleSelect}
            onNew={handleNew}
            onRename={conversations.rename}
            onDelete={handleDelete}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 md:px-6">
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
              onClick={() => setSidebarOpen(true)}
              aria-expanded={sidebarOpen}
              className="shrink-0 md:hidden"
            >
              <PanelLeft className="h-4 w-4" aria-hidden="true" />
              Conversas
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
            <section
              aria-label="Conversa"
              aria-live="polite"
              aria-busy={isHydrating || isStartingNew}
              className="mx-auto w-full max-w-3xl space-y-4"
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
          </div>

          <div className="shrink-0 bg-background px-4 pb-24 pt-2 md:px-6 md:pb-4">
            <div className="mx-auto w-full max-w-3xl space-y-2">
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
