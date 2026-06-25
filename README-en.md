# Project: Financial Control (PI - Logic and Management)

**English** | **[Leia em Português](README.md)**

This project is a financial control WEB Application developed as an Integrated Project (PI). The focus is to apply Programming Logic and Project Management concepts in a practical scenario.

The application is a SPA (Single Page Application) that allows users to manage personal financial transactions, with a special focus on biweekly closings.

## 💻 Technologies Used

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.9
- **Back-end:** Next.js API Routes (Proxy + Features)
- **Database:** PostgreSQL (Neon) with Prisma 5.22 ORM
- **Validation:** Zod
- **UI:** React 19, Tailwind CSS, shadcn-ui
- **Tests:** Jest 30 + React Testing Library

---

## 🎯 Current Scope (Backend + Auth)

The application provides a full-stack financial management system:

- **Auth**: Registration, login/logout with JWT tokens (cookies)
- **CRUD Transactions**: Create, read, update, and delete financial transactions
- **Reports**: Financial summary (income, expense, balance)
- **Installments**: Support for recurring and installment payments

### Data Model (`Transaction`)

Based on Prisma schema:

```typescript
interface Transaction {
  id: string;                          // UUID (CUID)
  type: 'income' | 'expense';          // Transaction type
  description: string;                 // Description (1-255 chars)
  value: number;                       // Decimal value (positive)
  date: string;                        // ISO 8601 (YYYY-MM-DD)
  category: TransactionCategory;       // Fixed category
  responsible: string;                 // Person responsible
  userId: string;                      // Foreign key to user
  installment_number?: number;         // Installment number (1-based)
  total_installments?: number;         // Total installments
  is_recurring?: boolean;              // Recurring flag
  parent_transaction_id?: string;      // Parent transaction UUID (for installments)
  paid?: boolean;                      // Payment flag
}
```

### API Endpoints

All endpoints are located at `/api/transactions`:

| Method   | Endpoint                  | Action                                                                                                         |
| -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/transactions`       | (Read) Returns a list of all transactions.                                                                     |
| `POST`   | `/api/transactions`       | (Create) Creates a new transaction. Expects a `Transaction` object (without `id`) in the request body.         |
| `PUT`    | `/api/transactions/[id]`  | (Update) Updates an existing transaction based on `id`. Expects the complete `Transaction` object in the body. |
| `DELETE` | `/api/transactions/[id]`  | (Delete) Removes a transaction based on `id`.                                                                  |

## 🚀 How to Run the Project

1. Clone the repository:

```bash
git clone https://github.com/oN0V41S/FinanceGuy.git
```

2. Navigate to the folder:

```bash
cd FinanceGuy
```

3. Install dependencies:

```bash
# If you're using pnpm (based on pnpm-lock.yaml)
pnpm install

# Or if you're using npm/yarn
# npm install
# yarn install
```

4. Run the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`.
