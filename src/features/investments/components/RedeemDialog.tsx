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
import { RedeemSchema, type Investment } from '@/features/investments/validations';
import type { RedeemPreview } from '@/features/investments/marketInvestment.service';
import { useRedeem } from '@/features/investments/hooks/useRedeem';

interface RedeemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  /** Chamado após resgate confirmado, para recarregar carteira e histórico. */
  onRedeemed: () => void;
}

const money = (value: number, currency = 'BRL') =>
  value.toLocaleString('pt-BR', { style: 'currency', currency });

export function RedeemDialog({ open, onOpenChange, investment, onRedeemed }: RedeemDialogProps) {
  const { preview, confirm } = useRedeem(investment?.id);
  const [quantity, setQuantity] = useState('');
  const [taxRate, setTaxRate] = useState('15');
  const [unitPrice, setUnitPrice] = useState('');
  const [result, setResult] = useState<RedeemPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (open && investment) {
      setQuantity(String(investment.shares ?? ''));
      setTaxRate('15');
      setUnitPrice('');
      setResult(null);
      setError(null);
    }
  }, [open, investment]);

  function parseInput() {
    const parsed = RedeemSchema.safeParse({
      quantity: Number(quantity),
      taxRate: Number(taxRate),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return null;
    }
    setError(null);
    return { quantity: parsed.data.quantity, taxRate: parsed.data.taxRate, unitPrice: parsed.data.unitPrice };
  }

  async function handleSimulate() {
    const input = parseInput();
    if (!input) return;
    setIsBusy(true);
    try {
      setResult(await preview(input));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Não foi possível simular o resgate.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirm() {
    const input = parseInput();
    if (!input) return;
    setIsBusy(true);
    try {
      await confirm({ ...input, unitPrice: result?.unitPrice ?? input.unitPrice });
      onRedeemed();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o resgate.');
    } finally {
      setIsBusy(false);
    }
  }

  const currency = investment?.currency ?? 'BRL';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resgatar {investment?.ticker ?? investment?.name}</DialogTitle>
          <DialogDescription>
            Simule o resgate com a alíquota que você informar. O imposto exibido é apenas uma estimativa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="redeem-quantity">Quantidade (posição: {investment?.shares})</Label>
            <Input
              id="redeem-quantity"
              type="number"
              step="any"
              min="0"
              className="h-12 px-4 rounded-xl"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setResult(null);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="redeem-tax">Alíquota de imposto (%)</Label>
            <Input
              id="redeem-tax"
              type="number"
              step="0.01"
              min="0"
              max="100"
              className="h-12 px-4 rounded-xl"
              value={taxRate}
              onChange={(e) => {
                setTaxRate(e.target.value);
                setResult(null);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="redeem-price">Preço de venda (opcional — padrão: cotação atual)</Label>
            <Input
              id="redeem-price"
              type="number"
              step="any"
              min="0"
              className="h-12 px-4 rounded-xl"
              value={unitPrice}
              onChange={(e) => {
                setUnitPrice(e.target.value);
                setResult(null);
              }}
            />
          </div>

          {result && (
            <dl
              data-testid="redeem-preview"
              className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-surface-container-low p-4 text-sm"
            >
              <dt className="text-on-surface-variant">Valor bruto</dt>
              <dd className="text-right font-mono">{money(result.grossValue, currency)}</dd>
              <dt className="text-on-surface-variant">Custo</dt>
              <dd className="text-right font-mono">{money(result.cost, currency)}</dd>
              <dt className="text-on-surface-variant">Lucro</dt>
              <dd className="text-right font-mono">{money(result.profit, currency)}</dd>
              <dt className="text-on-surface-variant">Imposto estimado ({result.taxRate}%)</dt>
              <dd className="text-right font-mono">{money(result.taxValue, currency)}</dd>
              <dt className="font-semibold">Líquido</dt>
              <dd className="text-right font-mono font-semibold">{money(result.netValue, currency)}</dd>
            </dl>
          )}

          {error && (
            <p role="alert" className="text-sm text-finance-expense">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={handleSimulate} disabled={isBusy}>
            {isBusy && !result ? 'Simulando...' : 'Simular'}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isBusy || !result}>
            Confirmar resgate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
