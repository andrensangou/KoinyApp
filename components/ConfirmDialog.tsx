import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'info' | 'success' | 'warning';
    confirmLabel?: string;
    cancelLabel?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler'
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: 'fa-trash-can',
                    iconBg: 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400',
                    btnBg: 'bg-gradient-to-r from-rose-500 to-rose-600',
                    btnShadow: 'shadow-[0_10px_25px_-5px_rgba(244,63,94,0.4)]',
                    accentColor: 'rose'
                };
            case 'success':
                return {
                    icon: 'fa-check',
                    iconBg: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400',
                    btnBg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
                    btnShadow: 'shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]',
                    accentColor: 'emerald'
                };
            case 'warning':
                return {
                    icon: 'fa-triangle-exclamation',
                    iconBg: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400',
                    btnBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
                    btnShadow: 'shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)]',
                    accentColor: 'amber'
                };
            default:
                return {
                    icon: 'fa-info-circle',
                    iconBg: 'bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400',
                    btnBg: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
                    btnShadow: 'shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)]',
                    accentColor: 'indigo'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop with intense blur */}
            <div
                className="absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xl transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Card - Glassmorphism style */}
            <div className="bg-white/90 dark:bg-slate-900/80 w-full max-w-sm rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] p-8 relative z-10 animate-scale-in border border-white dark:border-white/10 overflow-hidden group">

                {/* Visual Accent Bar */}
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-${styles.accentColor}-400 to-transparent opacity-50`}></div>

                <div className="flex flex-col items-center text-center">
                    {/* Icon with float animation */}
                    <div className={`w-20 h-20 ${styles.iconBg} rounded-[2rem] flex items-center justify-center text-3xl mb-8 shadow-inner border border-white/50 dark:border-white/5 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500`}>
                        <i className={`fa-solid ${styles.icon}`}></i>
                    </div>

                    {/* Text content with premium typography */}
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight leading-tight">
                        {title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-10 leading-relaxed px-2">
                        {message}
                    </p>

                    {/* Buttons with modern rounded look and glow */}
                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-4 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px] active:scale-95 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-4 px-4 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] active:scale-95 ${styles.btnBg} ${styles.btnShadow}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
