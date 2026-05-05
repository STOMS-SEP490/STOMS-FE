import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const defaultClass =
  'inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 transition-colors hover:text-sky-800 hover:underline cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/60 focus-visible:ring-offset-1 rounded-sm';

type TableTextActionProps = {
  onClick: () => void;
  className?: string;
  chevronClassName?: string;
};

export function TableTextAction({ onClick, className, chevronClassName }: TableTextActionProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(defaultClass, className)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      Chi tiết
      <ChevronRight className={cn('h-4 w-4 shrink-0 opacity-80', chevronClassName)} aria-hidden />
    </span>
  );
}
