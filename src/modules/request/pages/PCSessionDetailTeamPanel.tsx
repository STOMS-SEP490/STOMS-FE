import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Badge } from '@/shared/components/ui/badge';
import sessionService from '../api/sessionApi';
import { getAssignmentStatusInfo, ASSIGNMENT_STATUS, REQUEST_STATUS, getRequestStatusCode } from '@/constants/status';

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

type Props = {
  sessionId: number;
  requestStatus?: string | number | null;
  assignedTeamIds?: number[];
  requestCode?: string;
};

export default function PCSessionDetailTeamPanel({
  sessionId,
  requestStatus,
  assignedTeamIds = [],
  requestCode = '',
}: Props) {
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [expandedTeamIds, setExpandedTeamIds] = useState<number[]>([]);

  // Load session detail
  useEffect(() => {
    let cancelled = false;
    const fetchSessionDetail = async () => {
      setSessionDetailLoading(true);
      try {
        const detail = await sessionService.getById(sessionId);
        if (cancelled) return;
        setSessionDetail(detail);
      } catch (err) {
        if (!cancelled) {
          setSessionDetail(null);
        }
      } finally {
        if (!cancelled) setSessionDetailLoading(false);
      }
    };
    void fetchSessionDetail();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Extract skills - MUST be before any conditional returns
  const skills = useMemo(() => {
    if (!sessionDetail) return [];
    const list = [
      ...(Array.isArray(sessionDetail?.EventSessionSkill) ? sessionDetail.EventSessionSkill : []),
      ...(Array.isArray(sessionDetail?.SubjectSkill) ? sessionDetail.SubjectSkill : []),
      ...(Array.isArray(sessionDetail?.eventSessionSkill) ? sessionDetail.eventSessionSkill : []),
      ...(Array.isArray(sessionDetail?.subjectSkill) ? sessionDetail.subjectSkill : []),
    ];
    const names = list
      .filter((s: any) => (s?.IsActive ?? s?.isActive ?? true) !== false)
      .map((s: any) => String(s?.SkillName ?? s?.skillName ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [sessionDetail]);

  // Extract topics - MUST be before any conditional returns
  const topics = useMemo(() => {
    if (!sessionDetail) return [];
    const fromEvent = [
      ...((Array.isArray(sessionDetail?.EventSession?.Topics) ? sessionDetail.EventSession.Topics : []) as any[]),
      ...((Array.isArray(sessionDetail?.eventSession?.topics) ? sessionDetail.eventSession.topics : []) as any[]),
    ];
    const fromSubject = [
      ...((Array.isArray(sessionDetail?.SubjectSession?.Topics) ? sessionDetail.SubjectSession.Topics : []) as any[]),
      ...((Array.isArray(sessionDetail?.subjectSession?.topics) ? sessionDetail.subjectSession.topics : []) as any[]),
    ];
    const names = [...fromEvent, ...fromSubject]
      .filter((t: any) => (t?.IsActive ?? t?.isActive ?? true) !== false)
      .map((t: any) => String(t?.TopicName ?? t?.topicName ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [sessionDetail]);

  const toggleTeamExpanded = (teamId: number) => {
    setExpandedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  if (sessionDetailLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-[#2197C0] rounded-full animate-spin" />
          <p className="text-xs">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!sessionDetail) {
    return null;
  }

  // Extract session info
  const startAt = sessionDetail.StartAt ?? sessionDetail.startAt ?? null;
  const endAt = sessionDetail.EndAt ?? sessionDetail.endAt ?? null;
  const location = sessionDetail.Location ?? sessionDetail.location ?? null;
  const teachersRequired = sessionDetail.TeachersRequired ?? sessionDetail.teachersRequired ?? null;
  const tasRequired = sessionDetail.TasRequired ?? sessionDetail.tasRequired ?? null;
  const notes = String(sessionDetail.Notes ?? sessionDetail.notes ?? '').trim();
  const isOnlineRaw = sessionDetail.IsOnline ?? sessionDetail.isOnline ?? null;
  const createdAt = sessionDetail.CreatedAt ?? sessionDetail.createdAt ?? null;
  const updatedAt = sessionDetail.UpdatedAt ?? sessionDetail.updatedAt ?? null;
  const eventSession = sessionDetail.EventSession ?? sessionDetail.eventSession ?? null;
  const subjectSession = sessionDetail.SubjectSession ?? sessionDetail.subjectSession ?? null;
  const sessionDescription = String(
    eventSession?.Description ??
      eventSession?.description ??
      subjectSession?.Description ??
      subjectSession?.description ??
      '',
  ).trim();
  const sessionDuration = String(
    eventSession?.Duration ??
      eventSession?.duration ??
      subjectSession?.Duration ??
      subjectSession?.duration ??
      '',
  ).trim();

  // Get teacher assignments
  const teacherAssignments = (sessionDetail.Assignments ?? []).filter((a: any) => {
    const role = String(a.StaffRole ?? '').toUpperCase();
    return role.includes('TEACH') || role === 'TE' || role.includes('GV');
  });

  // Get student assignments
  const studentAssignments = (sessionDetail.Assignments ?? []).filter((a: any) => {
    const role = String(a.StaffRole ?? '').toUpperCase();
    return role === 'TA' || role.includes('STUDENT') || role.includes('SV') || role.includes('SINH');
  });

  // Group students by team
  const studentsByTeam: Record<number, any[]> = {};
  const studentsWithoutTeam: any[] = [];
  
  studentAssignments.forEach((a: any) => {
    const teamId = Number(a.TeamId ?? a.StaffMember?.TeamId ?? 0);
    if (teamId > 0) {
      if (!studentsByTeam[teamId]) studentsByTeam[teamId] = [];
      studentsByTeam[teamId].push(a);
    } else {
      studentsWithoutTeam.push(a);
    }
  });

  // Get team info from TeamSessions
  const teamSessions = sessionDetail.TeamSessions ?? [];
  const teamsMap = teamSessions.reduce((acc: any, ts: any) => {
    const teamId = Number(ts.TeamId ?? 0);
    if (teamId > 0) {
      acc[teamId] = {
        teamId,
        teamName: ts.Team?.TeamName ?? `Nhóm #${teamId}`,
        memberCount: ts.Team?.Members?.length ?? 0,
      };
    }
    return acc;
  }, {});

  const statusCode = getRequestStatusCode(requestStatus);
  const showStudents =
    statusCode === REQUEST_STATUS.ASSIGNING ||
    statusCode === REQUEST_STATUS.PUBLISHED ||
    statusCode === REQUEST_STATUS.COMPLETED ||
    statusCode === REQUEST_STATUS.CANCELLED;

  return (
    <div className="space-y-4 text-sm">
      {/* Session Info Card */}
      <div className="bg-white">
        <div className="pt-3 space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-1">
            <p className="text-xs text-slate-500">
              {startAt && endAt
                ? `${dayjs(startAt).format('DD/MM/YYYY HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
                : '—'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã buổi</p>
              <p className="mt-1 font-medium text-slate-900">{sessionId ?? '—'}</p>
            </div>
            {requestCode && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã yêu cầu</p>
                <p className="mt-1 font-semibold">{requestCode}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Buổi số</p>
              <p className="mt-1 font-medium text-slate-900">{sessionDetail.SessionNo ?? sessionDetail.sessionNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Thời lượng</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{sessionDuration || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Địa điểm</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{location || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Hình thức</p>
              <p className="mt-1 font-medium text-slate-900">
                {isOnlineRaw == null ? '—' : isOnlineRaw ? 'Trực tuyến' : 'Trực tiếp'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Giảng viên yêu cầu</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{teachersRequired ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Sinh viên yêu cầu</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{tasRequired ?? '—'}</p>
            </div>
          </div>

          {(sessionDescription || notes) && <div className="border-t border-slate-100" />}

          {sessionDescription ? (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mô tả nội dung</p>
              <p className="mt-1 text-slate-700 leading-6">{sessionDescription}</p>
            </div>
          ) : null}

          {notes ? (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Ghi chú</p>
              <p className="mt-1 text-slate-700 leading-6">{notes}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Chủ đề</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {topics.length === 0 ? (
                  <span className="text-slate-700">—</span>
                ) : (
                  topics.map((name) => (
                    <Badge key={name} className="bg-slate-100 text-slate-700 border-0 text-[11px] font-medium">
                      {name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Kỹ năng</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {skills.length === 0 ? (
                <span className="text-slate-700">—</span>
              ) : (
                skills.map((name) => (
                  <Badge key={name} className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px] font-medium">
                    {name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-500 md:grid-cols-2">
            <div>
              <span className="uppercase tracking-wide">Tạo lúc: </span>
              <span className="text-slate-600">
                {createdAt ? dayjs(createdAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
              </span>
            </div>
            <div>
              <span className="uppercase tracking-wide">Cập nhật: </span>
              <span className="text-slate-600">
                {updatedAt ? dayjs(updatedAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team and Assignment sections */}
      <div className="space-y-5">{/* Giảng viên tham dự */}
      {teacherAssignments.length > 0 && (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <p className="text-base font-semibold text-slate-900">Giảng viên tham dự</p>
          <div className="space-y-2">
            {teacherAssignments.map((slot: any, index: number) => (
              <div
                key={Number(slot.AssignmentId ?? 0) || index}
                className="border-b border-slate-200 bg-white py-2.5 last:border-b-0"
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Giảng viên {index + 1}
                </p>
                <div className="w-full flex items-center gap-3 bg-white px-3 py-2">
                  {Number(slot.StaffMemberId ?? 0) > 0 ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                          alt={slot.StaffMember?.FullName || 'Giảng viên'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {slot.StaffMember?.FullName || 'Giảng viên'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || '—'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Chưa có giảng viên</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nhóm phụ trách */}
      {!showStudents && assignedTeamIds.length > 0 && (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="text-base font-semibold text-slate-900">Nhóm phụ trách</h3>
          <div className="space-y-3">
            {assignedTeamIds.map((tid) => {
              const team = teamsMap[tid];
              const isExpanded = expandedTeamIds.includes(tid);
              const students = studentsByTeam[tid] ?? [];

              return (
                <div key={tid} className="space-y-3 border-t border-slate-200 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {team?.teamName ?? `Nhóm #${tid}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {students.length > 0 ? `${students.length} sinh viên` : 'Chưa có sinh viên'}
                        </p>
                      </div>
                    </div>
                    {students.length > 0 && (
                      <button
                        type="button"
                        aria-label="Xem chi tiết nhóm"
                        className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#eef0f3] rounded-sm transition-colors"
                        onClick={() => toggleTeamExpanded(tid)}
                      >
                        <DownOutlined
                          style={{
                            fontSize: 12,
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            display: 'block',
                          }}
                        />
                      </button>
                    )}
                  </div>

                  {isExpanded && students.length > 0 && (
                    <div className="space-y-2 pl-12">
                      {students.map((student: any, index: number) => {
                        const statusInfo = getAssignmentStatusInfo(student.Status);
                        const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                        const rejectReason = student.Reason?.trim() || '';

                        return (
                          <div key={Number(student.AssignmentId ?? 0) || index} className="space-y-2">
                            {/* Label SINH VIÊN X */}
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Sinh viên {index + 1}
                            </p>
                            <div
                              className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg ${
                                isRejected ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                  <img
                                    src={getAvatarSrc(student.StaffMember?.AvatarUrl ?? null)}
                                    alt={student.StaffMember?.FullName || 'Sinh viên'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {student.StaffMember?.FullName || 'Sinh viên'}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {student.StaffMember?.Email || student.StaffMember?.User?.Email || '—'}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Hiển thị lịch sử từ chối (nếu có) */}
                            {rejectReason && (
                              <div className="border-l-2 border-l-rose-500 bg-rose-50/50 px-3 py-2">
                                <p className="text-xs font-medium text-rose-900 mb-1">Lịch sử từ chối:</p>
                                <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                                  {rejectReason}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sinh viên tham dự - khi request status >= 4 */}
      {showStudents && Object.keys(studentsByTeam).length > 0 && (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <h4 className="text-base font-semibold text-slate-900">Sinh viên tham dự</h4>
          {Object.keys(studentsByTeam).map((tidStr) => {
            const tid = Number(tidStr);
            const team = teamsMap[tid];
            const students = studentsByTeam[tid] ?? [];

            if (students.length === 0) return null;

            return (
              <div key={tid} className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{team?.teamName ?? `Nhóm #${tid}`}</p>
                    <p className="text-xs text-slate-500">{students.length} sinh viên</p>
                  </div>
                </div>

                <div className="space-y-2 pl-12">
                  {students.map((student: any, index: number) => {
                    const statusInfo = getAssignmentStatusInfo(student.Status);
                    const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                    const rejectReason = student.Reason?.trim() || '';

                    return (
                      <div key={Number(student.AssignmentId ?? 0) || index} className="space-y-2">
                        {/* Label SINH VIÊN X */}
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Sinh viên {index + 1}
                        </p>
                        <div
                          className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg ${
                            isRejected ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                              <img
                                src={getAvatarSrc(student.StaffMember?.AvatarUrl ?? null)}
                                alt={student.StaffMember?.FullName || 'Sinh viên'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {student.StaffMember?.FullName || 'Sinh viên'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {student.StaffMember?.Email || student.StaffMember?.User?.Email || '—'}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Hiển thị lịch sử từ chối (nếu có) */}
                        {rejectReason && (
                          <div className="border-l-2 border-l-rose-500 bg-rose-50/50 px-3 py-2">
                            <p className="text-xs font-medium text-rose-900 mb-1">Lịch sử từ chối:</p>
                            <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                              {rejectReason}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Sinh viên không có team */}
          {studentsWithoutTeam.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Chưa phân nhóm</p>
                  <p className="text-xs text-slate-500">{studentsWithoutTeam.length} sinh viên</p>
                </div>
              </div>

              <div className="space-y-2 pl-12">
                {studentsWithoutTeam.map((student: any, index: number) => {
                  const statusInfo = getAssignmentStatusInfo(student.Status);
                  const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                  const rejectReason = student.Reason?.trim() || '';

                  return (
                    <div key={Number(student.AssignmentId ?? 0) || index} className="space-y-2">
                      {/* Label SINH VIÊN X */}
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Sinh viên {index + 1}
                      </p>
                      <div
                        className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg ${
                          isRejected ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                            <img
                              src={getAvatarSrc(student.StaffMember?.AvatarUrl ?? null)}
                              alt={student.StaffMember?.FullName || 'Sinh viên'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {student.StaffMember?.FullName || 'Sinh viên'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {student.StaffMember?.Email || student.StaffMember?.User?.Email || '—'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Hiển thị lý do từ chối */}
                      {isRejected && rejectReason && (
                        <div className="border-l-2 border-l-rose-500 bg-rose-50/50 px-3 py-2">
                          <p className="text-xs font-medium text-rose-900 mb-1">Lý do từ chối:</p>
                          <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                            {rejectReason}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
