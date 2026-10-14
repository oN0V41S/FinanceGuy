'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAssistantActions } from '@/features/ai/hooks/useAssistantActions';
import type {
  ActionCardDto,
  AskResponseBody,
  AssistantStatus,
  ChatMessage,
  NextStepsDto,
  SessionDto,
  UseAssistantResult,
} from '@/features/ai/types';

const REQUEST_TIMEOUT_MS = 65_000;
const NETWORK_ERROR_MESSAGE = 'Não foi possível obter a resposta. Tente novamente.';
const HYDRATE_ERROR_MESSAGE =
  'Não foi possível carregar a conversa anterior. Você pode começar uma nova pergunta.';
const OPEN_SESSION_ERROR_MESSAGE =
  'Não foi possível abrir essa conversa. Sua conversa atual foi mantida.';
const NEW_SESSION_ERROR_MESSAGE =
  'Não foi possível iniciar uma nova conversa. Sua conversa atual foi mantida.';
const ACTIONS_FALLBACK_TEXT = 'Preparei as ações abaixo para você revisar e confirmar.';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'error' in body) {
      const message = (body as { error: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  } catch {
    // corpo ausente ou inválido: usa a mensagem padrão
  }
  return NETWORK_ERROR_MESSAGE;
}

function isSessionDto(value: unknown): value is SessionDto {
  if (!value || typeof value !== 'object') return false;
  const dto = value as Partial<SessionDto>;
  return typeof dto.sessionId === 'string' && Array.isArray(dto.messages);
}

function emptyNextSteps(cards: ActionCardDto[]): NextStepsDto {
  return { total: cards.length, done: 0, failed: 0, cancelled: 0, canConfirmAll: false };
}

let messageCounter = 0;
const nextId = (): string => `msg-${++messageCounter}`;

export function useAssistant(): UseAssistantResult {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const inFlight = useRef(false);
  const startingNew = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const touchedRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const actions = useAssistantActions({ setMessages });

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const ask = useCallback(async (question: string): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    touchedRef.current = true;

    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setStatus('loading');
    setError(null);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: question }]);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          sessionIdRef.current ? { question, sessionId: sessionIdRef.current } : { question },
        ),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        if (controllerRef.current !== controller) return;
        setError(message);
        setStatus('error');
        return;
      }

      const body = (await response.json()) as Partial<AskResponseBody>;
      if (controllerRef.current !== controller) return;
      if (typeof body.sessionId === 'string' && body.sessionId) {
        sessionIdRef.current = body.sessionId;
        setSessionId(body.sessionId);
      }

      const cards = Array.isArray(body.actions) ? body.actions : [];
      if (body.kind === 'actions' && cards.length > 0) {
        const queueId = body.queueId ?? cards[0].queueId;
        const content = typeof body.answer === 'string' && body.answer ? body.answer : ACTIONS_FALLBACK_TEXT;
        const nextSteps = body.nextSteps ?? emptyNextSteps(cards);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', kind: 'action_cards', content, queueId, actions: cards, nextSteps },
        ]);
        setStatus('success');
        return;
      }

      if (typeof body.answer !== 'string' || !body.answer) {
        setError(NETWORK_ERROR_MESSAGE);
        setStatus('error');
        return;
      }
      const answer = body.answer;
      const truncated = body.truncated === true;
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: answer, truncated }]);
      setStatus('success');
    } catch {
      if (controllerRef.current !== controller) return;
      setError(NETWORK_ERROR_MESSAGE);
      setStatus('error');
    } finally {
      clearTimeout(timer);
      if (controllerRef.current === controller || controllerRef.current === null) {
        inFlight.current = false;
      }
    }
  }, []);

  const hydrate = useCallback(async (): Promise<void> => {
    setIsHydrating(true);
    try {
      const response = await fetch('/api/ai/session', { method: 'GET' });
      if (!response.ok) throw new Error('hydrate');
      const dto: unknown = await response.json();
      if (!isSessionDto(dto)) return;
      sessionIdRef.current = dto.sessionId;
      setSessionId(dto.sessionId);
      // Se o usuário já interagiu enquanto carregava, não sobrescreve a conversa.
      if (!touchedRef.current) setMessages(dto.messages);
    } catch {
      if (!touchedRef.current) setError(HYDRATE_ERROR_MESSAGE);
    } finally {
      setIsHydrating(false);
    }
  }, []);

  const newConversation = useCallback(async (): Promise<void> => {
    if (startingNew.current) return;
    startingNew.current = true;
    setIsStartingNew(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/session', { method: 'POST' });
      if (!response.ok) throw new Error('new-session');
      const dto: unknown = await response.json();
      if (!isSessionDto(dto)) throw new Error('new-session');
      controllerRef.current?.abort();
      controllerRef.current = null;
      inFlight.current = false;
      sessionIdRef.current = dto.sessionId;
      setSessionId(dto.sessionId);
      touchedRef.current = true;
      setMessages(dto.messages);
      setStatus('idle');
    } catch {
      setError(NEW_SESSION_ERROR_MESSAGE);
    } finally {
      startingNew.current = false;
      setIsStartingNew(false);
    }
  }, []);

  /** Troca para outra conversa (POST /api/ai/sessions/[id]/activate) e carrega as mensagens dela. */
  const openConversation = useCallback(async (id: string): Promise<void> => {
    if (startingNew.current || id === sessionIdRef.current) return;
    startingNew.current = true;
    setIsStartingNew(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/sessions/${encodeURIComponent(id)}/activate`, { method: 'POST' });
      if (!response.ok) throw new Error('open-session');
      const dto: unknown = await response.json();
      if (!isSessionDto(dto)) throw new Error('open-session');
      controllerRef.current?.abort();
      controllerRef.current = null;
      inFlight.current = false;
      sessionIdRef.current = dto.sessionId;
      setSessionId(dto.sessionId);
      touchedRef.current = true;
      setMessages(dto.messages);
      setStatus('idle');
    } catch {
      setError(OPEN_SESSION_ERROR_MESSAGE);
    } finally {
      startingNew.current = false;
      setIsStartingNew(false);
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlight.current = false;
    setStatus('idle');
    setMessages([]);
    setError(null);
  }, []);

  return {
    status,
    messages,
    error,
    ask,
    reset,
    hydrate,
    newConversation,
    openConversation,
    sessionId,
    isHydrating,
    isStartingNew,
    actions,
  };
}
