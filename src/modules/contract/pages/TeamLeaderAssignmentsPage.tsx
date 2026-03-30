import { useCallback, useEffect, useRef, useState } from 'react';


import dayjs from 'dayjs';
import { Popover, Spin } from 'antd';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Hash,
  List,
  GraduationCap,
  Users,
  AlertCircle,
  RotateCcw,
  Plus,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import RequestCard from '@/shared/components/request/RequestCard';
import {
  getSessionStatusInfo,
  getTeamLeaderRequestStatusInfo,
  isSessionAssignmentRejectedStatus,
} from '@/constants/status';
import type { AssignmentResponse, SessionDetail, SuggestedStaff } from '@/modules/request/type';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import {
  getEffectiveStaffMemberId,
  useTeamLeaderAssignmentsPage,
} from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';
import { SESSION_STATUS } from '@/constants/status';

type AssignmentRow = AssignmentResponse;

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

function getStaffDisplayForSlot(
  effectiveMemberId: number,
  assignment: AssignmentRow,
  suggested: SuggestedStaff[],
): { fullName: string; email: string; avatarUrl?: string | null } {
  const sm = assignment.StaffMember;
  if (sm && sm.MemberId === effectiveMemberId) {
    return {
      fullName: sm.FullName || '—',
      email: sm.Email || sm.User?.Email || '',
      avatarUrl: sm.AvatarUrl,
    };
  }
  const sug = suggested.find((m) => m.memberId === effectiveMemberId);
  if (sug) {
    return {
      fullName: sug.fullName || '—',
      email: sug.email || sug.roleName || '',
      avatarUrl: sug.avatarUrl,
    };
  }
  return {
    fullName: `Thành viên #${effectiveMemberId}`,
    email: '',
    avatarUrl: null,
  };
}

/** Assignment status Rejected = 3 (manager từ chối phân công). Không dùng .includes để tránh nhầm với session AssignmentRejected. */
function isAssignmentRejectedStatus(status: string | number | null | undefined): boolean {
  const raw = String(status ?? '').trim();
  if (!raw) return false;
  const n = Number(raw);
  if (!Number.isNaN(n) && n === 3) return true;
  const u = raw.toUpperCase().replace(/[\s-]/g, '_');
  return u === 'REJECTED';
}

function getAssignmentReviewBadge(status: string | number | null | undefined): {
  label: string;
  className: string;
} | null {
  const raw = String(status ?? '').trim();
  const statusCode = Number(raw);

  if (isSessionAssignmentRejectedStatus(status)) {
    return {
      label: 'Phân công bị từ chối',
      className: 'bg-rose-50 text-rose-800 border-rose-200',
    };
  }

  const normalized = raw.toUpperCase().replace(/[\s-]/g, '_');
  if (
    normalized === 'ASSIGNED' ||
    (!Number.isNaN(statusCode) && statusCode === SESSION_STATUS.ASSIGNED)
  ) {
    return {
      label: 'Phân công đã được duyệt',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }

  return null;
}

/**
 * Badge danh sách phiên: ưu tiên trạng thái phiên AssignmentRejected;
 * sau đó mới theo slot (chi tiết) hoặc status từ filter.
 */
function getSessionListProgressBadge(
  session: { status: string },
  detailLoaded: boolean,
  stats: { total: number; filled: number },
  effectiveSessionStatus?: string,
): { label: string; className: string; showAlert?: boolean } {
  const sessionStatus = (effectiveSessionStatus ?? session.status).trim();
  if (isSessionAssignmentRejectedStatus(sessionStatus)) {
    return {
      label: 'Từ chối phân công',
      className: 'bg-rose-50 text-rose-800 border-rose-200',
    };
  }

  if (detailLoaded) {
    if (stats.total === 0) {
      return {
        label: 'Chưa có slot',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        showAlert: true,
      };
    }
    if (stats.filled === stats.total) {
      return {
        label: 'Đã gán đủ',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    return {
      label: 'Chưa gán đủ',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  const raw = String(session.status ?? '').trim();
  const normalized = raw.toUpperCase().replace(/[\s-]/g, '_');
  const statusCode = Number(raw);

  if (
    normalized === 'ASSIGNED' ||
    (!Number.isNaN(statusCode) && statusCode === SESSION_STATUS.ASSIGNED)
  ) {
    return {
      label: 'Đã gán đủ',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (
    normalized === 'ASSIGNING' ||
    (!Number.isNaN(statusCode) && statusCode === SESSION_STATUS.ASSIGNING)
  ) {
    return {
      label: 'Chưa gán đủ',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  const info = getSessionStatusInfo(session.status);
  return { label: info.label, className: info.className };
}

type TeamLeaderAssignmentsPageProps = {
  tab: TeamLeaderAssignmentsTab;
};

export default function TeamLeaderAssignmentsPage({ tab }: TeamLeaderAssignmentsPageProps) {
  const {
    loading,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    currentTeamId,
    selectedRequest,
    selectedRequestTypeInfo,
    search,
    setSearch,
    onlyNeedsAction,
    setOnlyNeedsAction,
    statusFilter,
    setStatusFilter,
    activeSession,
    setActiveSession,
    sessionDetailsById,
    suggestedByAssignmentId,
    ensureSuggestedStaffForAssignments,
    assignSelections,
    searchByAssignmentId,
    setSearchByAssignmentId,
    handleSelectStaff,
    getSessionStats,
    handleResetFilters,
  } = useTeamLeaderAssignmentsPage(tab);

  const [hoveredStaff, setHoveredStaff] = useState<{
    staff: SuggestedStaff;
    rect: DOMRect;
  } | null>(null);
  const [staffPickerAssignmentId, setStaffPickerAssignmentId] = useState<number | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStaffPickerAssignmentId(null);
    setHoveredStaff(null);
  }, [activeSession?.sessionId]);

  useEffect(() => {
    setHoveredStaff(null);
  }, [selectedRequestId]);

  useEffect(() => {
    if (staffPickerAssignmentId != null) return;
    setHoveredStaff(null);
  }, [staffPickerAssignmentId]);

  useEffect(() => {
    if (staffPickerAssignmentId == null) return;
    void ensureSuggestedStaffForAssignments([staffPickerAssignmentId]);
  }, [staffPickerAssignmentId, ensureSuggestedStaffForAssignments]);

  useEffect(() => {
    const closeHover = () => setHoveredStaff(null);
    window.addEventListener('scroll', closeHover, true);
    window.addEventListener('resize', closeHover);
    return () => {
      window.removeEventListener('scroll', closeHover, true);
      window.removeEventListener('resize', closeHover);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);


  const renderMemberOption = (m: SuggestedStaff) => {
    const subText = m.email ?? m.roleName ?? '—';
    return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
        <img
          src={getAvatarSrc(m.avatarUrl)}
          alt={m.fullName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
          }}
        />
      </div>
        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-slate-900 truncate shrink-0">
          {m.fullName || '—'}
        </span>
          <span className="text-[11px] text-slate-500 truncate">{subText}</span>
      </div>
    </div>
  );
  };

  const handleStaffHover = useCallback(
    (staff: SuggestedStaff, e: React.MouseEvent) => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredStaff({ staff, rect });
    },
    [],
  );

  const handleStaffHoverLeave = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(() => setHoveredStaff(null), 80);
  }, []);

  const renderSlotPicker = (
    sessionId: number,
    slots: NonNullable<SessionDetail['Assignments']>,
    roleLabel: string,
    requiredCount: number,
    colorScheme: 'sky' | 'amber',
    highlightRejectedSlots = false,
  ) => {
    const accent =
      colorScheme === 'sky'
        ? {
            addText: 'text-[#2197C0]',
            addCircle: 'bg-sky-100 text-[#2197C0]',
            addHover: 'hover:border-sky-300 hover:bg-sky-50/50',
            cardBorder: 'border-sky-200',
            cardBg: 'bg-gradient-to-br from-sky-50/70 to-white',
            avatarBg: 'bg-sky-100 text-[#2197C0]',
            menuBtn: 'text-sky-500 hover:bg-sky-50 hover:text-sky-700',
          }
        : {
            addText: 'text-amber-800',
            addCircle: 'bg-amber-100 text-amber-800',
            addHover: 'hover:border-amber-300 hover:bg-amber-50/60',
            cardBorder: 'border-amber-200',
            cardBg: 'bg-gradient-to-br from-amber-50/70 to-white',
            avatarBg: 'bg-amber-100 text-amber-800',
            menuBtn: 'text-amber-600 hover:bg-amber-50/80 hover:text-amber-800',
          };
    const placeholder = colorScheme === 'sky' ? 'Chọn giảng viên' : 'Chọn trợ giảng';
    const searchPlaceholder = colorScheme === 'sky' ? 'Tìm giảng viên...' : 'Tìm trợ giảng...';

    const buildSuggestedList = (a: AssignmentRow, selectedId: number) => {
      const selectedSameRole = slots
        .map((sl) =>
          getEffectiveStaffMemberId(sl.AssignmentId, assignSelections, sl.StaffMemberId),
        )
        .filter((id) => id > 0);
      const selectedOthers = selectedSameRole.filter((id) => id !== selectedId);
      const searchText = searchByAssignmentId[a.AssignmentId]?.toLowerCase() || '';
      return (suggestedByAssignmentId[a.AssignmentId] ?? []).filter(
        (m: SuggestedStaff) =>
          (!selectedOthers.includes(m.memberId) || m.memberId === selectedId) &&
          (!searchText ||
            m.fullName?.toLowerCase().includes(searchText) ||
            m.roleName?.toLowerCase().includes(searchText) ||
            m.email?.toLowerCase().includes(searchText)),
      );
    };

    const pickerContent = (a: AssignmentRow) => {
      const selectedId = getEffectiveStaffMemberId(
        a.AssignmentId,
        assignSelections,
        a.StaffMemberId,
      );
      const suggestedList = buildSuggestedList(a, selectedId);
      return (
        <div className="w-[min(calc(100vw-2rem),18rem)] p-0.5">
          <Input
            className="h-8 text-xs border-slate-200"
            placeholder={searchPlaceholder}
            value={searchByAssignmentId[a.AssignmentId] || ''}
            onChange={(e) =>
              setSearchByAssignmentId((prev) => ({
                ...prev,
                [a.AssignmentId]: e.target.value,
              }))
            }
          />
          <div className="mt-2 max-h-52 overflow-y-auto no-scrollbar space-y-0.5">
            {suggestedList.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-3 text-center">Không có gợi ý phù hợp.</p>
            ) : (
              suggestedList.map((m: SuggestedStaff) => (
                <button
                  key={m.memberId}
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    handleSelectStaff(sessionId, a.AssignmentId, m.memberId);
                    setStaffPickerAssignmentId(null);
                    setHoveredStaff(null);
                  }}
                  onMouseEnter={(e) => handleStaffHover(m, e)}
                  onMouseLeave={handleStaffHoverLeave}
                >
                  {renderMemberOption(m)}
                </button>
              ))
            )}
          </div>
        </div>
      );
    };

    const addSlotTrigger = () => (
      <button
        type="button"
        className={`min-h-[4.5rem] w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center gap-2.5 ${accent.addText} ${accent.addHover} transition-colors`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.addCircle}`}
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </span>
        <span className="text-sm font-medium">{placeholder}</span>
      </button>
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">{roleLabel}</span>
          <span className="text-xs font-medium text-slate-500">Cần: {requiredCount}</span>
        </div>
        <div className="space-y-2.5">
          {slots.length === 0 && (
            <div className="text-xs text-slate-500 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              Chưa có slot phân công.
            </div>
          )}
          {slots.map((a) => {
            const selectedId = getEffectiveStaffMemberId(
              a.AssignmentId,
              assignSelections,
              a.StaffMemberId,
            );
            const suggested = suggestedByAssignmentId[a.AssignmentId] ?? [];
            const display = getStaffDisplayForSlot(selectedId, a, suggested);
            const isOpen = staffPickerAssignmentId === a.AssignmentId;
            const filled = selectedId > 0;
            const isRejected = highlightRejectedSlots && isAssignmentRejectedStatus(a.Status);
            const reasonRaw = a.Reason?.trim();
            const reasonLines =
              reasonRaw && reasonRaw.length > 0
                ? reasonRaw.split('\n').filter((line) => line.trim().length > 0)
                : [];
            const rejectionReasonBlock =
              isRejected ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-900 mb-1.5">
                    Lý do từ chối
                  </p>
                  {reasonLines.length > 0 ? (
                    <ul className="space-y-1 text-xs text-rose-950 leading-relaxed list-none pl-0">
                      {reasonLines.map((line, idx) => (
                        <li key={idx} className="pl-3 border-l-2 border-rose-300">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-rose-700/85 italic">
                      Chưa có lý do ghi nhận từ quản lý.
                    </p>
                  )}
                </div>
              ) : null;

            if (!filled) {
              return (
                <div key={a.AssignmentId} className="space-y-2">
                  <Popover
                    trigger="click"
                    open={isOpen}
                    onOpenChange={(visible) => {
                      setStaffPickerAssignmentId(visible ? a.AssignmentId : null);
                      if (!visible) setHoveredStaff(null);
                    }}
                    placement="bottomLeft"
                    destroyOnHidden
                    content={pickerContent(a)}
                    styles={{ content: { padding: 12 } }}
                  >
                    <div
                      className={
                        isRejected
                          ? 'rounded-xl border-2 border-rose-500 bg-rose-50/50 p-0.5 shadow-sm ring-1 ring-rose-200/80'
                          : undefined
                      }
                    >
                      {addSlotTrigger()}
                    </div>
                  </Popover>
                  {rejectionReasonBlock}
                </div>
              );
            }

            return (
              <div key={a.AssignmentId} className="space-y-2">
                <div
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm ${
                    isRejected
                      ? 'border-2 border-rose-500 bg-white ring-1 ring-rose-100'
                      : `${accent.cardBorder} ${accent.cardBg}`
                  }`}
                >
                  <Popover
                    trigger="click"
                    open={isOpen}
                    onOpenChange={(visible) => {
                      setStaffPickerAssignmentId(visible ? a.AssignmentId : null);
                      if (!visible) setHoveredStaff(null);
                    }}
                    placement="bottomLeft"
                    destroyOnHidden
                    content={pickerContent(a)}
                    styles={{ content: { padding: 12 } }}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left rounded-lg -m-1 p-1 hover:bg-slate-50/80 transition-colors"
                    >
                      <div
                        className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${accent.avatarBg} flex items-center justify-center text-xs font-semibold`}
                      >
                        <img
                          src={getAvatarSrc(display.avatarUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {display.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {display.email || '—'}
                        </p>
                      </div>
                    </button>
                  </Popover>
                </div>
                {rejectionReasonBlock}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLockedSlots = (
    roleLabel: string,
    lockedCount: number,
    teamNames: string[],
  ) => {
    if (lockedCount <= 0) return null;
    const teamText = teamNames.length ? teamNames.join(', ') : 'đội khác';
    return (
      <div className="space-y-2">
        <div className="text-xs text-slate-500">
          {lockedCount} slot {roleLabel.toLowerCase()} thuộc {teamText} (chỉ xem, không thể phân công).
        </div>
        <div className="space-y-2">
          {Array.from({ length: lockedCount }).map((_, idx) => (
            <div
              key={`${roleLabel}-locked-${idx}`}
              className="min-h-[4.5rem] w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 opacity-70"
            >
              <p className="text-xs font-medium text-slate-600">Slot thuộc team khác</p>
              <p className="text-[11px] text-slate-500 mt-1">Không khả dụng cho team của bạn</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-slate-50 overflow-hidden py-0 px-0"
    >
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
          <Spin tip="Đang tải dữ liệu phân công cho team..." />
        </div>
      )}

      <div className="flex justify-start gap-3 mb-2 flex-wrap">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'assigning')}>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigning">Đang phân công</SelectItem>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
          </Button>

          <div className="flex items-center space-x-2">
            <Switch
              className="!rounded-[15px]"
              checked={onlyNeedsAction}
              onCheckedChange={setOnlyNeedsAction}
            />
            <p className="text-black whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</p>
          </div>
        </div>
      </div>

        <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[360px] bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <div className="min-w-0">
              <h2 className="font-semibold text-base text-black truncate">Danh sách yêu cầu</h2>
              <p className="text-[11px] text-slate-500">
                {filteredRequests.length} yêu cầu thuộc team của bạn
              </p>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 shrink-0">
              {filteredRequests.length}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-50">
            {filteredRequests.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                Chưa có yêu cầu nào có phiên của team này.
              </div>
            )}
            {filteredRequests.map((r) => (
              <RequestCard
                key={r.requestId}
                requestName={r.requestName ?? '—'}
                requestCode={r.requestCode}
                customerName={r.customerName}
                subjectId={r.subjectId}
                courseId={r.courseId}
                eventId={r.eventId}
                status={r.status}
                statusInfoOverride={getTeamLeaderRequestStatusInfo(r.status)}
                showNeedsAction
                isActive={r.requestId === selectedRequestId}
                onClick={() => {
                  setSelectedRequestId(r.requestId);
                  setActiveSession(null);
                }}
                hintText="Bấm để xem danh sách phiên"
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-slate-400">📋</span>
              </div>
              <p className="text-sm font-medium text-black">Chọn một yêu cầu ở cột bên trái</p>
              <p className="text-xs text-gray-500 mt-1">để xem danh sách phiên và phân công nhân sự.</p>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col min-h-0 flex-1">
              {/* Request header */}
              <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h5 className="text-xl font-bold text-slate-800 truncate min-w-0 flex-1">
                    {selectedRequest.requestName || selectedRequest.requestCode}
                  </h5>
                  {/* <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Sao chép mã"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Chia sẻ"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
                      title="Xem trong lịch"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div> */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRequestTypeInfo && (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        {selectedRequestTypeInfo.label}
                      </span>
                    )}
                    {selectedRequest && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${getTeamLeaderRequestStatusInfo(selectedRequest.status).className}`}
                      >
                        {getTeamLeaderRequestStatusInfo(selectedRequest.status).label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">Mã yêu cầu</p>
                      <p className="font-semibold text-sm text-slate-900 mt-0.5">
                        {selectedRequest.requestCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">Ngày gửi</p>
                      <p className="font-semibold text-sm text-slate-900 mt-0.5">
                        {selectedRequest.startDate
                          ? dayjs(selectedRequest.startDate).format('DD/MM/YYYY')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <List className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">Số lượng phiên</p>
                      <p className="font-semibold text-sm text-slate-900 mt-0.5">
                        {selectedRequest.sessions.length} phiên
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress uses only sessions loaded via getById (when user opens a session) */}
              {(() => {
                const sessions = selectedRequest.sessions;
                let totalSlots = 0;
                let filledSlots = 0;
                let loadedSessionCount = 0;
                sessions.forEach((s) => {
                  if (!sessionDetailsById[s.sessionId]) return;
                  loadedSessionCount += 1;
                  const stats = getSessionStats(s);
                  totalSlots += stats.total;
                  filledSlots += stats.filled;
                });
                const progress = totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);
                if (sessions.length > 0 && loadedSessionCount === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">Tiến độ phân công</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Mở một phiên học bên dưới để tải chi tiết và xem tiến độ theo slot team.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Tiến độ phân công</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {filledSlots}/{totalSlots} slot
                        {loadedSessionCount < sessions.length ? (
                          <span className="text-[11px] font-normal text-slate-500 ml-1">
                            ({loadedSessionCount}/{sessions.length} phiên đã tải)
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-500 transition-all duration-300"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Session list */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Danh sách phiên học</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedRequest.sessions.length} phiên trong yêu cầu này
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">Nhấn để xem chi tiết</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  {selectedRequest.sessions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-10 text-center">
                      Yêu cầu này chưa có phiên nào gán cho team.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {selectedRequest.sessions.map((session) => {
                        const detailLoaded = Boolean(sessionDetailsById[session.sessionId]);
                        const stats = getSessionStats(session);
                        const effSessionStatus =
                          sessionDetailsById[session.sessionId]?.Status ?? session.status;
                        const isActive = activeSession?.sessionId === session.sessionId;
                        const title = `Phiên ${session.sessionNo}`;
                        const assignmentReviewBadge = getAssignmentReviewBadge(session.status);
                        const progressBadge = getSessionListProgressBadge(
                          session,
                          detailLoaded,
                          stats,
                          effSessionStatus,
                        );
                        return (
                          <div
                            key={session.sessionId}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveSession(session)}
                            className={`w-full px-5 py-4 transition cursor-pointer ${
                              isActive ? 'bg-sky-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] text-slate-500">Phiên dạy</span>
                                  <span className="text-[11px] font-medium text-slate-700">{title}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {dayjs(session.startAt).format('HH:mm')} -{' '}
                                    {dayjs(session.endAt).format('HH:mm')}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {dayjs(session.startAt).format('DD/MM/YYYY')}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {session.location || '—'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {assignmentReviewBadge &&
                                  !isSessionAssignmentRejectedStatus(effSessionStatus) && (
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${assignmentReviewBadge.className}`}
                                  >
                                    {assignmentReviewBadge.label}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${progressBadge.className}`}
                                >
                                  {progressBadge.showAlert && (
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                  )}
                                  {progressBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
                              </div>

      </div>
          </div>

      {/* ─── RIGHT: Session detail + assignment panel (slide-over overlay) ─── */}
      {activeSession && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setActiveSession(null)} />
          <div className="w-full max-w-xl h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden border-l">
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Phiên {activeSession.sessionNo}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-sky-600">
                    {dayjs(activeSession.startAt).format('DD/MM/YYYY')}
                  </span>
                  {(() => {
                    const d = sessionDetailsById[activeSession.sessionId];
                    const eff = String(d?.Status ?? activeSession.status ?? '').trim();
                    const sessionRejected = isSessionAssignmentRejectedStatus(eff);
                    
                    if (tab === 'rejected' && !sessionRejected) {
                      return (
                        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                          Yêu cầu có phiên bị từ chối
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {(() => {
                    const d = sessionDetailsById[activeSession.sessionId];
                    const eff = String(d?.Status ?? activeSession.status ?? '').trim();
                    const sessionRejected = isSessionAssignmentRejectedStatus(eff);
                    if (sessionRejected) {
                      return (
                        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                          Cần phân lại nhân sự bị từ chối
                        </span>
                      );
                    }
                    const stats = getSessionStats(activeSession);
                    return (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                          stats.total > 0 && stats.filled === stats.total
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {stats.total > 0 && stats.filled === stats.total
                          ? 'Đã gán đủ'
                          : 'Đang phân công'}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel body: thông tin phiên trước, sau đó phân công */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-4 space-y-5">
              {(() => {
                const detail = sessionDetailsById[activeSession.sessionId];
                if (!detail) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Spin tip="Đang tải chi tiết phiên..." />
                    </div>
                  );
                }

                const assignments = detail.Assignments ?? [];
                const teacherSlots = assignments.filter((a) =>
                  String(a.StaffRole ?? '')
                    .toUpperCase()
                    .includes('TE'),
                );
                const taSlots = assignments.filter((a) =>
                  String(a.StaffRole ?? '')
                    .toUpperCase()
                    .includes('TA'),
                );
                const teamSessionsRaw = detail.TeamSessions ?? [];

                const normalizedTeamSessions = teamSessionsRaw.map((ts) => ({
                  teamId: Number(ts.TeamId ?? 0),
                  teamName: String(ts.TeamName ?? ''),
                  teachersRequired: Math.max(0, Number(ts.TeachersRequired ?? 0) || 0),
                  tasRequired: Math.max(0, Number(ts.TasRequired ?? 0) || 0),
                }));

                const currentTeamSession =
                  currentTeamId != null
                    ? normalizedTeamSessions.find((ts) => ts.teamId === currentTeamId)
                    : undefined;
                const otherTeamSessions =
                  currentTeamId != null
                    ? normalizedTeamSessions.filter((ts) => ts.teamId > 0 && ts.teamId !== currentTeamId)
                    : normalizedTeamSessions;

                const teachersRequired = Math.max(
                  0,
                  Number(currentTeamSession?.teachersRequired ?? detail.TeachersRequired ?? teacherSlots.length) || 0,
                );
                const tasRequired = Math.max(
                  0,
                  Number(currentTeamSession?.tasRequired ?? detail.TasRequired ?? taSlots.length) || 0,
                );

                const editableTeacherSlots = teacherSlots.slice(0, teachersRequired);
                const editableTaSlots = taSlots.slice(0, tasRequired);
                const lockedTeacherSlots = Math.max(0, teacherSlots.length - editableTeacherSlots.length);
                const lockedTaSlots = Math.max(0, taSlots.length - editableTaSlots.length);
                const otherTeamNames = Array.from(
                  new Set(
                    otherTeamSessions
                      .map((ts) => ts.teamName?.trim())
                      .filter((name): name is string => Boolean(name)),
                  ),
                );
                const progressStats = getSessionStats(activeSession);
                const progressTotal = progressStats.total;
                const progressFilled = progressStats.filled;
                const progressRatio =
                  progressTotal === 0 ? 0 : Math.min(1, progressFilled / progressTotal);

                const sessionInfoCard = (
                  <div className="rounded-xl bg-white shadow-sm border border-gray-100">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
                    </div>
                    <div className="px-4 py-3 space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-gray-600">
                        <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Mã yêu cầu:</span>
                        <span className="font-semibold text-sky-600">
                          {selectedRequest?.requestCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Thời gian:</span>
                        <span className="font-medium text-black">
                          {dayjs(activeSession.startAt).format('HH:mm')} -{' '}
                          {dayjs(activeSession.endAt).format('HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Ngày:</span>
                        <span className="font-medium text-black">
                          {dayjs(activeSession.startAt).format('DD/MM/YYYY')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Địa điểm:</span>
                        <span className="font-medium text-black">
                          {activeSession.location || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Giáo viên cần:</span>
                        <span className="font-medium text-black">
                          {teachersRequired}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Trợ giảng cần:</span>
                        <span className="font-medium text-black">
                          {tasRequired}
                        </span>
                      </div>
                      {(lockedTeacherSlots > 0 || lockedTaSlots > 0) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          Phiên này còn slot thuộc team khác, bạn chỉ phân công trong quota team của mình.
                        </div>
                      )}
                    </div>
                  </div>
                );

                const teamQuotaSlots = [...editableTeacherSlots, ...editableTaSlots];
                const teamRejectedAssignments =
                  tab === 'rejected'
                    ? assignments.filter((a) => isAssignmentRejectedStatus(a.Status))
                    : teamQuotaSlots.filter((a) => isAssignmentRejectedStatus(a.Status));

                const requestReasonRaw = selectedRequest?.reason?.trim() ?? '';
                const requestReasonLines =
                  requestReasonRaw.length > 0
                    ? requestReasonRaw.split('\n').filter((line) => line.trim().length > 0)
                    : [];
                const sessionRejectedUi = isSessionAssignmentRejectedStatus(detail.Status);

                return (
                  <>
                    {sessionInfoCard}

                    {tab === 'rejected' &&
                      (requestReasonLines.length > 0 ||
                        teamRejectedAssignments.length > 0 ||
                        sessionRejectedUi) && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50/90 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-orange-100 bg-orange-50">
                          <h3 className="font-semibold text-orange-900 text-sm">
                            {teamRejectedAssignments.length > 0
                              ? 'Phân công cần làm lại'
                              : 'Thông tin từ chối phân công'}
                          </h3>
                          <p className="text-[11px] text-orange-800/90 mt-0.5">
                            {teamRejectedAssignments.length > 0
                              ? 'Các slot dưới đây bị quản lý từ chối; vui lòng chọn lại nhân sự rồi gửi duyệt.'
                              : 'Xem lý do từ quản lý và kiểm tra phân công từng vai trò bên dưới.'}
                          </p>
                        </div>
                        {requestReasonLines.length > 0 && (
                          <div className="px-4 py-3 border-b border-orange-100 bg-white/60">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-900 mb-1.5">
                              Lý do (yêu cầu)
                            </p>
                            <ul className="space-y-1 text-xs text-orange-950 leading-relaxed list-none pl-0">
                              {requestReasonLines.map((line, idx) => (
                                <li key={idx} className="pl-3 border-l-2 border-orange-300">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {teamRejectedAssignments.length === 0 && sessionRejectedUi && (
                          <p className="px-4 py-3 text-xs text-orange-800">
                            Phiên đang ở trạng thái từ chối phân công. Nếu không thấy dòng slot cụ thể,
                            hãy làm mới hoặc kiểm tra phân công từng giảng viên / trợ giảng phía dưới.
                          </p>
                        )}
                      </div>
                    )}

                    {assignments.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs text-amber-700 font-medium">
                          Phiên này chưa có slot phân công (assignment).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {renderSlotPicker(
                          activeSession.sessionId,
                          editableTeacherSlots,
                          'Giáo viên',
                          teachersRequired,
                          'sky',
                          tab === 'rejected',
                        )}
                        {renderLockedSlots('Giáo viên', lockedTeacherSlots, otherTeamNames)}
                        {renderSlotPicker(
                          activeSession.sessionId,
                          editableTaSlots,
                          'Trợ giảng',
                          tasRequired,
                          'amber',
                          tab === 'rejected',
                        )}
                        {renderLockedSlots('Trợ giảng', lockedTaSlots, otherTeamNames)}

                        {progressTotal > 0 && (
                          <div className="pt-1 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                              <span>Tiến độ phân công</span>
                              <span className="tabular-nums">
                                {progressFilled}/{progressTotal}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-500 transition-all duration-300"
                                style={{ width: `${progressRatio * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </>
                );
              })()}
            </div>
                </div>
              </div>
            )}

      {/* Floating staff detail tooltip */}
      {hoveredStaff && (() => {
        const { staff, rect } = hoveredStaff;
        const isSuggested = 'skillMatchCount' in staff && 'assignmentCountIn30Days' in staff;
        if (!isSuggested) return null;
        const s = staff as SuggestedStaff;
        const skills = (s.skills ?? []).map((sk) => sk.skillName).filter(Boolean);
        const maxSkillChips = 3;
        const shownSkills = skills.slice(0, maxSkillChips);
        const moreSkillCount = Math.max(0, skills.length - shownSkills.length);
        const top = rect.top;

        const isTA = String(s.roleName ?? '').toUpperCase().includes('TA') || String(s.roleName ?? '').toUpperCase().includes('ASSIST');
        const roleChip = isTA
          ? { label: 'TA', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
          : { label: 'TE', cls: 'bg-sky-100 text-sky-800 border-sky-200' };

        const frame = isTA
          ? { border: 'border-emerald-200/70', ring: 'ring-emerald-100', grad: 'from-emerald-50/70' }
          : { border: 'border-sky-200/70', ring: 'ring-sky-100', grad: 'from-sky-50/70' };

        const workload = Math.max(0, Number(s.assignmentCountIn30Days ?? 0));
        const workloadMax = 12; // UI scale only
        const workloadPct = Math.max(0, Math.min(100, (workload / workloadMax) * 100));

        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const tooltipW = 304;
        const leftPreferred = rect.left - (tooltipW + 16);
        const left =
          leftPreferred >= 8 ? leftPreferred : Math.min(vw - tooltipW - 8, rect.right + 12);
        return (
          <div
            className={`fixed z-[100] w-[304px] bg-white border ${frame.border} rounded-2xl shadow-2xl pointer-events-none ring-1 ${frame.ring} overflow-hidden`}
            style={{ top: Math.max(8, top), left: Math.max(8, left) }}
          >
            <div className={`px-4 pt-3 pb-3 bg-gradient-to-br ${frame.grad} to-white`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-white shadow-sm">
                    <img
                      src={getAvatarSrc(s.avatarUrl)}
                      alt={s.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-slate-900 truncate">{s.fullName}</div>
                    <div className="text-[12px] text-slate-500 truncate">{s.email || '—'}</div>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${roleChip.cls}`}>
                  {roleChip.label}
                </span>
              </div>
            </div>

            <div className="px-4 py-3.5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Sparkles className="h-4 w-4 text-slate-400" />
                  Kỹ năng
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold">
                  Khớp: {s.skillMatchCount}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {shownSkills.length ? (
                  <>
                    {shownSkills.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                    {moreSkillCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        +{moreSkillCount}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    Workload (30 ngày)
                  </div>
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {workload}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isTA ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'}`}
                    style={{ width: `${workloadPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}