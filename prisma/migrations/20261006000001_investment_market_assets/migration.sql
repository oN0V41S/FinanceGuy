-- AlterTable
ALTER TABLE "investments"
  ADD COLUMN "ticker" VARCHAR(20),
  ADD COLUMN "market" VARCHAR(10),
  ADD COLUMN "currency" VARCHAR(5),
  ADD COLUMN "purchaseDate" TIMESTAMP(3),
  ADD COLUMN "unitPrice" DECIMAL(18,6),
  ADD COLUMN "shares" DECIMAL(18,6),
  ADD COLUMN "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "investment_transactions" (
    "id" TEXT NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unitPrice" DECIMAL(18,6) NOT NULL,
    "grossValue" DECIMAL(14,2) NOT NULL,
    "costBasis" DECIMAL(14,2),
    "profit" DECIMAL(14,2),
    "taxRate" DECIMAL(5,2),
    "taxValue" DECIMAL(14,2),
    "netValue" DECIMAL(14,2),
    "note" VARCHAR(255),
    "assetName" VARCHAR(100) NOT NULL,
    "assetTicker" VARCHAR(20),
    "assetMarket" VARCHAR(10),
    "currency" VARCHAR(5),
    "userId" TEXT NOT NULL,
    "investmentId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_transactions_userId_date_idx" ON "investment_transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "investment_transactions_investmentId_idx" ON "investment_transactions"("investmentId");

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
