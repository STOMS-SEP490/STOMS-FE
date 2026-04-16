import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { message } from 'antd';
import { CalendarClock, MapPin } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import sessionApi from '@/modules/request/api/sessionApi';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import type { TeacherUpcomingScheduleCard } from '@/modules/event/hooks/useTeacherUpcomingAssignedSessions';
import {
  canReportBusyForSessionStart,
  REPORT_BUSY_TOO_SOON_VI,
} from '@/modules/event/utils/reportBusyEligibility';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: number;
  sessionPreview: TeacherUpcomingScheduleCard | null;
  onSuccess?: () => void;
};

function readLoggedInMemberId(): number {
  try {
    const n = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
}

export default function ReportBusyModal({
  open,
  onClose,
  sessionId,
  sessionPreview,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setReason('');
  }, [open, sessionId]);

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (sessionPreview && !canReportBusyForSessionStart(sessionPreview.start)) {
      message.warning(REPORT_BUSY_TOO_SOON_VI);
      return;
    }
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do báo bận.');
      return;
    }
    const memberId = readLoggedInMemberId();
    if (!memberId) {
      message.error('Không xác định được tài khoản. Vui lòng đăng nhập lại.');
      return;
    }
    try {
      setLoading(true);
      const detail = await sessionApi.getById(sessionId);
      const assignments = detail.Assignments ?? [];
      const mine = assignments.find((a) => a.StaffMemberId === memberId);
      const assignmentId = mine?.AssignmentId ?? 0;
      if (!assignmentId) {
        message.error('Không tìm thấy phân công của bạn cho buổi này.');
        return;
      }
      await assignmentApi.reportBusy(assignmentId, trimmed);
      message.success('Đã gửi báo bận.');
      onClose();
      onSuccess?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const s = sessionPreview;
  const eligible = s ? canReportBusyForSessionStart(s.start) : false;
  const timeRange = s
    ? `${dayjs(s.start).format('DD/MM/YYYY')} · ${dayjs(s.start).format('HH:mm')} — ${dayjs(s.end).format('HH:mm')}`
    : '';

  return (
    <Dialog open={open} onClose={handleClose} title="Báo bận" className="max-w-md">
      <div className="space-y-3">
        {s && !eligible ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200/80">
            {REPORT_BUSY_TOO_SOON_VI}
          </p>
        ) : null}
        {s ? (
          <div className="space-y-2.5" role="group" aria-label="Thông tin buổi">
            <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-950">
              {s.requestLine}
              {s.isOngoing ? (
                <span className="ml-1.5 font-medium text-emerald-600">· Đang diễn ra</span>
              ) : null}
            </p>
            <p className="text-[13px] leading-snug text-slate-500">{s.sessionLine}</p>
            <div className="flex items-start gap-2 pt-0.5 text-[13px] text-slate-600">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
              <span className="min-w-0 tabular-nums leading-snug">{timeRange}</span>
            </div>
            <div className="flex items-start gap-2 text-[13px] text-slate-600">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>
              <span className="min-w-0 leading-snug">{s.resource}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="report-busy-reason">
            Lý do báo bận
          </label>
          <textarea
            id="report-busy-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading || !eligible}
            placeholder="Nhập lý do bạn không thể tham gia buổi này…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          />
        </div>

        <div className="flex gap-3 pt-0.5">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-900 text-white hover:bg-red-950"
            onClick={() => void handleSubmit()}
            disabled={loading || !eligible}
          >
            {loading ? 'Đang gửi…' : 'Gửi báo bận'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
