'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AskResponseBody, AssistantStatus, ChatMessage, UseAssistantResult } from '@/features/ai/types';

const REQUEST_TIMEOUT_MS = 65_000;
const NETWORK_ERROR_MESSAGE = 'Não foi possível obter a resposta. Tente novamente.';

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

let messageCounter = 0;
const nextId = (): string => `msg-${++messageCounter}`;

export function useAssistant(): UseAssistantResult {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const ask = useCallback(async (question: string): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;

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
        body: JSON.stringify({ question }),
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

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlight.current = false;
    setStatus('idle');
    setMessages([]);
    setError(null);
  }, []);

  return { status, messages, error, ask, reset };
}
