import { useCallback, useEffect, useState } from 'react';


import dayjs from 'dayjs';
import { Dropdown, Popover, Spin } from 'antd';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Hash,
  List,
  Copy,
  Share2,
  GraduationCap,
  Users,
  AlertCircle,
  RotateCcw,
  Plus,
  MoreVertical,
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
import { getSessionStatusInfo } from '@/constants/status';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/api/type';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import {
  getEffectiveStaffMemberId,
  useTeamLeaderAssignmentsPage,
} from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';

type AssignmentRow = NonNullable<NonNullable<SessionDetail['assignments']>[number]>;

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

function getStaffDisplayForSlot(
  effectiveMemberId: number,
  assignment: AssignmentRow,
  suggested: SuggestedStaff[],
): { fullName: string; email: string; avatarUrl?: string | null } {
  const sm = assignment.staffMember;
  if (sm && sm.memberId === effectiveMemberId) {
    const anySm = sm as unknown as { email?: string };
    return {
      fullName: sm.fullName || '—',
      email: sm.userEmail || anySm.email || '',
      avatarUrl: sm.avatarUrl,
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

type TeamLeaderAssignmentsPageProps = {
  tab: TeamLeaderAssignmentsTab;
};

export default function TeamLeaderAssignmentsPage({ tab }: TeamLeaderAssignmentsPageProps) {
  const {
    loading,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    selectedRequest,
    selectedRequestTypeInfo,
    selectedRequestStatusInfo,
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
    assignSelections,
    searchByAssignmentId,
    setSearchByAssignmentId,
    handleSelectStaff,
    handleApplyToOtherSessions,
    getSessionStats,
    handleResetFilters,
  } = useTeamLeaderAssignmentsPage(tab);

  const [hoveredStaff, setHoveredStaff] = useState<{
    staff: SuggestedStaff;
    rect: DOMRect;
  } | null>(null);
  const [staffPickerAssignmentId, setStaffPickerAssignmentId] = useState<number | null>(null);

  useEffect(() => {
    setStaffPickerAssignmentId(null);
  }, [activeSession?.sessionId]);


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
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredStaff({ staff, rect });
    },
    [],
  );

  const renderSlotPicker = (
    sessionId: number,
    slots: NonNullable<SessionDetail['assignments']>,
    roleLabel: string,
    requiredCount: number,
    colorScheme: 'sky' | 'amber',
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
          getEffectiveStaffMemberId(sl.assignmentId, assignSelections, sl.staffMemberId),
        )
        .filter((id) => id > 0);
      const selectedOthers = selectedSameRole.filter((id) => id !== selectedId);
      const searchText = searchByAssignmentId[a.assignmentId]?.toLowerCase() || '';
      return (suggestedByAssignmentId[a.assignmentId] ?? []).filter(
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
        a.assignmentId,
        assignSelections,
        a.staffMemberId,
      );
      const suggestedList = buildSuggestedList(a, selectedId);
      return (
        <div className="w-[min(calc(100vw-2rem),18rem)] p-0.5">
          <Input
            className="h-8 text-xs border-slate-200"
            placeholder={searchPlaceholder}
            value={searchByAssignmentId[a.assignmentId] || ''}
            onChange={(e) =>
              setSearchByAssignmentId((prev) => ({
                ...prev,
                [a.assignmentId]: e.target.value,
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
                    handleSelectStaff(sessionId, a.assignmentId, m.memberId);
                    setStaffPickerAssignmentId(null);
                  }}
                  onMouseEnter={(e) => handleStaffHover(m, e)}
                  onMouseLeave={() => setHoveredStaff(null)}
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
              a.assignmentId,
              assignSelections,
              a.staffMemberId,
            );
            const suggested = suggestedByAssignmentId[a.assignmentId] ?? [];
            const display = getStaffDisplayForSlot(selectedId, a, suggested);
            const isOpen = staffPickerAssignmentId === a.assignmentId;
            const filled = selectedId > 0;

            if (!filled) {
              return (
                <Popover
                  key={a.assignmentId}
                  trigger="click"
                  open={isOpen}
                  onOpenChange={(visible) =>
                    setStaffPickerAssignmentId(visible ? a.assignmentId : null)
                  }
                  placement="bottomLeft"
                  destroyOnHidden
                  content={pickerContent(a)}
                  styles={{ content: { padding: 12 } }}
                >
                  {addSlotTrigger()}
                </Popover>
              );
            }

            return (
              <div
                key={a.assignmentId}
                className={`flex items-center gap-3 rounded-xl border ${accent.cardBorder} ${accent.cardBg} px-3 py-3 shadow-sm`}
              >
                <Popover
                  trigger="click"
                  open={isOpen}
                  onOpenChange={(visible) =>
                    setStaffPickerAssignmentId(visible ? a.assignmentId : null)
                  }
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
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    items: [{ key: 'clear', label: 'Gỡ phân công', danger: true }],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'clear') {
                        handleSelectStaff(sessionId, a.assignmentId, 0);
                        setStaffPickerAssignmentId(null);
                      }
                    },
                  }}
                >
                  <button
                    type="button"
                    className={`shrink-0 rounded-lg p-2 ${accent.menuBtn}`}
                    aria-label="Tùy chọn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </Dropdown>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col p-6 bg-slate-50 overflow-hidden py-0 px-0"
      style={{ height: 'var(--content-height, 100vh)' }}
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
                  <div className="flex items-center gap-1 shrink-0">
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
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRequestTypeInfo && (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        {selectedRequestTypeInfo.label}
                      </span>
                    )}
                    {selectedRequestStatusInfo && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${selectedRequestStatusInfo.className}`}
                      >
                        {selectedRequestStatusInfo.label}
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

              {/* Progress */}
              {(() => {
                let totalSlots = 0;
                let filledSlots = 0;
                selectedRequest.sessions.forEach((s) => {
                  const stats = getSessionStats(s);
                  totalSlots += stats.total;
                  filledSlots += stats.filled;
                });
                const progress = totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Tiến độ phân công</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {filledSlots}/{totalSlots} slot
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
                        const stats = getSessionStats(session);
                        const isActive = activeSession?.sessionId === session.sessionId;
                        const title = `Phiên ${session.sessionNo}`;
                        const sessionStatusInfo = getSessionStatusInfo(session.status);
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
                                <span
                                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${sessionStatusInfo.className}`}
                                >
                                  {sessionStatusInfo.label}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                                    stats.total > 0 && stats.filled === stats.total
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {stats.total === 0 && <AlertCircle className="w-3 h-3 shrink-0" />}
                                  {stats.total === 0
                                    ? 'Chưa có slot'
                                    : stats.filled === stats.total
                                      ? 'Đã gán đủ'
                                      : 'Chưa gán đủ'}
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
                    const stats = getSessionStats(activeSession);
                    return (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          stats.total > 0 && stats.filled === stats.total
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
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

                const assignments = detail.assignments ?? [];
                const teacherSlots = assignments.filter((a) =>
                  String(a.staffRole ?? '')
                    .toUpperCase()
                    .includes('TE'),
                );
                const taSlots = assignments.filter((a) =>
                  String(a.staffRole ?? '')
                    .toUpperCase()
                    .includes('TA'),
                );
                const teachersRequired =
                  (detail.teachersRequired ?? teacherSlots.length) || 0;
                const tasRequired = (detail.tasRequired ?? taSlots.length) || 0;
                const totalSlots = teacherSlots.length + taSlots.length;
                const filledSlots = assignments.filter(
                  (a) =>
                    getEffectiveStaffMemberId(
                      a.assignmentId,
                      assignSelections,
                      a.staffMemberId,
                    ) > 0,
                ).length;
                const progress = totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);

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
                          {detail.teachersRequired ?? teacherSlots.length ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Trợ giảng cần:</span>
                        <span className="font-medium text-black">
                          {detail.tasRequired ?? taSlots.length ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <>
                    {sessionInfoCard}

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
                          teacherSlots,
                          'Giáo viên',
                          teachersRequired,
                          'sky',
                        )}
                        {renderSlotPicker(
                          activeSession.sessionId,
                          taSlots,
                          'Trợ giảng',
                          tasRequired,
                          'amber',
                        )}

                        {totalSlots > 0 && (
                          <div className="pt-1 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                              <span>Tiến độ phân công</span>
                              <span className="tabular-nums">
                                {filledSlots}/{totalSlots}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-500 transition-all duration-300"
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {selectedRequest && selectedRequest.sessions.length > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              className="text-xs font-medium text-[#2197C0] hover:text-[#1978a0] hover:bg-sky-50 rounded-lg px-3 py-1.5 transition-colors"
                              onClick={() =>
                                handleApplyToOtherSessions(activeSession.sessionId)
                              }
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" />
                              Áp dụng cho các phiên khác
                            </button>
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
        const skillNames = s.skills?.map((sk) => sk.skillName).filter(Boolean).join(', ') || '—';
        const top = rect.top;
        const left = rect.left - 220;
        return (
          <div
            className="fixed z-[100] w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl p-3 pointer-events-none"
            style={{ top: Math.max(8, top), left: Math.max(8, left) }}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
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
                <div className="text-xs font-semibold text-slate-900 truncate">{s.fullName}</div>
                <div className="text-[10px] text-slate-500 truncate">{s.email || s.roleName}</div>
              </div>
            </div>
            <div className="text-[11px] space-y-1.5">
              <div>
                <span className="font-medium text-slate-500">Kỹ năng</span>
                <p className="text-slate-800 mt-0.5">{skillNames}</p>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Khớp YC</span>
                <span className="font-semibold text-slate-800">{s.skillMatchCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Buổi (30 ngày)</span>
                <span className="font-semibold text-slate-800">{s.assignmentCountIn30Days}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}