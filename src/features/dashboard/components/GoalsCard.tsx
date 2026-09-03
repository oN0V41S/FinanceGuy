'use client';

import { Target, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GoalsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Metas Financeiras</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <Target className="w-12 h-12 text-on-surface-variant" />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-on-surface">
            Nenhuma meta cadastrada
          </p>
          <p className="text-sm text-on-surface-variant max-w-xs">
            Defina metas financeiras para acompanhar seu progresso mês a mês
          </p>
        </div>
        <Button disabled title="Em breve" className="mt-2 min-h-12">
          <Plus className="w-4 h-4" />
          Criar meta
        </Button>
      </CardContent>
    </Card>
  );
}
