'use client';

import { useCallback, useState } from 'react';

const PROFILE_LOAD_ERROR = 'Não foi possível carregar seu perfil.';
const PROFILE_SAVE_ERROR = 'Não foi possível salvar seu perfil. Tente novamente.';

export interface UseAiProfileResult {
  profile: string;
  error: string | null;
  isBusy: boolean;
  load: () => Promise<void>;
  save: (text: string) => Promise<boolean>;
}

export function useAiProfile(): UseAiProfileResult {
  const [profile, setProfile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/profile');
      if (!response.ok) throw new Error('profile');
      const body = (await response.json()) as { profile?: unknown };
      setProfile(typeof body.profile === 'string' ? body.profile : '');
    } catch {
      setError(PROFILE_LOAD_ERROR);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const save = useCallback(async (text: string): Promise<boolean> => {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: text }),
      });
      if (!response.ok) {
        let message = PROFILE_SAVE_ERROR;
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === 'string' && body.error) message = body.error;
        } catch {
          // corpo inválido: mantém a mensagem padrão
        }
        setError(message);
        return false;
      }
      setProfile(text.trim());
      return true;
    } catch {
      setError(PROFILE_SAVE_ERROR);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { profile, error, isBusy, load, save };
}
