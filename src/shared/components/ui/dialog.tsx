import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Tuỳ chỉnh cỡ/style tiêu đề (vd. dialog lớn cần chữ to hơn). */
  titleClassName?: string;
  /** Tuỳ chỉnh style dòng mô tả dưới tiêu đề. */
  descriptionClassName?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-white rounded-2xl shadow-xl border border-gray-200',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'text-black [scrollbar-width:none] [-ms-overflow-style:none]',
          '[&::-webkit-scrollbar]:hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-start justify-between gap-4">
          <div>
            <h2
              id="dialog-title"
              className={cn('text-lg font-semibold text-black', titleClassName)}
            >
              {title}
            </h2>
            {description && (
              <p className={cn('mt-0.5 text-sm text-black/80', descriptionClassName)}>{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 text-black">{children}</div>
      </div>
    </div>
  );
}
