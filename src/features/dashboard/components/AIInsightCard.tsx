import { Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const INSIGHT_TEXT =
  'Seus gastos com Alimentação foram 18% maiores que no mês anterior. Considere revisar refeições fora de casa para equilibrar o orçamento.';

export function AIInsightCard() {

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-brand-secondary" />
            Insight do Mês
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs border-brand-secondary text-brand-secondary"
          >
            Beta
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        <p className="text-on-surface text-sm leading-relaxed text-center">
          {INSIGHT_TEXT}
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-on-surface-variant text-xs">
          Análises geradas com IA · Atualizado hoje
        </p>
      </CardFooter>
    </Card>
  );
}
