'use client';

import { Banknote, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Investment } from '@/features/investments/validations';
import type { PortfolioItem } from '@/features/investments/marketInvestment.service';

interface InvestmentCardProps {
  investment: Investment;
  /** Cotação e rentabilidade (ativos de mercado). */
  portfolio?: PortfolioItem;
  /** true enquanto as cotações carregam e o ativo ainda não tem dados. */
  isQuoteLoading?: boolean;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onRedeem?: (investment: Investment) => void;
}

function formatCurrency(value: number, currency = 'BRL') {
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

export function InvestmentCard({ investment, portfolio, isQuoteLoading, onEdit, onDelete, onRedeem }: InvestmentCardProps) {
  const isMarketAsset = Boolean(investment.ticker);
  const isRedeemed = investment.status === 'REDEEMED';
  const currency = investment.currency ?? 'BRL';
  const metrics = portfolio?.metrics;
  const isGain = (metrics?.profit ?? 0) >= 0;

  return (
    <Card data-testid="investment-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{investment.name}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline">{investment.type}</Badge>
              {isMarketAsset && <Badge variant="outline">{investment.ticker}</Badge>}
              {isRedeemed && <Badge variant="outline">Resgatado</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Editar investimento" onClick={() => onEdit(investment)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Excluir investimento" onClick={() => onDelete(investment)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold font-mono text-on-surface">
          {formatCurrency(metrics?.currentValue ?? investment.value, currency)}
        </p>

        {isMarketAsset && !isRedeemed && (
          <div className="mt-2 text-sm" data-testid="investment-metrics">
            {metrics ? (
              <p className={isGain ? 'text-finance-income' : 'text-finance-expense'}>
                {isGain ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                {formatCurrency(metrics.profit, currency)} ({metrics.profitPct}%)
              </p>
            ) : isQuoteLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <p className="text-on-surface-variant">Cotação indisponível no momento.</p>
            )}
            {portfolio?.quote?.stale && (
              <p className="text-xs text-on-surface-variant">Última cotação conhecida (provedores fora do ar).</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-0.5 mt-2 text-sm text-on-surface-variant">
          {isMarketAsset && investment.shares !== undefined && (
            <span>
              {investment.shares} un. · preço médio {formatCurrency(investment.unitPrice ?? 0, currency)}
            </span>
          )}
          {investment.quantity && <span>Quantidade: {investment.quantity}</span>}
          {investment.term && <span>Prazo: {investment.term}</span>}
        </div>

        {isMarketAsset && !isRedeemed && onRedeem && (
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => onRedeem(investment)}>
            <Banknote className="w-4 h-4" />
            Resgatar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
