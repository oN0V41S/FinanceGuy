import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    // Se não estiver aberto, retorna null
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-container rounded-xl shadow-2xl w-full max-w-lg mx-auto transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                        <h3 className="text-xl font-display font-semibold text-on-surface">{title}</h3>
                        <button
                            onClick={onClose}
                            aria-label="Fechar"
                            className="text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="mt-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;