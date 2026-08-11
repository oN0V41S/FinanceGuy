'use client';

import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export type DeleteScope = 'single' | 'future';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: DeleteScope) => Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  isRecurring?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Excluir Transação',
  description = 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
  isLoading = false,
  isRecurring = false,
}: ConfirmDeleteModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [submittingScope, setSubmittingScope] = useState<DeleteScope | null>(null);

  const handleConfirm = async (scope: DeleteScope) => {
    setError(null);
    setSubmittingScope(scope);
    try {
      await onConfirm(scope);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSubmittingScope(null);
    }
  };

  const isSubmitting = submittingScope !== null || isLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-sm text-on-surface-variant">
          {description}
        </p>

        {isRecurring && (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-xs text-muted-foreground">
              As parcelas anteriores do histórico não serão alteradas.
            </p>
          </div>
        )}

        {isRecurring ? (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm('single')}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {submittingScope === 'single' ? 'Excluindo...' : 'Excluir apenas esta'}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm('future')}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {submittingScope === 'future' ? 'Excluindo...' : 'Excluir esta e as futuras'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm('single')}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {submittingScope === 'single' ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
