'use client';

import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvestmentsSection } from './components/InvestmentsSection';
import { GoalsSection } from './components/GoalsSection';

export default function InvestimentosPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-on-surface font-display">
                Investimentos e Metas
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Acompanhe sua carteira de investimentos e o progresso das suas metas financeiras.
              </p>
            </div>

            <Tabs defaultValue="investments">
              <TabsList>
                <TabsTrigger value="investments">Investimentos</TabsTrigger>
                <TabsTrigger value="goals">Metas</TabsTrigger>
              </TabsList>

              <TabsContent value="investments">
                <InvestmentsSection />
              </TabsContent>

              <TabsContent value="goals">
                <GoalsSection />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
