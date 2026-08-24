import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-pop animate-slide-up sm:animate-scale-in max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors ml-auto"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
