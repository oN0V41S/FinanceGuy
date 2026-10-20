-- Categorias de investimento (FING-27). Aditiva e idempotente.

-- AlterTable: escopo da categoria (linhas existentes = 'transaction')
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "scope" VARCHAR(12) NOT NULL DEFAULT 'transaction';

-- Unicidade passa a considerar o escopo
DROP INDEX IF EXISTS "categories_userId_nameKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "categories_userId_scope_nameKey_key" ON "categories"("userId", "scope", "nameKey");

-- AlterTable: categoria opcional no investimento
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE INDEX IF NOT EXISTS "investments_categoryId_idx" ON "investments"("categoryId");

-- AddForeignKey (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'investments_categoryId_fkey'
  ) THEN
    ALTER TABLE "investments"
      ADD CONSTRAINT "investments_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
