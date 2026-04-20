import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  variant?: 'green' | 'blue' | 'amber' | 'rose' | 'white' | 'violet' | 'orange';
  className?: string;
}

export function StatCard({ icon, label, value, sub, variant = 'blue', className }: StatCardProps) {
  const colorStyle =
    variant === 'green'
      ? 'bg-green-100 text-green-600'
      : variant === 'amber'
        ? 'bg-amber-100 text-amber-600'
        : variant === 'rose'
          ? 'bg-rose-100 text-rose-600'
          : variant === 'white'
            ? 'bg-white text-gray-700'
            : variant === 'violet'
              ? 'bg-violet-100 text-violet-600'
              : variant === 'orange'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-blue-100 text-blue-600';

  return (
    <div
      className={cn('bg-white rounded-xl border border-border p-4 flex gap-4 items-center shadow-sm', className)}
    >
      <div className={cn('p-3 rounded-lg', colorStyle)}>{icon}</div>

      <div>
        <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
        <h2 className="text-xl font-semibold text-[#1a7a99]">{value}</h2>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}
