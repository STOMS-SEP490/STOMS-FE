import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Hash, Layers, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Image } from 'antd';
import { Badge } from '@/shared/components/ui/badge';
import { getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/equipment';
import type { CategoryListItem } from '../category';

type Props = {
  open: boolean;
  onClose: () => void;
  category: CategoryListItem | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

export default function CategoryDetailSidebar({ open, onClose, category }: Props) {
  if (!open) return null;

  const equipments = category?.equipment ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-40 h-full" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed top-0 right-0 h-full w-[580px] max-w-[96vw] z-50',
        'bg-white border-l border-slate-200 shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex flex-col h-full overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {!category ? (
              <div className="px-5 py-5">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
              </div>
            ) : (
              <>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT DANH MỤC</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#1a7a99] truncate">{category.categoryName}</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Danh mục #{category.categoryId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">ID</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">#{category.categoryId}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số thiết bị</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{category.totalEquipment ?? equipments.length}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(category.createdAt)}</p>
                  </div>
                </div>
              </>
            )}
          </header>

          {/* BODY */}
          {category && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">

              {/* Thông tin chung */}
              <Section icon={Hash} title="Thông tin chung">
                <div className="pl-4 grid grid-cols-2 gap-x-6">
                  <MetaRow label="Tên danh mục" value={category.categoryName} />
                  <MetaRow label="Ngày tạo" value={formatDateTime(category.createdAt)} />
                  <MetaRow label="Mô tả" value={category.description || '—'} />
                </div>
              </Section>

              {/* Mô tả */}
              <Section icon={FileText} title="Mô tả">
                <div className="pl-4">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {category.description?.trim() || 'Chưa có mô tả'}
                  </p>
                </div>
              </Section>

              {/* Danh sách thiết bị */}
              <Section icon={Layers} title={`Thiết bị trong danh mục (${equipments.length})`}>
                {equipments.length === 0 ? (
                  <p className="pl-4 py-2 text-sm text-slate-500">Chưa có thiết bị nào.</p>
                ) : (
                  <div className="pl-4 divide-y divide-slate-200">
                    {equipments.map((e) => (
                      <div key={e.equipmentId} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {e.imgLink ? (
                            <Image
                              src={e.imgLink}
                              alt={e.equipmentName}
                              width={32}
                              height={32}
                              className="rounded object-cover shrink-0 border border-slate-200"
                              preview={{ mask: false }}
                              style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-slate-100 shrink-0 border border-slate-200" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black truncate">{e.equipmentName}</p>
                            <p className="text-xs text-slate-500">{e.equipmentCode}</p>
                          </div>
                        </div>
                        <Badge className={cn('shrink-0 text-xs border-0', getEquipmentStatusColor(e.status))}>
                          {getEquipmentStatusDisplay(e.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
