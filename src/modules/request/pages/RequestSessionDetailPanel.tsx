import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { reservationApi, type ReservedEquipmentItem } from '../api/reservationApi';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { RequestSessionSummary } from '../request';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  requestCode: string;
  assignedTeamIds?: number[];
};

export default function RequestSessionDetailPanel({
  session,
  requestCode,
  assignedTeamIds,
}: SessionDetailProps) {
  const [reservedEquipments, setReservedEquipments] = useState<ReservedEquipmentItem[]>([]);
  const [reservedLoading, setReservedLoading] = useState(false);
  const [reservedError, setReservedError] = useState<string | null>(null);
  const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
  const [assignedTeamsLoading, setAssignedTeamsLoading] = useState(false);
  const [assignedTeamsError, setAssignedTeamsError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.reservationId) {
      setReservedEquipments([]);
      return;
    }
    const fetchReserved = async () => {
      setReservedLoading(true);
      setReservedError(null);
      try {
        const detail = await reservationApi.getById(session.reservationId!);
        setReservedEquipments(detail.equipment);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị đã đặt trước.';
        setReservedError(msg);
        setReservedEquipments([]);
      } finally {
        setReservedLoading(false);
      }
    };
    void fetchReserved();
  }, [session.reservationId]);

  useEffect(() => {
    if (!assignedTeamIds || assignedTeamIds.length === 0) {
      setAssignedTeams([]);
      setAssignedTeamsError(null);
      return;
    }
    const fetchTeams = async () => {
      setAssignedTeamsLoading(true);
      setAssignedTeamsError(null);
      try {
        const uniqueIds = Array.from(new Set(assignedTeamIds));
        const teams = await Promise.all(
          uniqueIds.map(async (id) => {
            try {
              return await teamApi.getById(id);
            } catch {
              return null;
            }
          })
        );
        setAssignedTeams(teams.filter((t): t is Team => t != null));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thông tin team phụ trách.';
        setAssignedTeamsError(msg);
        setAssignedTeams([]);
      } finally {
        setAssignedTeamsLoading(false);
      }
    };
    void fetchTeams();
  }, [assignedTeamIds, session.sessionId]);

  return (
    <div className="space-y-4 text-sm">
      {/* Thông tin phiên — đồng bộ style Card với BorrowingDetailSidebar */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div>
              <p className="text-[11px] text-gray-400">Mã yêu cầu</p>
              <p className="font-medium text-black">{requestCode}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Trạng thái phiên</p>
              <p className="font-medium text-black capitalize">{session.status?.toLowerCase()}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Ngày</p>
              <p className="font-medium text-black">
                {dayjs(session.startAt).format('DD/MM/YYYY')}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Thời gian</p>
              <p className="font-medium text-black">
                {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Số lượng giảng viên/trợ giảng yêu cầu</p>
              <p className="font-medium text-black">
                Giảng viên: {session.teachersRequired ?? 1}, Trợ giảng: {session.tasRequired ?? 1}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Team phụ trách</p>
              {assignedTeamsLoading ? (
                <p className="font-medium text-black">Đang tải thông tin team...</p>
              ) : assignedTeamsError ? (
                <p className="font-medium text-red-600">{assignedTeamsError}</p>
              ) : !assignedTeamIds || assignedTeamIds.length === 0 ? (
                <p className="font-medium text-black">
                  {session.teamAssigned ? 'Đã có đội phụ trách (chưa chọn trên UI)' : 'Chưa gán đội'}
                </p>
              ) : assignedTeams.length === 0 ? (
                <p className="font-medium text-black">Đã chọn team (ID) nhưng không tìm thấy trong gợi ý.</p>
              ) : (
                <ul className="font-medium text-black space-y-0.5">
                  {assignedTeams.map((t) => (
                    <li key={t.teamId}>
                      {t.teamName} <span className="text-[11px] text-gray-500">#{t.teamId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Thiết bị đã đặt trước</h3>
        </div>
        <div className="px-4 py-3 space-y-2">
        {session.reservationId == null ? (
          <p className="text-[11px] text-gray-500">Chưa có đặt trước thiết bị cho phiên này.</p>
        ) : reservedLoading ? (
          <p className="text-[11px] text-gray-500">Đang tải danh sách thiết bị...</p>
        ) : reservedError ? (
          <p className="text-[11px] text-red-600">{reservedError}</p>
        ) : reservedEquipments.length === 0 ? (
          <p className="text-[11px] text-gray-500">Không có thiết bị nào trong đặt trước.</p>
        ) : (
          <ul className="space-y-2">
            {reservedEquipments.map((eq) => (
              <li
                key={eq.equipmentId}
                className="rounded-xl bg-white px-3 py-2 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                  {eq.imgLink ? (
                    <img
                      src={eq.imgLink}
                      alt={eq.equipmentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageOff className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {eq.equipmentName || `Thiết bị #${eq.equipmentId}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Mã: {eq.equipmentCode || eq.equipmentId}
                      </div>
                    </div>
                    {eq.status && (
                      <Badge className="bg-gray-100 text-gray-700 text-[11px] flex-shrink-0">
                        {eq.status}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span className="truncate">
                      Danh mục: {eq.categoryName || '—'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  );
}

