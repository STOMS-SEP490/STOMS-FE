import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock4, UserCircle2 } from 'lucide-react';
import { message, Spin } from 'antd';
import { sessionApi, type SessionDetail } from '@/modules/request/api/sessionApi';
import { attendanceApi, type Attendance } from '../api/attendanceApi';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

type Participant = {
  memberId: number;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: string;
};

export default function SessionAttendancePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [delegateTo, setDelegateTo] = useState<number | ''>('');

  const sessionIdNumber = useMemo(
    () => (sessionId && !Number.isNaN(Number(sessionId)) ? Number(sessionId) : null),
    [sessionId]
  );

  useEffect(() => {
    const load = async () => {
      if (!sessionIdNumber) return;
      setLoading(true);
      try {
        const [sess, paged] = await Promise.all([
          sessionApi.getById(sessionIdNumber),
          attendanceApi.getBySession(sessionIdNumber),
        ]);
        setSession(sess);
        setAttendances(paged.items);
      } catch {
        message.error('Không tải được thông tin phiên hoặc điểm danh');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionIdNumber]);

  const participants: Participant[] = useMemo(() => {
    if (!session || !session.assignments?.length) return [];
    return session.assignments
      .map((a) => {
        const staff = a.staffMember;
        if (!staff) return null;
        return {
          memberId: staff.memberId,
          name: staff.fullName,
          email: staff.userEmail,
          avatarUrl: staff.avatarUrl,
          role: a.staffRole,
        } as Participant;
      })
      .filter(Boolean) as Participant[];
  }, [session]);

  const attendanceByMember = useMemo(() => {
    const map = new Map<number, Attendance>();
    attendances.forEach((a) => map.set(a.memberId, a));
    return map;
  }, [attendances]);

  const handleCheckIn = async (memberIds: number[]) => {
    if (!sessionIdNumber || !memberIds.length) return;
    setSaving(true);
    try {
      const result = await attendanceApi.checkInBatch(
        sessionIdNumber,
        memberIds.map((id) => ({ memberId: id }))
      );
      if (result.skippedMemberIds.length) {
        message.info(
          `Đã bỏ qua ${result.skippedMemberIds.length} thành viên đã được check-in trước đó`
        );
      } else {
        message.success('Điểm danh (check-in) thành công');
      }
      setAttendances((prev) => {
        const map = new Map<number, Attendance>();
        prev.forEach((a) => map.set(a.memberId, a));
        result.checkedIn.forEach((a) => map.set(a.memberId, a));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error(err);
      message.error('Điểm danh (check-in) thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (memberIds: number[]) => {
    if (!sessionIdNumber || !memberIds.length) return;
    setSaving(true);
    try {
      const result = await attendanceApi.checkOutBatch(
        sessionIdNumber,
        memberIds.map((id) => ({ memberId: id }))
      );
      if (result.notCheckedInMemberIds.length) {
        message.warning(
          result.message ||
            `Một số thành viên chưa check-in nên không thể check-out: ${result.notCheckedInMemberIds.join(', ')}`
        );
      } else {
        message.success('Check-out thành công');
      }
      setAttendances((prev) => {
        const map = new Map<number, Attendance>();
        prev.forEach((a) => map.set(a.memberId, a));
        result.checkedOut.forEach((a) => map.set(a.memberId, a));
        return Array.from(map.values());
      });
    } catch (err) {
      console.error(err);
      message.error('Check-out thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelegate = async () => {
    if (!sessionIdNumber || !delegateTo || typeof delegateTo !== 'number') return;
    setDelegating(true);
    try {
      await attendanceApi.delegateAttendance(sessionIdNumber, delegateTo);
      message.success('Đã ủy quyền điểm danh cho thành viên này');
    } catch (err) {
      console.error(err);
      message.error('Ủy quyền điểm danh thất bại');
    } finally {
      setDelegating(false);
    }
  };

  const allMemberIds = useMemo(
    () => participants.map((p) => p.memberId),
    [participants]
  );

  const checkedInCount = useMemo(
    () => participants.filter((p) => attendanceByMember.get(p.memberId)?.checkinAt).length,
    [participants, attendanceByMember]
  );

  const checkedOutCount = useMemo(
    () => participants.filter((p) => attendanceByMember.get(p.memberId)?.checkoutAt).length,
    [participants, attendanceByMember]
  );

  return (
    <div className="bg-[#f3f4f6] p-6" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Điểm danh phiên học
          </h2>
          <p className="text-xs text-gray-500">
            Team leader kiểm tra, check-in / check-out và ủy quyền điểm danh cho phiên này.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spin tip="Đang tải thông tin phiên điểm danh..." />
          </div>
        ) : !session ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center text-sm text-gray-500">
            Không tìm thấy thông tin phiên.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-gray-900">
                  {session.notes || `Phiên học ${session.sessionNo}`}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Clock4 size={16} className="text-gray-400" />
                  <span>
                    {new Date(session.startAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(session.endAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Session ID #{session.sessionId} • Request #{session.requestId}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 size={14} className="mr-1" />
                    {checkedInCount}/{participants.length} đã check-in
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-50 text-sky-700 border border-sky-100">
                    <Clock4 size={14} className="mr-1" />
                    {checkedOutCount}/{participants.length} đã check-out
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserCircle2 size={20} className="text-gray-500" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Danh sách giảng viên / trợ giảng
                    </div>
                    <p className="text-xs text-gray-500">
                      Điểm danh theo từng người hoặc toàn bộ cho phiên này.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!allMemberIds.length || saving}
                    onClick={() => handleCheckIn(allMemberIds)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Check-in tất cả
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!allMemberIds.length || saving}
                    onClick={() => handleCheckOut(allMemberIds)}
                  >
                    Check-out tất cả
                  </Button>
                </div>
              </div>

              {participants.length === 0 ? (
                <div className="text-sm text-gray-500">
                  Phiên này hiện chưa có phân công giảng viên / trợ giảng.
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((p) => {
                    const att = attendanceByMember.get(p.memberId);
                    const isCheckedIn = !!att?.checkinAt;
                    const isCheckedOut = !!att?.checkoutAt;
                    return (
                      <div
                        key={p.memberId}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.avatarUrl || '/img/ava.png'}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                            }}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {p.name}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  p.role === 'TE' || p.role === 'TEACHER'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {p.role === 'TEACHER' ? 'TE' : p.role === 'TA' ? 'TA' : p.role}
                              </span>
                            </div>
                            {p.email && (
                              <div className="text-xs text-gray-500 truncate">{p.email}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={
                              isCheckedIn
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }
                          >
                            {isCheckedIn ? 'Đã check-in' : 'Chưa check-in'}
                          </Badge>
                          <Badge
                            className={
                              isCheckedOut
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }
                          >
                            {isCheckedOut ? 'Đã check-out' : 'Chưa check-out'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving}
                            onClick={() => handleCheckIn([p.memberId])}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Check-in
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => handleCheckOut([p.memberId])}
                          >
                            Check-out
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Ủy quyền điểm danh
                  </div>
                  <p className="text-xs text-gray-500">
                    Chọn một thành viên để được phép điểm danh thay cho bạn trong phiên này.
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <select
                  className="w-full md:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                  value={delegateTo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDelegateTo(v ? Number(v) : '');
                  }}
                >
                  <option value="">Chọn thành viên...</option>
                  {participants.map((p) => (
                    <option key={p.memberId} value={p.memberId}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!delegateTo || delegating}
                  onClick={handleDelegate}
                >
                  Xác nhận ủy quyền
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

