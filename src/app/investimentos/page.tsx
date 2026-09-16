'use client';

import { useState } from 'react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileDrawer } from '@/features/dashboard/components/MobileDrawer';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { InvestmentsSection } from './components/InvestmentsSection';
import { GoalsSection } from './components/GoalsSection';

const TAB_OPTIONS = [
  { value: 'investments', label: 'Investimentos' },
  { value: 'goals', label: 'Metas' },
] as const;

type Tab = (typeof TAB_OPTIONS)[number]['value'];

export default function InvestimentosPage() {
  const [tab, setTab] = useState<Tab>('investments');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout onOpenMobileDrawer={() => setDrawerOpen(true)} />

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

            <SegmentedToggle
              options={TAB_OPTIONS}
              value={tab}
              onChange={setTab}
              className="mb-4 w-fit"
            />

            {tab === 'investments' ? <InvestmentsSection /> : <GoalsSection />}
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
