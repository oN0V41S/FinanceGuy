import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-container flex flex-col">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface-container sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-on-surface">FinanceGuy</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl bg-surface-container">
          <CardContent className="pt-6">
            {children}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant py-6 px-4 bg-surface-container">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-on-surface text-sm">FinanceGuy</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              © 2026 FinanceGuy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
