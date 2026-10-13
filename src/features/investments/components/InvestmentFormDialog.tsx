'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentTickers } from '@/features/investments/hooks/useRecentTickers';
import { useTickerPreview } from '@/features/investments/hooks/useTickerPreview';
import { PriceHistoryChart } from '@/features/investments/components/PriceHistoryChart';
import type { HistoryRange } from '@/features/investments/quotes/types';
import { CreateInvestmentSchema, InvestmentTypeEnum, type CreateInvestmentInput, type Investment } from '@/features/investments/validations';

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSubmit: (input: CreateInvestmentInput) => Promise<void>;
}

interface InvestmentFormState {
  name: string;
  type: Investment['type'];
  value: string;
  quantity: string;
  term: string;
  ticker: string;
  market: string;
  purchaseDate: string;
  unitPrice: string;
  shares: string;
}

const MARKET_LABELS: Record<string, string> = {
  BR: 'Brasil (B3)',
  US: 'Estados Unidos',
  CRYPTO: 'Criptomoedas',
  FX: 'Câmbio',
  OTHER: 'Outros mercados',
};

const MARKET_CURRENCY: Record<string, string> = { BR: 'BRL', US: 'USD', CRYPTO: 'USD', FX: 'USD', OTHER: 'USD' };

const TYPE_LABELS: Record<string, string> = {
  'Renda Fixa': 'Renda Fixa',
  'Renda Variável': 'Renda Variável',
};

const emptyForm: InvestmentFormState = {
  name: '',
  type: 'Renda Fixa',
  value: '',
  quantity: '',
  term: '',
  ticker: '',
  market: 'BR',
  purchaseDate: '',
  unitPrice: '',
  shares: '',
};

export function InvestmentFormDialog({ open, onOpenChange, investment, onSubmit }: InvestmentFormDialogProps) {
  const { recent, add: addRecent, clear: clearRecent } = useRecentTickers();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(investment);
  const [isMarketAsset, setIsMarketAsset] = useState(false);
  const editingMarketAsset = Boolean(investment?.ticker);
  const showMarketFields = isMarketAsset && !isEditing;

  const [range, setRange] = useState<HistoryRange>('3mo');
  const preview = useTickerPreview(showMarketFields ? form.ticker : '', form.market, range);
  const currency = MARKET_CURRENCY[form.market] ?? 'USD';
  const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: preview.history?.currency ?? currency });
  const suggestedName = preview.quote?.name;
  const closeOnPurchaseDate = preview.history?.points.find((p) => p.date === form.purchaseDate);
  const totalInvested = Number(form.shares) * Number(form.unitPrice);

  useEffect(() => {
    if (open) {
      setForm(
        investment
          ? {
              name: investment.name,
              type: investment.type,
              value: String(investment.value),
              quantity: investment.quantity ?? '',
              term: investment.term ?? '',
              ticker: investment.ticker ?? '',
              market: investment.market ?? 'BR',
              purchaseDate: investment.purchaseDate ? new Date(investment.purchaseDate).toISOString().slice(0, 10) : '',
              unitPrice: investment.unitPrice !== undefined ? String(investment.unitPrice) : '',
              shares: investment.shares !== undefined ? String(investment.shares) : '',
            }
          : emptyForm
      );
      setIsMarketAsset(Boolean(investment?.ticker));
      setErrors({});
      setSubmitError(null);
    }
  }, [open, investment]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const marketPayload = {
      ticker: form.ticker || undefined,
      market: form.market,
      currency: investment?.currency ?? MARKET_CURRENCY[form.market],
      purchaseDate: form.purchaseDate || undefined,
      unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
      shares: form.shares ? Number(form.shares) : undefined,
    };

    const parsed = CreateInvestmentSchema.safeParse(
      editingMarketAsset
        ? // ativo de mercado: só nome e prazo são editáveis; a posição muda apenas por compra/resgate
          { name: form.name, type: form.type, value: investment?.value, term: form.term || undefined, ...marketPayload }
        : isMarketAsset
          ? { name: form.name, type: 'Renda Variável', term: form.term || undefined, ...marketPayload }
          : {
              name: form.name,
              type: form.type,
              value: Number(form.value),
              quantity: form.quantity || undefined,
              term: form.term || undefined,
            }
    );

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      if (showMarketFields && parsed.data.ticker) addRecent({ ticker: parsed.data.ticker, market: form.market });
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar investimento');
    } finally {
      setIsSubmitting(false);
    }
  }

  const nameField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor="investment-name">Nome</Label>
      <Input
        id="investment-name"
        className="h-12 px-4 rounded-xl"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder={showMarketFields ? (suggestedName ?? 'Ex: Petrobras PN') : 'Ex: Tesouro Selic'}
      />
      {showMarketFields && suggestedName && form.name !== suggestedName && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => handleChange('name', suggestedName)}>
          Usar “{suggestedName}”
        </Button>
      )}
      {errors.name && <p className="text-sm text-finance-expense">{errors.name}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showMarketFields ? "sm:max-w-xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar investimento' : 'Novo investimento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do seu investimento.'
              : 'Preencha os dados para cadastrar um novo investimento.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            {!isEditing && (
              <div className="flex gap-2" role="group" aria-label="Tipo de cadastro">
                <Button type="button" variant={isMarketAsset ? 'outline' : 'default'} onClick={() => setIsMarketAsset(false)}>
                  Manual
                </Button>
                <Button type="button" variant={isMarketAsset ? 'default' : 'outline'} onClick={() => setIsMarketAsset(true)}>
                  Ativo de mercado
                </Button>
              </div>
            )}

            {!showMarketFields && nameField}

            {showMarketFields && (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="investment-ticker">Ticker</Label>
                  <Input
                    id="investment-ticker"
                    className="h-12 px-4 rounded-xl uppercase"
                    value={form.ticker}
                    onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                    placeholder="Ex: PETR4, AAPL"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  {errors.ticker && <p className="text-sm text-finance-expense">{errors.ticker}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="investment-market">Mercado</Label>
                  <Select value={form.market} onValueChange={(value) => handleChange('market', value as string)}>
                    <SelectTrigger id="investment-market" className="w-full h-12 px-4 rounded-xl">
                      <SelectValue>{MARKET_LABELS[form.market] ?? form.market}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-surface-container">
                      {Object.entries(MARKET_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>

                <div className="flex flex-col gap-2">
                  {recent.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2" data-testid="recent-tickers">
                      <span className="text-xs text-on-surface-variant">Recentes:</span>
                      {recent.map((item) => (
                        <Button
                          key={item.ticker}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setForm((prev) => ({ ...prev, ticker: item.ticker, market: item.market }))}
                        >
                          {item.ticker}
                        </Button>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={clearRecent}>
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>

                {preview.status === 'loading' && <Skeleton className="h-40 w-full" data-testid="ticker-preview-loading" />}

                {preview.status === 'error' && (
                  <p role="status" className="rounded-xl bg-surface-container-high p-3 text-sm text-on-surface-variant">
                    {preview.error} Você ainda pode preencher os dados manualmente.
                  </p>
                )}

                {preview.status === 'ready' && (
                  <section
                    aria-label="Histórico do ativo"
                    className="flex flex-col gap-3 rounded-xl bg-surface-container-high p-4"
                    data-testid="ticker-preview"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{suggestedName ?? form.ticker}</p>
                        {preview.quote && (
                          <p className="text-xs text-on-surface-variant">
                            Cotação atual {money(preview.quote.price)}
                            {preview.quote.stale ? ' (última conhecida)' : ''}
                          </p>
                        )}
                      </div>
                      {preview.quote && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleChange('unitPrice', String(preview.quote?.price ?? ''))}
                        >
                          Usar preço atual
                        </Button>
                      )}
                    </div>

                    {preview.history ? (
                      <PriceHistoryChart
                        points={preview.history.points}
                        currency={preview.history.currency}
                        range={range}
                        onRangeChange={setRange}
                        onPick={(point) => setForm((prev) => ({ ...prev, purchaseDate: point.date, unitPrice: String(point.close) }))}
                      />
                    ) : (
                      <p className="text-sm text-on-surface-variant">Histórico indisponível agora; a cotação atual foi carregada.</p>
                    )}
                    {preview.history && (
                      <p className="text-xs text-on-surface-variant">Dica: toque no gráfico para usar o fechamento daquele dia como data e preço da compra.</p>
                    )}
                  </section>
                )}

                {nameField}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="investment-date">Data da compra</Label>
                    <Input
                      id="investment-date"
                      type="date"
                      className="h-12 px-4 rounded-xl"
                      value={form.purchaseDate}
                      onChange={(e) => handleChange('purchaseDate', e.target.value)}
                    />
                    {errors.purchaseDate && <p className="text-sm text-finance-expense">{errors.purchaseDate}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="investment-shares">Quantidade comprada</Label>
                    <Input
                      id="investment-shares"
                      type="number"
                      step="any"
                      min="0"
                      className="h-12 px-4 rounded-xl"
                      value={form.shares}
                      onChange={(e) => handleChange('shares', e.target.value)}
                    />
                    {errors.shares && <p className="text-sm text-finance-expense">{errors.shares}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="investment-unit-price">Preço por unidade ({currency})</Label>
                    <Input
                      id="investment-unit-price"
                      type="number"
                      step="any"
                      min="0"
                      className="h-12 px-4 rounded-xl"
                      value={form.unitPrice}
                      onChange={(e) => handleChange('unitPrice', e.target.value)}
                    />
                    {errors.unitPrice && <p className="text-sm text-finance-expense">{errors.unitPrice}</p>}
                  </div>
                </div>

                {closeOnPurchaseDate && Number(form.unitPrice) !== closeOnPurchaseDate.close && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => handleChange('unitPrice', String(closeOnPurchaseDate.close))}
                  >
                    Usar fechamento do dia ({money(closeOnPurchaseDate.close)})
                  </Button>
                )}

                {totalInvested > 0 && (
                  <p className="text-sm text-on-surface-variant" data-testid="total-invested">
                    Total investido: <span className="font-mono text-on-surface">{money(totalInvested)}</span>
                  </p>
                )}
              </>
            )}

            {!isMarketAsset && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => handleChange('type', value as string)}
              >
                <SelectTrigger id="investment-type" className="w-full h-12 px-4 rounded-xl">
                  <SelectValue>{TYPE_LABELS[form.type] ?? form.type}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface-container">
                  {InvestmentTypeEnum.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TYPE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-finance-expense">{errors.type}</p>}
            </div>
            )}

            {!isMarketAsset && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-value">Valor</Label>
              <Input
                id="investment-value"
                type="number"
                step="0.01"
                min="0"
                className="h-12 px-4 rounded-xl"
                value={form.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="0,00"
              />
              {errors.value && <p className="text-sm text-finance-expense">{errors.value}</p>}
            </div>
            )}

            {!isMarketAsset && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-quantity">Quantidade (opcional)</Label>
              <Input
                id="investment-quantity"
                className="h-12 px-4 rounded-xl"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="Ex: 10 cotas"
              />
            </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-term">Prazo (opcional)</Label>
              <Input
                id="investment-term"
                className="h-12 px-4 rounded-xl"
                value={form.term}
                onChange={(e) => handleChange('term', e.target.value)}
                placeholder="Ex: 12 meses"
              />
            </div>

            {submitError && (
              <p role="alert" className="text-sm text-finance-expense">
                {submitError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar investimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
