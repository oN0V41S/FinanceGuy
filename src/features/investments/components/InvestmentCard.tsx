'use client';

import { Pencil, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Investment } from '@/features/investments/validations';

interface InvestmentCardProps {
  investment: Investment;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function InvestmentCard({ investment, onEdit, onDelete }: InvestmentCardProps) {
  return (
    <Card data-testid="investment-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{investment.name}</CardTitle>
            <Badge variant="outline" className="mt-1">
              {investment.type}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar investimento"
            onClick={() => onEdit(investment)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir investimento"
            onClick={() => onDelete(investment)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold font-mono text-on-surface">
          {formatCurrency(investment.value)}
        </p>
        <div className="flex flex-col gap-0.5 mt-2 text-sm text-on-surface-variant">
          {investment.quantity && <span>Quantidade: {investment.quantity}</span>}
          {investment.term && <span>Prazo: {investment.term}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
