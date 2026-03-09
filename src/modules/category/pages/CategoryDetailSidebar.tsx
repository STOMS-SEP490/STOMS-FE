import { X } from 'lucide-react';
import type { CategoryListItem } from '../category';
import { Badge } from '@/shared/components/ui/badge';
import EquipmentInlineCard from '@/modules/equipment/components/EquipmentInlineCard';

type Props = {
  open: boolean;
  onClose: () => void;
  category: CategoryListItem | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export default function CategoryDetailSidebar({ open, onClose, category }: Props) {
  if (!category) return null;

  const equipments = category.equipment ?? [];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 bg-[#f3f4f6]">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-black truncate">
                  {category.categoryName}
                </h2>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-500">
                    Danh mục #{category.categoryId}
                  </p>
                  <Badge className="bg-[#2197C0]/10 text-[#2197C0] whitespace-nowrap">
                    {equipments.length} thiết bị
                  </Badge>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold">ID DANH MỤC</p>
                <p>{category.categoryId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">NGÀY TẠO</p>
                <p>{formatDateTime(category.createdAt)}</p>
              </div>
            </div>
          </div>

          <Section title="Mô tả">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {category.description || '—'}
            </p>
          </Section>

          <Section title="Danh sách thiết bị trong danh mục">
            {equipments.length > 0 ? (
              <ul className="space-y-2 text-sm max-h-[320px] overflow-y-auto no-scrollbar">
                {equipments.map((e) => (
                  <li
                    key={e.equipmentId}
                  >
                    <EquipmentInlineCard
                      equipmentName={e.equipmentName}
                      equipmentCode={e.equipmentCode}
                      status={e.status}
                      // Category sidebar hiện danh mục ở trên, nên không cần bottomRow
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Chưa có thiết bị nào trong danh mục này.</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm mx-6 mb-4 space-y-3">
      <h3 className="font-semibold text-black">{title}</h3>
      {children}
    </div>
  );
}

