import { Search, Users, Trash2, Plus, CircleHelp } from 'lucide-react';
import { Popover, Checkbox } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import type { Team } from '@/modules/team/team';
import { getAssignmentStatusInfo, ASSIGNMENT_STATUS, REQUEST_STATUS, getRequestStatusCode } from '@/constants/status';
import { useRequestDetailTeamPanel } from '../hooks/useRequestDetailTeamPanel';
import memberApi from '@/modules/member/api/memberApi';
import type { MemberDetail } from '@/modules/member/member';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';

export type SessionForTeam = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

type Props = {
  session: SessionForTeam & { sessionId: number };
  currentTeamQuantities?: Record<number, { teachersRequired: number; tasRequired: number }>;
  currentAssignedTeamIds?: number[];
  separateTeacherSelection?: boolean;
  canEdit?: boolean;
  /** Điều kiện riêng cho phần chọn giảng viên (nếu không truyền thì dùng canEdit) */
  canEditTeacher?: boolean;
  /** Request status để kiểm tra có hiển thị danh sách sinh viên đã phân công không */
  requestStatus?: string | number | null;
  onAssignSession: (
    sessionId: number,
    teamIds: number[],
    teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
  /** Callback khi teacher assignment được update */
  onTeacherAssignmentUpdated?: () => void | Promise<void>;
};

export default function RequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  separateTeacherSelection = false,
  canEdit = true,
  canEditTeacher,
  requestStatus,
  onAssignSession,
  onTeacherAssignmentUpdated,
}: Props) {
  // ✅ Use custom hook for all state management
  const { state, computed, actions } = useRequestDetailTeamPanel({
    session,
    currentTeamQuantities,
    currentAssignedTeamIds,
    separateTeacherSelection,
    requestStatus,
    onAssignSession,
    onTeacherAssignmentUpdated,
  });

  // Helper function for UI (not in hook because it's UI-specific)
  const getTeamMetric = (team: Team, keys: string[]) => {
    const record = team as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
    }
    return undefined;
  };

  // 🎨 JSX below - will update variable references next
  // Sử dụng canEditTeacher nếu được truyền, nếu không thì dùng canEdit
  const canEditTeacherFinal = canEditTeacher !== undefined ? canEditTeacher : canEdit;

  // ── Member detail dropdown ──────────────────────────────────────────────
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<number>>(new Set());
  const [memberDetails, setMemberDetails] = useState<Record<number, MemberDetail | null>>({});
  const [memberLoadingIds, setMemberLoadingIds] = useState<Set<number>>(new Set());
  const memberFetchedRef = useRef<Set<number>>(new Set());

  const toggleMemberExpanded = useCallback(async (memberId: number) => {
    if (!memberId || memberId <= 0) return;
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) { next.delete(memberId); } else { next.add(memberId); }
      return next;
    });
    if (!memberFetchedRef.current.has(memberId)) {
      memberFetchedRef.current.add(memberId);
      setMemberLoadingIds((prev) => new Set(prev).add(memberId));
      try {
        const detail = await memberApi.getMemberById(memberId);
        setMemberDetails((prev) => ({ ...prev, [memberId]: detail }));
      } catch {
        setMemberDetails((prev) => ({ ...prev, [memberId]: null }));
      } finally {
        setMemberLoadingIds((prev) => { const next = new Set(prev); next.delete(memberId); return next; });
      }
    }
  }, []);

  const renderMemberDetailPanel = useCallback((memberId: number) => {
    if (!expandedMemberIds.has(memberId)) return null;
    if (memberLoadingIds.has(memberId)) {
      return (
        <div className="mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-500">
          <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#2197C0] rounded-full animate-spin shrink-0" />
          Đang tải thông tin...
        </div>
      );
    }
    const detail = memberDetails[memberId];
    if (!detail) {
      return (
        <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
          Không thể tải thông tin thành viên.
        </div>
      );
    }
    const memberSkills = detail.skills?.filter((s) => s.isActive) ?? [];
    if (memberSkills.length === 0) {
      return (
        <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
          Chưa có kỹ năng.
        </div>
      );
    }
    return (
      <div className="mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex flex-wrap gap-1">
          {memberSkills.map((s) => (
            <Badge key={s.skillId} className="bg-orange-100 text-orange-700 border-0 text-[10px] font-medium">
              {s.skillName}
            </Badge>
          ))}
        </div>
      </div>
    );
  }, [expandedMemberIds, memberLoadingIds, memberDetails]);

  return (
    <div className="space-y-5">
      {separateTeacherSelection ? (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-900">Giảng viên tham dự</p>
            {state.teacherEditMode ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
                  disabled={state.saving}
                  onClick={actions.handleCancelTeacherEdit}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={state.saving}
                  onClick={() => void actions.handleSaveTeachersOnly()}
                >
                  {state.saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            ) : (
              canEditTeacherFinal ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={state.saving}
                  onClick={() => actions.setTeacherEditMode(true)}
                >
                  {computed.assignedTeacherCountByAssignments > 0 ? 'Chỉnh sửa' : 'Thêm'}
                </Button>
              ) : null
            )}
          </div>
          {state.teacherAssignments.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có slot giảng viên để phân công ở buổi này.</p>
          ) : state.teacherEditMode ? (
            <div className="space-y-2">
              {state.teacherAssignments.map((slot, index) => {
                const assignmentId = Number(slot.AssignmentId ?? 0);
                const suggestions = state.teacherSuggestionsByAssignmentId[assignmentId] ?? [];
                const selectedIdsOnOtherSlots = state.teacherAssignments
                  .map((s) =>
                    s.AssignmentId === assignmentId
                      ? 0
                      : Math.max(0, Number(s.StaffMemberId ?? 0))
                  )
                  .filter((id) => id > 0);
                const q = (state.teacherSearchByAssignmentId[assignmentId] ?? '').trim().toLowerCase();
                const filteredSuggestions = suggestions.filter((staff) => {
                  if (selectedIdsOnOtherSlots.includes(staff.memberId)) return false;
                  if (!q) return true;
                  return (
                    staff.fullName.toLowerCase().includes(q) ||
                    (staff.email ?? '').toLowerCase().includes(q) ||
                    (staff.roleName ?? '').toLowerCase().includes(q)
                  );
                });
                return (
                  <div key={assignmentId || index} className="border-b border-slate-200 bg-white py-2.5 last:border-b-0">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Giảng viên {index + 1}
                    </p>
                    <Popover
                        trigger="click"
                        open={state.teacherPickerAssignmentId === assignmentId}
                        onOpenChange={(visible) => {
                          actions.setTeacherPickerAssignmentId(visible ? assignmentId : null);
                          if (visible) void actions.handleLoadTeacherSuggestions(assignmentId);
                        }}
                        placement="bottomLeft"
                        destroyOnHidden
                        content={
                          <div className="w-[min(calc(100vw-2rem),28rem)] p-2">
                            <Input
                              className="h-9 text-sm border-slate-200"
                              placeholder="Tìm giảng viên..."
                              value={state.teacherSearchByAssignmentId[assignmentId] ?? ''}
                              onChange={(e) =>
                                actions.setTeacherSearchByAssignmentId((prev) => ({
                                  ...prev,
                                  [assignmentId]: e.target.value,
                                }))
                              }
                            />
                            <div className="mt-2 max-h-[400px] min-h-[200px] overflow-y-auto no-scrollbar space-y-1">
                              {filteredSuggestions.length === 0 ? (
                                <p className="text-sm text-slate-500 px-3 py-6 text-center">Không có gợi ý phù hợp.</p>
                              ) : (
                                filteredSuggestions.map((staff) => {
                                  const isExpanded = state.expandedTeacherIds.has(staff.memberId);
                                  return (
                                    <div key={staff.memberId} className="border border-slate-200 rounded-lg overflow-hidden">
                                      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                                        <button
                                          type="button"
                                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                          onClick={() => {
                                            actions.handleAssignTeacherToSlot(assignmentId, staff.memberId);
                                          }}
                                        >
                                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                            <img
                                              src={getAvatarSrc(staff.avatarUrl)}
                                              alt={staff.fullName}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                              }}
                                            />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{staff.fullName || '—'}</p>
                                            <p className="text-xs text-slate-500 truncate">{staff.email || staff.roleName || '—'}</p>
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            actions.setExpandedTeacherIds((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(staff.memberId)) {
                                                next.delete(staff.memberId);
                                              } else {
                                                next.add(staff.memberId);
                                              }
                                              return next;
                                            });
                                          }}
                                          className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                          title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                                        >
                                          <DownOutlined 
                                            className={`text-slate-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      </div>
                                      {isExpanded && (
                                        <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                                          {staff.skills && staff.skills.length > 0 ? (
                                            <div>
                                              <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Kỹ năng:</p>
                                              <div className="flex flex-wrap gap-1">
                                                {staff.skills.map((skill, idx) => (
                                                  <span
                                                    key={skill?.skillId ?? idx}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700"
                                                  >
                                                    {typeof skill === 'string' ? skill : skill?.skillName ?? 'N/A'}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          ) : null}
                                          {staff.assignmentCountIn30Days != null ? (
                                            <div className="flex items-center gap-2">
                                              <p className="text-[10px] font-semibold text-slate-700">Số buổi trong 30 ngày:</p>
                                              <p className="text-[10px] font-semibold text-slate-700">{staff.assignmentCountIn30Days} buổi</p>
                                            </div>
                                          ) : null}
                                          {staff.skillMatchCount != null ? (
                                            <div className="flex items-center gap-2">
                                              <p className="text-[10px] font-semibold text-slate-700">Số kỹ năng phù hợp:</p>
                                              <p className="text-[10px] font-semibold text-slate-700">{staff.skillMatchCount}</p>
                                            </div>
                                          ) : null}
                                          {(!staff.skills || staff.skills.length === 0) && staff.assignmentCountIn30Days == null && !staff.skillMatchCount ? (
                                            <p className="text-xs text-slate-500 italic">Chưa có thông tin chi tiết</p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        }
                        styles={{ content: { padding: 12 } }}
                      >
                        <button
                          type="button"
                          disabled={state.saving}
                          className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60 rounded-lg border border-slate-200"
                        >
                          {Number(slot.StaffMemberId ?? 0) > 0 ? (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                  <img
                                    src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                                    alt={slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || 'Nhấn để đổi giảng viên'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-slate-500 shrink-0">
                                {state.saving ? 'Đang lưu...' : 'Đổi'}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                                  <Plus className="h-5 w-5 stroke-[2.5]" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">Chưa chọn giảng viên</p>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-violet-700 shrink-0">
                                {state.saving ? 'Đang lưu...' : 'Thêm'}
                              </span>
                            </>
                          )}
                        </button>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            ) : (
            <div className="space-y-2">
              {state.teacherAssignments.map((slot, index) => {
                const teacherMemberId = Number(slot.StaffMemberId ?? 0);
                const isTeacherExpanded = expandedMemberIds.has(teacherMemberId);
                return (
                <div key={Number(slot.AssignmentId ?? 0) || index} className="border-b border-slate-200 bg-white py-2.5 last:border-b-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Giảng viên {index + 1}
                  </p>
                  <div className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left">
                    {teacherMemberId > 0 ? (
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                            alt={slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">Chưa có giảng viên</p>
                          <p className="text-xs text-slate-500 truncate">Bấm chỉnh sửa để chọn giảng viên</p>
                        </div>
                      </div>
                    )}
                    {teacherMemberId > 0 && (
                      <button
                        type="button"
                        aria-label={isTeacherExpanded ? 'Ẩn thông tin' : 'Xem thông tin thành viên'}
                        title={isTeacherExpanded ? 'Ẩn thông tin' : 'Xem thông tin thành viên'}
                        className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-[#2197C0] hover:bg-slate-100 rounded-sm transition-colors shrink-0"
                        onClick={() => void toggleMemberExpanded(teacherMemberId)}
                      >
                        <DownOutlined
                          style={{
                            fontSize: 12,
                            transform: isTeacherExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            display: 'block',
                          }}
                        />
                      </button>
                    )}
                  </div>
                  {teacherMemberId > 0 && renderMemberDetailPanel(teacherMemberId)}
                </div>
                );
              })}
            </div>
          )}
          {canEdit && state.requestedTeachers > state.selectedTeacherCount && (
            <div className="flex justify-end border-t border-slate-200 pt-2">
              <span className="text-xs text-slate-500">
                {/* Còn thiếu:{' '}
                <span className="font-semibold text-amber-600">{state.requestedTeachers - state.state.selectedTeacherCount} Giảng viên</span> */}
              </span>
            </div>
          )}
        </section>
      ) : null}
      
      {/* Chỉ hiển thị phần "Nhóm phụ trách" khi request status < 4 (chưa đến giai đoạn phân công) */}
      {(() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldHideTeamSection = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (shouldHideTeamSection && state.sessionDetail && !state.sessionDetailLoading) {
          return null; // Ẩn phần "Nhóm phụ trách" khi đã có sinh viên phân công
        }

        return (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Nhóm phụ trách</h3>
              {state.teamEditMode ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
                    disabled={state.saving || state.loading}
                    onClick={actions.handleCancelTeamEdit}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                    disabled={state.saving || state.loading}
                    onClick={() => void actions.handleSaveTeamsOnly()}
                  >
                    Lưu
                  </Button>
                </div>
              ) : canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={state.saving || state.loading}
                  onClick={() => actions.setTeamEditMode(true)}
                >
                  {state.addedTeamIds.length > 0 ? 'Chỉnh sửa' : 'Thêm'}
                </Button>
              ) : null}
            </div>

            {state.addedTeamIds.length === 0 && !state.teamEditMode && (
              <p className="text-xs text-slate-500">Chưa có nhóm được phân công.</p>
            )}
          </>
        );
      })()}

      {/* Hiển thị danh sách nhóm đã chọn và form thêm nhóm - chỉ khi chưa đến giai đoạn phân công */}
      {(() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldHideTeamSection = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (shouldHideTeamSection && state.sessionDetail && !state.sessionDetailLoading) {
          return null; 
        }

        return (
          <>
            {state.addedTeamIds.length > 0 && (
        <div className="space-y-3">
          {state.addedTeamIds.map((tid) => {
            // Try to get team info from sessionDetail.TeamSessions first
            const teamFromSession = state.sessionDetail?.TeamSessions?.find((ts: any) => Number(ts.TeamId ?? ts.teamId) === tid);
            const teamNameFromSession = teamFromSession?.Team?.TeamName ?? teamFromSession?.TeamName;
            
            // Fallback to suggested teams
            const team = state.suggestedTeams.find((t) => t.teamId === tid);
            const teamName = teamNameFromSession || team?.teamName || `nhóm #${tid}`;
            const memberCount = (team as Team & { memberCount?: number })?.memberCount;
            const isExpanded = state.expandedAddedTeamIds.includes(tid);
            return (
              <div
                key={tid}
                className="space-y-3 border-t border-slate-200 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{teamName}</p>
                      <p className="text-xs text-slate-500">
                        {memberCount != null ? `${memberCount} thành viên` : 'nhóm đã gắn'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        aria-label="Xem chi tiết nhóm"
                        className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#eef0f3] rounded-sm transition-colors"
                        onClick={() => actions.toggleAddedTeamExpanded(tid)}
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
                    {state.teamEditMode ? (
                      <button
                        type="button"
                        onClick={() => actions.removeAddedTeam(tid)}
                        className="p-1 text-slate-400 hover:text-red-600 transition shrink-0"
                        aria-label="Xóa nhóm"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <span></span>
                    )}
                  </div>
                </div>

                {isExpanded && team && (
                  <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                    {(() => {
                      const matchedTeacher = getTeamMetric(team, ['matchingSkillTeacherCount']);
                      const matchedTa = getTeamMetric(team, ['matchingSkillTaCount']);
                      const availableTeacher = getTeamMetric(team, ['availableTeacherCount', 'availableTeachersCount']);
                      const availableTa = getTeamMetric(team, ['availableTaCount', 'availableTACount']);
                      const totalTeacher = getTeamMetric(team, ['totalTeacherCount', 'teachersCount']);
                      const totalTa = getTeamMetric(team, ['totalTaCount', 'totalTACount', 'tasCount']);
                      const hasTeacher = availableTeacher != null || totalTeacher != null;
                      const hasTa = availableTa != null || totalTa != null;
                      return (
                        <>
                          {memberCount != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-700">Tổng thành viên:</span>
                              <span className="text-[10px] font-semibold text-slate-700">{memberCount}</span>
                            </div>
                          )}
                          {hasTeacher && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Giảng viên khả dụng:</span>
                                <span className="text-[10px] font-semibold text-slate-700">{availableTeacher ?? totalTeacher ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (GV):</span>
                                <span className="text-[10px] font-semibold text-slate-700">{matchedTeacher ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {hasTa && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Sinh viên khả dụng:</span>
                                <span className="text-[10px] font-semibold text-slate-700">{availableTa ?? totalTa ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (SV):</span>
                                <span className="text-[10px] font-semibold text-slate-700">{matchedTa ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {(() => {
                            const topics = (team as Team & { topics?: { topicId: number; topicName?: string | null }[] }).topics ?? [];
                            if (topics.length === 0) return null;
                            return (
                              <div className="pt-1">
                                <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Chủ đề nhóm:</p>
                                <div className="flex flex-wrap gap-1">
                                  {topics.map((t) => (
                                    <span key={t.topicId} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700">
                                      {t.topicName || `Chủ đề #${t.topicId}`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  {state.teamEditMode ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-600">Số lượng sinh viên:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            actions.updateTeamQuantity(tid, (state.teamQuantities[tid]?.tasRequired ?? 0) - 1)
                          }
                          className="w-8 h-8 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-lg leading-none"
                        >
                          −
                        </button>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={state.teamQuantities[tid]?.tasRequired ?? 0}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10) || 0;
                            actions.updateTeamQuantity(tid, raw);
                          }}
                          className="w-12 h-8 text-center text-sm border-slate-200 px-1 [appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            actions.updateTeamQuantity(tid, (state.teamQuantities[tid]?.tasRequired ?? 0) + 1)
                          }
                          className="w-8 h-8 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-600">Số lượng sinh viên:</span>
                      <span className="text-sm font-semibold text-slate-900">{state.teamQuantities[tid]?.tasRequired ?? 0}</span>
                    </div>
                  )}
                  
                </div>
              </div>
            );
          })}
          {canEdit && state.requestedTas > computed.totals.tas && (
            <div className="flex justify-end">
              {/* <span className="text-xs text-slate-500">
                Còn thiếu:{' '}
                <span className="font-semibold text-amber-600">
                  {state.requestedTas - computed.totals.tas} Sinh viên
                </span>
              </span> */}
            </div>
          )}
        </div>
      )}

      {state.teamEditMode && state.addedTeamIds.length > 0 && (
        <button
          type="button"
          onClick={() => actions.setShowAddTeam((v) => !v)}
          className="w-full bg-[#f3f6fb] hover:bg-[#e8edf5] text-[#0f6cbd] py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors rounded-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm nhóm
        </button>
      )}

      {state.teamEditMode && (state.showAddTeam || state.addedTeamIds.length === 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CircleHelp className="w-3.5 h-3.5 shrink-0" />
            <span>Bấm vào mũi tên ở cuối để xem chi tiết năng lực và khả dụng nhân sự.</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm theo tên nhóm"
              value={state.teamSearch}
              onChange={(e) => actions.setTeamSearch(e.target.value)}
              className="pl-9 text-sm text-slate-900 border border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0f6cbd] rounded-sm h-9"
            />
          </div>

          {state.error && (
            <p className="text-xs text-red-600 px-1">{state.error}</p>
          )}

          {state.loading ? (
            <p className="text-xs text-slate-400 px-1">Đang tải danh sách nhóm gợi ý...</p>
          ) : computed.filteredTeams.length === 0 ? (
            <p className="text-xs text-slate-400 px-1">Không có nhóm gợi ý phù hợp cho buổi này.</p>
          ) : (
            <div className="rounded-sm overflow-hidden">
              {computed.filteredTeams.map((team, idx) => {
                const isExpanded = state.expandedTeamIds.includes(team.teamId);
                const leaderName = (team as { leader?: { fullName?: string } }).leader?.fullName?.trim() || '—';
                const memberCount =
                  (team as { members?: unknown[] }).members?.length ?? (team as { memberCount?: number }).memberCount ?? null;
                return (
                  <div
                    key={team.teamId}
                    className={`transition-colors ${idx !== 0 ? 'border-t border-[#eef0f3]' : ''}`}
                  >
                    <div
                      className="flex items-center justify-between gap-3 px-3 py-3 cursor-pointer hover:bg-[#f3f6fb]"
                      onClick={() => actions.toggleTeamAdded(team.teamId)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{team.teamName}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">Trưởng nhóm: {leaderName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Xem chi tiết nhóm"
                          className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#eef0f3] rounded-sm transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.toggleTeamExpanded(team.teamId);
                          }}
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
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-700">Tổng thành viên:</span>
                          <span className="text-[10px] font-semibold text-slate-700">
                            {memberCount != null ? memberCount : '—'}
                          </span>
                        </div>

                        {(() => {
                          const matchedTeacher = getTeamMetric(team, ['matchingSkillTeacherCount']);
                          const matchedTa = getTeamMetric(team, ['matchingSkillTaCount']);
                          const availableTeacher = getTeamMetric(team, ['availableTeacherCount', 'availableTeachersCount']);
                          const availableTa = getTeamMetric(team, ['availableTaCount', 'availableTACount']);
                          const totalTeacher = getTeamMetric(team, ['totalTeacherCount', 'teachersCount']);
                          const totalTa = getTeamMetric(team, ['totalTaCount', 'totalTACount', 'tasCount']);
                          const hasTeacher = availableTeacher != null || totalTeacher != null;
                          const hasTa = availableTa != null || totalTa != null;
                          if (!hasTeacher && !hasTa) return null;
                          return (
                            <>
                              {hasTeacher && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Giảng viên khả dụng:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{availableTeacher ?? totalTeacher ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (GV):</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{matchedTeacher ?? '—'}</span>
                                  </div>
                                </>
                              )}
                              {hasTa && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Sinh viên khả dụng:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{availableTa ?? totalTa ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{matchedTa ?? '—'}</span>
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {(() => {
                          const topics = (team as Team & { topics?: { topicId: number; topicName?: string | null }[] }).topics ?? [];
                          if (topics.length === 0) return null;
                          return (
                            <div className="pt-1">
                              <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Chủ đề nhóm:</p>
                              <div className="flex flex-wrap gap-1">
                                {topics.map((t) => (
                                  <span
                                    key={t.topicId}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700"
                                  >
                                    {t.topicName || `Chủ đề #${t.topicId}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
          </>
        );
      })()}

      {/* Hiển thị danh sách sinh viên đã phân công khi request status >= 4 */}
      {state.sessionDetail && !state.sessionDetailLoading && state.addedTeamIds.length > 0 && (() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldShow = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (!shouldShow) return null;

        // Lấy danh sách assignments sinh viên
        const allAssignments = (state.sessionDetail.Assignments ?? []).filter((a: any) => {
          const role = String(a.StaffRole ?? '').toUpperCase();
          return role === 'TA' || role.includes('STUDENT') || role.includes('SV') || role.includes('SINH');
        });

        // Nhóm sinh viên theo team - bao gồm CẢ những sinh viên không có team
        const studentsByTeam: Record<number, any[]> = {};
        const studentsWithoutTeam: any[] = [];
        
        allAssignments.forEach((a: any) => {
          const teamId = Number(a.TeamId ?? a.StaffMember?.TeamId ?? 0);
          if (teamId > 0) {
            if (!studentsByTeam[teamId]) studentsByTeam[teamId] = [];
            studentsByTeam[teamId].push(a);
          } else {
            studentsWithoutTeam.push(a);
          }
        });

        const hasAnyStudents = allAssignments.length > 0;
        if (!hasAnyStudents) return null;

        // Count pending students - check ALL assignments, not just those in addedTeamIds
        const allPendingStudents = allAssignments.filter((a: any) => {
          const statusInfo = getAssignmentStatusInfo(a.Status);
          return statusInfo.code === ASSIGNMENT_STATUS.PENDING;
        });
        const hasPendingStudents = allPendingStudents.length > 0;

        // Debug info removed for production performance
        // console.log('Debug approval button:', {
        //   canEdit,
        //   hasPendingStudents,
        //   allPendingStudents: allPendingStudents.length,
        //   allAssignments: allAssignments.length,
        //   studentsByTeam: Object.keys(studentsByTeam).length,
        //   requestStatus,
        //   statusCode,
        // });

        // Manager can approve students when request status >= ASSIGNING (4)
        const canApproveStudents = statusCode != null && statusCode >= REQUEST_STATUS.ASSIGNING;

        return (
          <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Sinh viên tham dự</h4>
              {canApproveStudents && hasPendingStudents && (
                <div className="flex items-center gap-2">
                  {state.studentApprovalMode ? (
                    <>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                        <Checkbox
                          checked={allPendingStudents.length > 0 && allPendingStudents.every((s: any) => state.selectedStudentAssignmentIds.has(Number(s.AssignmentId ?? 0)))}
                          onChange={() => {
                            const allPendingIds = allPendingStudents.map((s: any) => Number(s.AssignmentId ?? 0)).filter((id: number) => id > 0);
                            actions.handleToggleSelectAllStudents(allPendingIds);
                          }}
                        />
                        <span>Chọn tất cả</span>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
                        disabled={state.bulkApprovingStudents}
                        onClick={actions.handleToggleStudentApprovalMode}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                        disabled={state.bulkApprovingStudents || state.selectedStudentAssignmentIds.size === 0}
                        onClick={() => void actions.handleBulkApproveStudents()}
                      >
                        {state.bulkApprovingStudents ? 'Đang xử lý...' : `Xác nhận duyệt (${state.selectedStudentAssignmentIds.size})`}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                      onClick={actions.handleToggleStudentApprovalMode}
                    >
                      Duyệt
                    </Button>
                  )}
                </div>
              )}
            </div>
            {Object.keys(studentsByTeam).map((tidStr) => {
              const tid = Number(tidStr);
              // Try to get team info from sessionDetail.TeamSessions first (has full team name)
              const teamFromSession = state.sessionDetail?.TeamSessions?.find((ts: any) => Number(ts.TeamId ?? ts.teamId) === tid);
              const teamNameFromSession = teamFromSession?.Team?.TeamName ?? teamFromSession?.TeamName;
              
              // Fallback to suggested teams
              const team = state.suggestedTeams.find((t) => t.teamId === tid);
              const teamName = teamNameFromSession || team?.teamName || `Nhóm #${tid}`;
              
              const students = studentsByTeam[tid] ?? [];
              
              if (students.length === 0) return null;

              return (
                <div key={tid} className="space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{teamName}</p>
                      <p className="text-xs text-slate-500">{students.length} sinh viên</p>
                    </div>
                  </div>

                  <div className="space-y-2 pl-12">
                    {students.map((student, index) => {
                      const statusInfo = getAssignmentStatusInfo(student.Status);
                      const isPending = statusInfo.code === ASSIGNMENT_STATUS.PENDING;
                      const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                      const assignmentId = Number(student.AssignmentId ?? 0);
                      const isSelected = state.selectedStudentAssignmentIds.has(assignmentId);
                      const showApprovalControls = state.studentApprovalMode && isPending;
                      const rejectReason = student.Reason?.trim() || '';

                      return (
                        <div key={assignmentId || index} className="space-y-2">
                          {/* Label SINH VIÊN X */}
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Sinh viên {index + 1}
                          </p>
                          <div
                            className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg transition-colors ${
                              showApprovalControls && isSelected
                                ? 'border-[#208aae] bg-[#208aae]/5'
                                : isRejected
                                ? 'border-rose-200 bg-rose-50/30'
                                : 'border-slate-200'
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
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {showApprovalControls ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-rose-200"
                                    onClick={() => actions.handleOpenRejectModal(assignmentId)}
                                  >
                                    Từ chối
                                  </Button>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => actions.handleToggleStudentSelection(assignmentId)}
                                  />
                                </>
                              ) : (
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                                >
                                  {statusInfo.label}
                                </span>
                              )}
                              {Number(student.StaffMemberId ?? 0) > 0 && (
                                <button
                                  type="button"
                                  aria-label={expandedMemberIds.has(Number(student.StaffMemberId)) ? 'Ẩn thông tin' : 'Xem thông tin thành viên'}
                                  title={expandedMemberIds.has(Number(student.StaffMemberId)) ? 'Ẩn thông tin' : 'Xem thông tin thành viên'}
                                  className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-[#2197C0] hover:bg-slate-100 rounded-sm transition-colors"
                                  onClick={() => void toggleMemberExpanded(Number(student.StaffMemberId))}
                                >
                                  <DownOutlined
                                    style={{
                                      fontSize: 11,
                                      transform: expandedMemberIds.has(Number(student.StaffMemberId)) ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s',
                                      display: 'block',
                                    }}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                          {Number(student.StaffMemberId ?? 0) > 0 && renderMemberDetailPanel(Number(student.StaffMemberId))}
                          
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
            
            {/* Hiển thị sinh viên không có team */}
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
                  {studentsWithoutTeam.map((student, index) => {
                    const statusInfo = getAssignmentStatusInfo(student.Status);
                    const isPending = statusInfo.code === ASSIGNMENT_STATUS.PENDING;
                    const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                    const assignmentId = Number(student.AssignmentId ?? 0);
                    const isSelected = state.selectedStudentAssignmentIds.has(assignmentId);
                    const showApprovalControls = state.studentApprovalMode && isPending;
                    const rejectReason = student.Reason?.trim() || '';

                    return (
                      <div key={assignmentId || index} className="space-y-2">
                        {/* Label SINH VIÊN X */}
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Sinh viên {index + 1}
                        </p>
                        <div
                          className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg transition-colors ${
                            showApprovalControls && isSelected
                              ? 'border-[#208aae] bg-[#208aae]/5'
                              : isRejected
                              ? 'border-rose-200 bg-rose-50/30'
                              : 'border-slate-200'
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
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {showApprovalControls ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-rose-200"
                                  onClick={() => actions.handleOpenRejectModal(assignmentId)}
                                >
                                  Từ chối
                                </Button>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => actions.handleToggleStudentSelection(assignmentId)}
                                />
                              </>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            )}
                          </div>
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
            )}
          </div>
        );
      })()}

      {/* Reject modal */}
      <Dialog
        open={state.rejectModalOpen}
        onClose={() => !state.rejectingStudent && actions.setRejectModalOpen(false)}
        title="Từ chối phân công sinh viên"
        description="Nhập lý do từ chối phân công sinh viên này."
        className="max-w-md border-0 shadow-2xl"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-black">
              Lý do <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="reject-reason"
              rows={4}
              value={state.rejectReason}
              onChange={(e) => actions.setRejectReason(e.target.value)}
              placeholder="Ví dụ: Không đủ kỹ năng yêu cầu, trùng lịch..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={state.rejectingStudent}
              onClick={() => actions.setRejectModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={state.rejectingStudent}
              onClick={() => void actions.handleConfirmRejectStudent()}
            >
              {state.rejectingStudent ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
