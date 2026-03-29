import { X } from 'lucide-react';
import type { SessionDetail } from '@/modules/request/type';

type Props = {
  open: boolean;
  onClose: () => void;
  session: SessionDetail | null;
};

function formatDateTime(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export default function SessionDetailSidebar({ open, onClose, session }: Props) {
  if (!session) return null;

  const modeLabel =
    session.IsOnline == null ? 'Không rõ' : session.IsOnline ? 'Online' : 'Offline';

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
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-black truncate">
                  Phiên #{session.SessionNo} · ID {session.SessionId}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Request ID: <span className="font-medium">{session.RequestId}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            <Card title="Thông tin chung">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Thời gian bắt đầu" value={formatDateTime(session.StartAt)} />
                <InfoRow label="Thời gian kết thúc" value={formatDateTime(session.EndAt)} />
                <InfoRow label="Địa điểm" value={session.Location || '—'} />
                <InfoRow label="Hình thức" value={modeLabel} />
                <InfoRow label="Trạng thái" value={session.Status || '—'} />
                <InfoRow label="Ghi chú" value={session.Notes || '—'} />
              </div>
            </Card>

            <Card title="Nhân sự yêu cầu">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Số giáo viên"
                  value={
                    session.TeachersRequired != null ? session.TeachersRequired : 'Không rõ'
                  }
                />
                <InfoRow
                  label="Số trợ giảng"
                  value={session.TasRequired != null ? session.TasRequired : 'Không rõ'}
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
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

