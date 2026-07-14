import { Wallet } from 'lucide-react';

export function HeaderBrand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
        <Wallet className="w-5 h-5 text-primary" />
      </div>
      <span className="font-sans font-semibold text-primary">FinanceGuy</span>
    </div>
  );
}
