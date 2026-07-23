import React from 'react';
import { Transaction } from '@/types/finance'; // Importa de types
import { formatCurrency, formatDate } from '@/shared/utils'; // Importa de utils
import { Edit2, Trash2 } from 'lucide-react';

interface Props {
    sortedTransactions: Transaction[];
    openModal: (transaction: Transaction) => void;
    handleDeleteRequest: (id: string) => void;
}

const TransactionsTable: React.FC<Props> = ({ sortedTransactions, openModal, handleDeleteRequest }) => {
    return (
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left py-4 px-6 font-semibold text-gray-600">Descrição</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-600">Data</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-600">Categoria</th>
                            <th className="text-right py-4 px-6 font-semibold text-gray-600">Valor</th>
                            <th className="text-center py-4 px-6 font-semibold text-gray-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTransactions.length === 0 ? (
                            <tr><td colSpan={5} className="py-16 text-center text-gray-500">Nenhuma transação encontrada para o período selecionado.</td></tr>
                        ) : (
                            sortedTransactions.map(t => (
                                <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                                    <td className="py-4 px-6"><p className="font-medium text-gray-800">{t.description}</p><p className="text-xs text-gray-500">{t.responsible}</p></td>
                                    <td className="py-4 px-6 text-gray-600">{formatDate(t.date)}</td>
                                    <td className="py-4 px-6"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">{t.category}</span></td>
                                    <td className={`py-4 px-6 text-right font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.value)}</td>
                                    <td className="py-4 px-6"><div className="flex items-center justify-center gap-3">
                                        <button onClick={() => openModal(t)} className="text-gray-400 hover:text-indigo-600" title="Editar"><Edit2 className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteRequest(t.id)} className="text-gray-400 hover:text-red-600" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                                    </div></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionsTable;