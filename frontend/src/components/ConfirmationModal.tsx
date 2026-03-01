import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle className="text-red-500" size={48} />;
            case 'warning': return <AlertTriangle className="text-yellow-500" size={48} />;
            default: return null;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content confirmation-modal">
                <div className="modal-header">
                    <button className="close-btn" onClick={onCancel}><X size={20} /></button>
                </div>
                <div className="modal-body text-center">
                    <div className="confirmation-icon">
                        {getIcon()}
                    </div>
                    <h3>{title}</h3>
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
                    <button className={`btn btn-${type}`} onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}
