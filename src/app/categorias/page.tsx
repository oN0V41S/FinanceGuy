'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { CategoriesList } from '@/features/categories/components/CategoriesList';
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog';
import { DeleteCategoryDialog } from '@/features/categories/components/DeleteCategoryDialog';
import type { Category } from '@/features/categories/validations';

export default function CategoriasPage() {
  const { categories, isLoading, isFallback, error, refresh, create, update, remove } = useCategories();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormOpen(true);
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col pb-24 md:pb-0">
        <HeaderLayout />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-display">Categorias</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Organize suas transações com categorias padrão ou criadas por você.
                </p>
              </div>
              <Button type="button" onClick={openCreate} disabled={isFallback}>
                <Plus className="h-4 w-4" />
                Nova categoria
              </Button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-sm text-on-surface"
              >
                <span>
                  {isFallback
                    ? 'Não conseguimos carregar suas categorias agora. Mostrando as padrão por enquanto.'
                    : error}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={refresh}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {isLoading && isFallback ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <CategoriesList categories={categories} onEdit={openEdit} onDelete={setDeleting} />
            )}
          </div>
        </main>
      </div>

      <MobileNavBar />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSubmit={async (input) => {
          if (editing) await update(editing.id, input);
          else await create(input);
        }}
      />

      <DeleteCategoryDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        category={deleting}
        otherCategories={categories}
        onConfirm={async (reassignTo) => {
          if (deleting) await remove(deleting.id, reassignTo);
        }}
      />
    </div>
  );
}
