import React from 'react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel 
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>⚠️ {title}</h3>
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="modal-btn-cancel" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className="modal-btn-confirm" onClick={onConfirm}>
                        Confirmar Salida
                    </button>
                </div>
            </div>
        </div>
    );
};
