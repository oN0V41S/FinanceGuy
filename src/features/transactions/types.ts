import type { Transaction } from './validations';
export type { Transaction };

// O valor é string no formulário para facilitar a manipulação de input
// e é convertido para number no handler de submissão.
export type TransactionFormData = Omit<Transaction, 'id' | 'value' | 'created_at' | 'updated_at' | 'installment_number' | 'total_installments' | 'parent_transaction_id'> & {
    value: string;
    date: string;
    title?: string;
    description?: string;
    responsible: string;
    category: string;
    type: 'income' | 'expense';
    is_recurring: boolean;
    total_installments?: number;
    paid?: boolean;
};

export const initialFormData: TransactionFormData = {
    date: '', 
    value: '', 
    title: '',
    description: '', 
    responsible: '', 
    category: 'Outros', 
    type: 'expense',
    is_recurring: false,
    paid: false
};
