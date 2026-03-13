import { X } from 'lucide-react';
import type { ContractListItem } from '../contract';
import { Badge } from '@/shared/components/ui/badge';

type Props = {
  open: boolean;
  onClose: () => void;
  contract: ContractListItem | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export default function ContractDetailSidebar({ open, onClose, contract }: Props) {
  if (!contract) return null;

  const lecturer = contract.createdByUser?.member;
  const lecturerName = lecturer?.fullName ?? '—';

  const statusLabel =
    contract.isPaid === true ? 'Đã thanh toán' : contract.isPaid === false ? 'Chưa thanh toán' : 'Không rõ';
  const statusStyle =
    contract.isPaid === true
      ? 'bg-green-100 text-green-700'
      : contract.isPaid === false
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/35 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[520px] z-50
        bg-white border-l shadow-2xl
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-black truncate">
                    Hợp đồng {contract.contractCode}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate">Giảng viên: {lecturerName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 shrink-0">
                  <Badge className={statusStyle}>{statusLabel}</Badge>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            <Card title="Thông tin hợp đồng">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Mã hợp đồng" value={contract.contractCode} />
                <InfoRow label="ID hợp đồng" value={contract.contractId} />
                <InfoRow label="Số tiền" value={contract.amount != null ? `${contract.amount.toLocaleString('vi-VN')} đ` : '—'} />
                <InfoRow label="Ngày tạo" value={formatDateTime(contract.createdAt)} />
                <InfoRow label="Ngày cập nhật" value={formatDateTime(contract.updatedAt)} />
              </div>
            </Card>

            <Card title="Thông tin giảng viên">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Họ tên" value={lecturerName} />
                <InfoRow label="Email" value={contract.createdByUser?.email ?? '—'} />
                <InfoRow label="Số điện thoại" value={lecturer?.phone ?? '—'} />
                <InfoRow label="Địa chỉ" value={lecturer?.address ?? '—'} />
                <InfoRow label="CMND/CCCD" value={lecturer?.cin ?? '—'} />
                <InfoRow
                  label="Ngân hàng"
                  value={
                    lecturer?.bankName && lecturer?.bankCode
                      ? `${lecturer.bankName} - ${lecturer.bankCode}`
                      : '—'
                  }
                />
                <InfoRow label="Mã số thuế" value={lecturer?.taxNumber ?? '—'} />
              </div>
            </Card>

            <Card title="Thông tin buổi học">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Tên phiên" value={contract.session?.title ?? '—'} />
                <InfoRow label="Buổi số" value={contract.session?.sessionNo ?? '—'} />
                <InfoRow
                  label="Thời gian"
                  value={
                    contract.session?.startAt && contract.session?.endAt
                      ? `${formatDateTime(contract.session.startAt)} - ${formatDateTime(
                          contract.session.endAt,
                        )}`
                      : '—'
                  }
                />
                <InfoRow label="Địa điểm" value={contract.session?.location ?? '—'} />
                <InfoRow
                  label="Hình thức"
                  value={
                    contract.session?.isOnline == null
                      ? 'Không rõ'
                      : contract.session.isOnline
                        ? 'Online'
                        : 'Offline'
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-1 text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

