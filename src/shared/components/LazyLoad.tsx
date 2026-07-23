'use client';

import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyLoadProps {
  isReady: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}

export function LazyLoad({ isReady, children, message, className }: LazyLoadProps) {
  if (!isReady) {
    return <LoadingSpinner message={message} className={className} />;
  }

  return <>{children}</>;
}
