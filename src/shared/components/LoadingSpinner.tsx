'use client';

import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message, className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
    >
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      {message && (
        <p className="text-sm text-on-surface-variant">{message}</p>
      )}
    </div>
  );
}
