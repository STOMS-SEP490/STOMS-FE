// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useCallback, useEffect, useMemo, useState } from 'react';


import dayjs from 'dayjs';
import { Spin } from 'antd';
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
  Search,
} from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import RequestCard from '@/shared/components/request/RequestCard';
import { getTeamLeaderRequestStatusInfo } from '@/constants/status';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/api/type';
import { useTeamLeaderAssignmentsPage } from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';

export default function TeamLeaderAssignmentsPage() {
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
    activeTab,
    setActiveTab,
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
    autoAssigning,
    applyingToOtherSessions,
    getSessionStats,
  } = useTeamLeaderAssignmentsPage();

  const [hoveredStaff, setHoveredStaff] = useState<{
    staff: SuggestedStaff;
    rect: DOMRect;
  } | null>(null);
  // (logic/data layer moved to hook)

  const isTLNeedsAction = (req: { sessions?: Array<{ status?: string | number | null }> } | null) => {
    // TL cần thao tác khi trong request vẫn còn session ở trạng thái "chờ phân công".
    const sessions = req?.sessions ?? [];
    if (!sessions.length) return false;
    return sessions.some((s) => {
      const st = String(s.status ?? '').toLowerCase();
      return st === 'assigning' || st === 'pending';
    });
  };

  // Sort phiên học theo trạng thái để mặc định hiển thị đúng thứ tự (áp dụng cho detail).
  const sortedDetailSessions = useMemo(() => {
    const sessions = selectedRequest?.sessions ?? [];
    const priorityOfStatus = (status?: string | number | null) => {
      const s = String(status ?? '').toLowerCase();
      if (s.includes('pending') || s.includes('chờ')) return 0;
      if (s.includes('approved') || s.includes('đã duyệt')) return 1;
      if (s.includes('assignment_rejected') || s.includes('phân công bị từ chối')) return 2;
      if (s.includes('assigning') || s.includes('đang phân công')) return 2;
      if (s.includes('assigned') || s.includes('đã phân công')) return 3;
      if (s.includes('ongoing') || s.includes('đang diễn')) return 4;
      if (s.includes('completed') || s.includes('hoàn thành')) return 5;
      if (s.includes('cancelled') || s.includes('đã hủy')) return 6;
      return 999;
    };

    return [...sessions].sort((a, b) => {
      const pa = priorityOfStatus(a.status);
      const pb = priorityOfStatus(b.status);
      if (pa !== pb) return pa - pb;
      const ta = a.startAt ? new Date(a.startAt).getTime() : NaN;
      const tb = b.startAt ? new Date(b.startAt).getTime() : NaN;
      if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
      return (a.sessionNo ?? 0) - (b.sessionNo ?? 0);
    });
  }, [selectedRequest]);

  // Tránh tooltip detail bị "dính" lại khi đổi request hoặc đóng panel.
  useEffect(() => {
    setHoveredStaff(null);
  }, [selectedRequestId, activeSession?.sessionId]);


  const renderMemberOption = (m: SuggestedStaff) => {
    const subText = m.email ?? m.roleName ?? '—';
    return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
        {m.avatarUrl ? (
          <img
            src={m.avatarUrl}
            alt={m.fullName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/img/avatar.png';
            }}
          />
        ) : (
          (m.fullName || 'N')[0]
        )}
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
    slots: NonNullable<SessionDetail['assignments']>,
    roleLabel: string,
    requiredCount: number,
    colorScheme: 'sky' | 'amber',
    sessionId: number,
  ) => {
    const borderColor = colorScheme === 'sky' ? 'border-sky-100' : 'border-amber-100';
    const bgGradient =
      colorScheme === 'sky'
        ? 'bg-gradient-to-br from-sky-50/50 to-white'
        : 'bg-gradient-to-br from-amber-50/50 to-white';
    const badgeCls =
      colorScheme === 'sky'
        ? 'bg-sky-100 text-sky-800 border-sky-200'
        : 'bg-amber-100 text-amber-800 border-amber-200';
    const slotBorder = colorScheme === 'sky' ? 'border-sky-100' : 'border-amber-100';
    const placeholder = colorScheme === 'sky' ? 'Chọn giảng viên' : 'Chọn trợ giảng';
    const searchPlaceholder = colorScheme === 'sky' ? 'Tìm giảng viên...' : 'Tìm trợ giảng...';

                        return (
      <div className={`rounded-xl border ${borderColor} ${bgGradient} p-3 space-y-2 shadow-sm`}>
                                <div className="flex items-center justify-between">
          <Badge
            className={`px-2 py-0.5 rounded-lg ${badgeCls} text-[11px] font-semibold border`}
          >
            {roleLabel}
                                  </Badge>
          <span className="text-[11px] font-medium text-slate-600">Cần: {requiredCount}</span>
                                </div>
                                <div className="space-y-2">
          {slots.length === 0 && (
            <div className="text-[11px] text-slate-500">Chưa có slot phân công.</div>
          )}
          {slots.map((a) => {
            const selectedId = assignSelections[a.assignmentId] ?? (a.staffMemberId ?? 0);
            const selectedSameRole = slots
              .map((sl) => assignSelections[sl.assignmentId] ?? (sl.staffMemberId ?? 0))
                                      .filter((id) => id > 0);
            const selectedOthers = selectedSameRole.filter((id) => id !== selectedId);
            const searchText = searchByAssignmentId[a.assignmentId]?.toLowerCase() || '';

            const suggestedList = (suggestedByAssignmentId[a.assignmentId] ?? []).filter(
              (m: SuggestedStaff) =>
                (!selectedOthers.includes(m.memberId) || m.memberId === selectedId) &&
                (!searchText ||
                  m.fullName?.toLowerCase().includes(searchText) ||
                  m.roleName?.toLowerCase().includes(searchText) ||
                  m.email?.toLowerCase().includes(searchText)),
            );

                                    return (
              <div key={a.assignmentId} className={`rounded-lg bg-white px-3 py-2 border ${slotBorder} shadow-sm`}>
                                        <Select
                                          value={selectedId ? String(selectedId) : undefined}
                  onValueChange={(value) => handleSelectStaff(sessionId, a.assignmentId, Number(value))}
                                        >
                                          <SelectTrigger className="h-9 w-full text-xs border-none shadow-none px-0">
                    <SelectValue placeholder={placeholder} />
                                          </SelectTrigger>
                                          <SelectContent className="p-1.5">
                                            <div className="px-1 pb-1 pt-1">
                                              <div className="relative">
                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <Input
                                                  placeholder={searchPlaceholder}
                                                  className="h-8 text-xs pl-8 border-slate-200 bg-slate-50/70 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-sky-400"
                                                  value={searchByAssignmentId[a.assignmentId] || ''}
                                                  onChange={(e) =>
                                                    setSearchByAssignmentId((prev) => ({
                                                      ...prev,
                                                      [a.assignmentId]: e.target.value,
                                                    }))
                                                  }
                                                />
                                              </div>
                                            </div>
                                            {suggestedList.map((m: SuggestedStaff) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5 rounded-md"
                        onMouseEnter={(e) => handleStaffHover(m, e)}
                        onMouseLeave={() => setHoveredStaff(null)}
                                              >
                                                {renderMemberOption(m)}
                                              </SelectItem>
                                            ))}
                                            {suggestedList.length === 0 && (
                                              <div className="px-2 py-2 text-[11px] text-slate-500">
                                                Không tìm thấy giảng viên phù hợp.
                                              </div>
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
    );
  };


  const handleResetFilters = () => {
    setSearch('');
    setOnlyNeedsAction(false);
    setStatusFilter('assigning');
  };

  return (
    <div
      className="flex flex-col p-6 gap-1 bg-slate-50 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
          <Spin tip="Đang tải dữ liệu phân công cho team..." />
        </div>
      )}

      {/* HEADER (đồng bộ với /manager/requests) */}
      <div className="bg-white px-6 py-4 mb-2 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Trung tâm phê duyệt</h2>
        <p className="text-xs text-gray-500">Quản lý phê duyệt yêu cầu và phê duyệt phân công nhân sự</p>
      </div>

      {/* TABS (đồng bộ 2 tab kiểu /manager/requests) */}
      <div className="flex justify-between items-center mb-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const next = v as typeof activeTab;
            setActiveTab(next);
            // Reset bộ lọc phụ theo tab để UI luôn đúng nghĩa.
            setOnlyNeedsAction(false);
            setStatusFilter(next === 'assigning' ? 'assigning' : 'all');
            setActiveSession(null);
          }}
        >
          <TabsList className="bg-transparent border-0 shadow-none p-0 h-8 gap-3">
            <TabsTrigger
              value="assigning"
              className="h-7 rounded-none text-xs px-0 data-[state=active]:font-semibold data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-sky-500"
            >
              Yêu cầu chờ phân công
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="h-7 rounded-none text-xs px-0 data-[state=active]:font-semibold data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-sky-500"
            >
              Yêu cầu bị từ chối
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex justify-start gap-3 mb-2 flex-wrap">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
          </Button>

          {activeTab === 'assigning' && (
            <div className="flex items-center space-x-2">
              <Switch
                className="!rounded-[15px]"
                checked={onlyNeedsAction}
                onCheckedChange={setOnlyNeedsAction}
              />
              <p className="text-black whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</p>
            </div>
          )}
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
                showNeedsAction={isTLNeedsAction(r)}
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
        <div className="flex-1 min-w-0 min-h-0">
          <div className="h-full overflow-y-auto no-scrollbar pr-1">
            {!selectedRequest ? (
              <div className="p-6 text-sm text-gray-500">
                Chọn một yêu cầu ở danh sách bên trái để xem chi tiết và phân công.
              </div>
            ) : (
              <div className="space-y-4">
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Danh sách phiên học</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedRequest.sessions.length} phiên trong yêu cầu này
                    </p>
                  </div>
                  <div />
                </div>
                <div>
                  {selectedRequest.sessions.length === 0 ? (
                    <p className="text-xs text-slate-500 py-10 text-center">
                      Yêu cầu này chưa có phiên nào gán cho team.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sortedDetailSessions.map((session) => {
                        const stats = getSessionStats(session);
                        const isActive = activeSession?.sessionId === session.sessionId;
                        const title = `Phiên ${session.sessionNo}`;
                        const normalizedSessionStatus = String(session.status ?? '')
                          .toLowerCase()
                          .replace(/\s|-/g, '_');
                        const isRejectedTab = activeTab === 'rejected';
                        const isSessionRejected =
                          normalizedSessionStatus === 'assignment_rejected' ||
                          normalizedSessionStatus === 'assignmentrejected' ||
                          normalizedSessionStatus.includes('assignment_reject') ||
                          normalizedSessionStatus.includes('rejected') ||
                          normalizedSessionStatus.includes('từ_chối') ||
                          isRejectedTab;

                        const rejectedSlotsCount = (stats.assignments ?? []).filter((a) => {
                          const st = String(a.status ?? '')
                            .toLowerCase()
                            .replace(/\s|-/g, '_');
                          return st.includes('reject');
                        }).length;
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
                                {isSessionRejected ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border bg-rose-50 text-rose-700 border-rose-200"
                                  >
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    {rejectedSlotsCount > 0 ? `${rejectedSlotsCount} slot từ chối` : 'Cần gán người lại'}
                                  </span>
                                ) : (
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
                                )}
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

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-4 space-y-4">
              {/* Session info */}
              <div className="rounded-xl bg-white shadow-sm border border-gray-100">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
                </div>
                <div className="px-4 py-3 space-y-3 text-sm">
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
                    <span className="font-medium text-black">{activeSession.location || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-500">Mã yêu cầu:</span>
                    <span className="font-semibold text-sky-600">
                      {selectedRequest?.requestCode}
                    </span>
                  </div>
                  {(() => {
                    const detail = sessionDetailsById[activeSession.sessionId];
                    return (
                      <>
                        <div className="flex items-center gap-3 text-gray-600">
                          <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-500">Giảng viên cần:</span>
                          <span className="font-medium text-black">
                            {detail?.teachersRequired ?? '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Users className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-gray-500">Trợ giảng cần:</span>
                          <span className="font-medium text-black">
                            {detail?.tasRequired ?? '—'}
                          </span>
                        </div>

                        {activeTab === 'rejected' && detail?.notes && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
                            <div className="text-[11px] font-semibold text-amber-800">Lý do</div>
                            <div className="text-[11px] text-amber-700 whitespace-pre-wrap mt-1">
                              {detail.notes}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Assignment slots */}
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
                  (a) => !!(assignSelections[a.assignmentId] || a.staffMemberId),
                ).length;
                const progress = totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);

                return (
                  <div className="space-y-3">
                    {assignments.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs text-amber-700 font-medium">
                          Phiên này chưa có slot phân công (assignment).
                        </p>
                      </div>
                    ) : (
                      <>
                        {renderSlotPicker(
                          teacherSlots,
                          'Giảng viên',
                          teachersRequired,
                          'sky',
                          activeSession.sessionId,
                        )}
                        {renderSlotPicker(taSlots, 'Trợ giảng', tasRequired, 'amber', activeSession.sessionId)}

                        {/* Progress */}
                              {totalSlots > 0 && (
                          <div className="pt-3 mt-1 border-t border-slate-100 space-y-2">
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

                        {/* Apply to other sessions */}
                        {assignments.length > 0 &&
                          selectedRequest &&
                          selectedRequest.sessions.length > 1 && (
                            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                                <button
                                  type="button"
                                className="text-xs font-medium text-[#2197C0] hover:text-[#1978a0] hover:bg-sky-50 rounded-lg px-3 py-1.5 transition-colors"
                                onClick={() =>
                                  handleApplyToOtherSessions(activeSession.sessionId)
                                }
                                  disabled={autoAssigning || applyingToOtherSessions}
                              >
                                <RotateCcw className="w-3 h-3 inline mr-1" />
                                Áp dụng cho các phiên khác
                                </button>
                              </div>
                          )}
                      </>
                            )}
                          </div>
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
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500">{(s.fullName || 'N')[0]}</span>
        )}
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
