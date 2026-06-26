'use client';

import { Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyState() {
  return (
    <Card className="p-8">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-on-surface-variant" />
        </div>
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Adicione sua primeira transação para começar a acompanhar suas finanças.
        </p>
      </CardContent>
    </Card>
  );
}
