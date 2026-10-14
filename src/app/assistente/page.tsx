'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AskForm } from '@/features/ai/components/AskForm';
import { ChatMessage } from '@/features/ai/components/ChatMessage';
import { ConversationSidebar } from '@/features/ai/components/ConversationSidebar';
import { ProfileEditor } from '@/features/ai/components/ProfileEditor';
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
  const { refresh: refreshSessions, remove: removeSession, loadProfile } = conversations;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    setProfileOpen(false);
    setSidebarOpen(false);
    void openConversation(id);
  };

  const handleNew = () => {
    setProfileOpen(false);
    setSidebarOpen(false);
    void newConversation();
  };

  const handleOpenProfile = () => {
    setProfileOpen(true);
    void loadProfile();
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
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col pb-24 md:pb-0">
        <HeaderLayout />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto md:grid md:grid-cols-[17rem_minmax(0,1fr)] md:gap-6">
          <aside
            aria-label="Barra lateral de conversas"
            className={`${sidebarOpen ? 'block' : 'hidden'} md:block mb-4 md:mb-0 space-y-4`}
          >
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
              onOpenProfile={handleOpenProfile}
            />
            {profileOpen && (
              <ProfileEditor
                initial={conversations.profile}
                error={conversations.profileError}
                isBusy={conversations.isProfileBusy}
                onSave={conversations.saveProfile}
                onClose={() => setProfileOpen(false)}
              />
            )}
          </aside>
          <div className="min-w-0 space-y-6">
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
                onClick={() => setSidebarOpen((v) => !v)}
                aria-expanded={sidebarOpen}
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
                Conversas
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
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
