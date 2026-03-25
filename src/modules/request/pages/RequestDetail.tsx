import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X, CheckCircle2, Calendar, Hash, List, MapPin, AlertCircle, Paperclip, Eye, ChevronRight } from 'lucide-react';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getRequestStatusInfo } from '@/constants/status';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { RequestSessionSummary } from '../request';
import RequestDetailTeamPanel from './RequestDetailTeamPanel';
import RequestDetailTeamSummary from './RequestDetailTeamSummary';
import RequestDetailEquipmentPanel from './RequestDetailEquipmentPanel';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { useRequestDetailManager } from '../hooks/useRequestDetailManager';
import type { RequestLayoutOutletContext, SessionWithFlags } from '../requestDetail.types';

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();
  const {
    request,
    sessions,
    rightPanel,
    setRightPanel,
    loading,
    suggestedTeamIdsBySessionId,
    ensureSuggestedTeamIdsForSessions,
    uiAssignedTeamIdsBySessionId,
    assignmentsBySessionId,
    selectedAssignmentIdsBySessionId,
    approveOpen,
    setApproveOpen,
    rejectOpen,
    setRejectOpen,
    rejectReason,
    setRejectReason,
    actionLoading,
    approvingSessionId,
    rejectAssignmentState,
    setRejectAssignmentState,
    rejectAssignmentReason,
    setRejectAssignmentReason,
    createdByMemberId,
    assignedCount,
    handleAssignSession,
    handleAssignAllUi,
    handleClearAllUi,
    handleQuantitiesChange,
    handleApproveClick,
    handleToggleAssignmentSelection,
    handleApproveSelectedAssignments,
    handleOpenRejectAssignment,
    handleConfirmRejectAssignment,
    handleConfirmApprove,
    handleRejectClick,
    handleConfirmReject,
    handleEquipmentSuccess,
  } = useRequestDetailManager({
    id,
    viewMode,
    refreshRequestSidebar,
  });

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(
    null
  );

  const openAttachmentPreview = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    if (!fileUrl) return;
    setAttachmentPreview({
      fileName: fileName || 'Tệp đính kèm',
      fileUrl,
    });
    setAttachmentPreviewOpen(true);
  };

  const getAttachmentMeta = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    const urlOrName = (fileUrl ?? fileName ?? '').toLowerCase();
    const extMatch = urlOrName.match(/\.([a-z0-9]{1,10})(?:\?|#|$)/);
    const ext = extMatch?.[1]?.toUpperCase();

    if (/\.(png|jpg|jpeg|gif|webp)(?:\?|#|$)/.test(urlOrName)) {
      return { kind: 'image' as const, label: 'Hình ảnh', ext, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconClass: 'text-emerald-600' };
    }
    if (/\.pdf(?:\?|#|$)/.test(urlOrName)) {
      return { kind: 'pdf' as const, label: 'PDF', ext, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', iconClass: 'text-rose-600' };
    }

    return {
      kind: 'file' as const,
      label: ext ? `.${ext}` : 'Tệp',
      ext,
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      iconClass: 'text-sky-600',
    };
  };

  if (!id) {
    return <div className="text-sm text-black">Không tìm thấy mã yêu cầu.</div>;
  }

  if (loading && !request) {
    return <div className="text-sm text-black p-4">Đang tải dữ liệu yêu cầu...</div>;
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  const typeInfo = getRequestType({
    subjectId: request.subjectId,
    courseId: request.courseId,
    eventId: request.eventId,
  });
  const statusInfo = getRequestStatusInfo(request.status);
  const sessionCount = sessions.length || request.sessionsRequired || 0;

  return (
    <div className="bg-slate-50" style={{ minHeight: 'calc(var(--content-height, 100vh) - 64px)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-0 mb-0 space-y-4 text-black">
        {/* HEADER CARD — title + 3 icon (sao chép, chia sẻ, lịch) + 2 pill cùng hàng; info 3 cột */}
        <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
          {/* Hàng 1: Tên request, 3 icon, 2 pill */}
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-xl font-bold text-slate-800 truncate min-w-0 flex-1">
              {request.requestName ?? request.requestCode}
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
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                {typeInfo.label}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>
          {/* Info: Mã yêu cầu, Ngày gửi, Số lượng phiên */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Mã yêu cầu</p>
                <p className="font-semibold text-sm text-slate-900 mt-0.5">{request.requestCode}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Ngày gửi</p>
                <p className="font-semibold text-sm text-slate-900 mt-0.5">
                  {request.createdAt
                    ? dayjs(request.createdAt).format('DD/MM/YYYY')
                    : dayjs(request.startDate).format('DD/MM/YYYY')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <List className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Số lượng phiên</p>
                <p className="font-semibold text-sm text-slate-900 mt-0.5">{sessionCount} phiên</p>
              </div>
            </div>
          </div>
        </div>

      {/* MAIN CONTENT */}
      {viewMode === 'assignment' ? (
        <div className="space-y-4 text-black">
          <div className="mb-2 sticky top-4 z-10 flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-800 min-w-0">
              <Badge className="shrink-0 bg-sky-100 text-sky-800 border-0 text-[11px]">
                Duyệt phân công
              </Badge>
              <span className="text-gray-800">
                Xem các phiên thuộc yêu cầu này và duyệt phân công cho từng phiên sau khi Team
                Leader đã gán đủ nhân sự.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Yêu cầu này chưa có phiên để phân công. Vui lòng kiểm tra lại danh sách phiên.
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const rows = assignmentsBySessionId[session.sessionId] ?? [];
                  const pendingCount = rows.filter((r) => {
                    const statusText = (r.status || '').toUpperCase();
                    return statusText !== 'APPROVED' && statusText !== '2' && statusText !== 'REJECTED' && statusText !== '3';
                  }).length;
                  return (
                    <div
                      key={session.sessionId}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 space-y-3 bg-sky-50/40"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Phiên {session.sessionNo}
                            </span>
                            <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold">
                              {session.status || 'Assigning'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {dayjs(session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                            {dayjs(session.endAt).format('DD/MM/YYYY HH:mm')}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <span className="font-medium text-slate-800">Giảng viên yêu cầu:</span>{' '}
                            {session.teachersRequired ?? 1}
                            {' · '}
                            <span className="font-medium text-slate-800">Trợ giảng yêu cầu:</span>{' '}
                            {session.tasRequired ?? 1}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">
                            Pending:{' '}
                            <span className="font-semibold text-slate-800">
                              {pendingCount}
                            </span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full border-slate-300 text-slate-700 text-[11px] px-3"
                            onClick={() => setRightPanel({ mode: 'assignment', session })}
                          >
                            Chi tiết phân công
                          </Button>
                        </div>
                      </div>

                      {/* Danh sách giảng viên / trợ giảng được hiển thị trong panel Chi tiết phân công, không hiển thị trực tiếp ở đây */}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4 text-black">
          <TabsList className="bg-transparent border-0 shadow-none p-0 mb-0">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        
            <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mb-0">
          {/* WARNING BOX + PROGRESS — Figma: cam, tiến độ gắn đội, nút Từ chối */}
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-amber-600 shrink-0 mt-0.5">⚠</span>
                <div>
                  <p className="text-sm text-amber-800">
                    Vui lòng gắn đội cho tất cả các phiên để có thể duyệt yêu cầu. Hiện tại còn{' '}
                    {Math.max(0, sessions.length - assignedCount)} phiên chưa được gắn đội phụ trách.
                  </p>
                  <span className="text-xs font-medium text-amber-700 mt-1">Xem phiên chưa gắn</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Tiến độ gắn đội</span>
                <span className="text-sm font-semibold text-slate-800 tabular-nums">
                  {assignedCount}/{sessions.length || 0} phiên
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{
                    width: sessions.length === 0 ? '0%' : `${(assignedCount / sessions.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 bg-white"
                disabled={String(request.status ?? '').toLowerCase() !== 'pending'}
                onClick={handleRejectClick}
              >
                <X className="w-4 h-4 mr-1.5" />
                Từ chối yêu cầu
              </Button>
              <Button
                type="button"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  String(request.status ?? '').toLowerCase() !== 'pending' ||
                  sessions.length === 0 ||
                  assignedCount !== sessions.length
                }
                onClick={handleApproveClick}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Duyệt yêu cầu
              </Button>
              <span className="text-xs text-slate-500">
                {assignedCount !== sessions.length || sessions.length === 0
                  ? 'Cần gắn đội cho tất cả các phiên trước khi duyệt.'
                  : ''}
              </span>
            </div>
          </div>

          {/* DANH SÁCH PHIÊN HỌC — kích thước gọn, cân với header request */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Danh sách phiên học</h3>
              <Button
                onClick={() =>
                  sessions.some((s) => !s.equipmentReserved) && setRightPanel({ mode: 'equipment' })
                }
                disabled={sessions.every((s) => s.equipmentReserved)}
                className="gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50 text-[11px] h-8 rounded-lg px-3"
              >
                <Plus size={14} />
                Đặt trước thiết bị
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Yêu cầu này chưa có danh sách phiên chi tiết.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const teamIds = uiAssignedTeamIdsBySessionId[session.sessionId] ?? [];
                  const teamCount = teamIds.length;
                  const sessionTitle =
                    (session as RequestSessionSummary & { notes?: string }).notes
                      ? `Phiên ${session.sessionNo}: ${(session as RequestSessionSummary & { notes?: string }).notes}`
                      : `Phiên ${session.sessionNo}`;
                  const location = (session as RequestSessionSummary & { location?: string }).location || '—';
                  return (
                    <div
                      key={session.sessionId}
                      className="w-full border border-slate-200 rounded-lg bg-white px-4 py-2.5 hover:border-slate-300 hover:bg-slate-50/50 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-sky-600 font-medium">
                            {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
                          </span>
                          <span className="text-xs text-slate-500">Dạy học</span>
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-semibold ${
                              session.teamAssigned
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {!session.teamAssigned && <AlertCircle className="w-3 h-3 shrink-0" />}
                            {session.teamAssigned ? 'Đã gắn đội' : 'Chưa gắn đội'}
                          </span>
                        </div>
                        <TableTextAction
                          onClick={() => setRightPanel({ mode: 'detail', session })}
                          className="text-xs text-sky-600 hover:text-sky-700 shrink-0"
                          chevronClassName="w-3.5 h-3.5"
                        />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 leading-tight">{sessionTitle}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{location}</span>
                        {session.teamAssigned && teamCount > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{teamCount} đội</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </TabsContent>

         

          <TabsContent value="attachments">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs">
              {request.attachments?.length ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Tệp đính kèm yêu cầu</p>
                  <div className="space-y-1">
                    {request.attachments.map((att, idx) => (
                      <button
                        key={att.attachmentId ?? att.fileUrl ?? idx}
                        type="button"
                        className="group w-full text-left rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 hover:bg-slate-50/70 transition flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-sky-200/70 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={() => openAttachmentPreview(att.fileName, att.fileUrl)}
                        disabled={!att.fileUrl}
                        aria-label={`Mở tệp đính kèm ${att.fileName || `#${idx + 1}`}`}
                      >
                        {(() => {
                          const meta = getAttachmentMeta(att.fileName, att.fileUrl);
                          const fileLabel = att.fileName || `Tệp đính kèm #${idx + 1}`;
                          return (
                            <>
                              <div
                                className={`shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center ${meta.iconClass}`}
                                aria-hidden
                              >
                                <Paperclip className={`w-4 h-4 ${meta.iconClass}`} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-900 truncate" title={fileLabel}>
                                    {fileLabel}
                                  </span>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.badgeClass}`}>
                                    {meta.kind === 'file' ? meta.ext ?? 'Tệp' : meta.label}
                                  </span>
                                </div>

                              </div>

                            </>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Chưa có tệp đính kèm cho yêu cầu này.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* RIGHT SIDEBAR SLIDE-OVER FOR TEAM / EQUIPMENT */}
      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          {/* Panel: thu hẹp khi xem chi tiết phiên để cân bằng, đồng bộ với sidebar detail khác (vd. BorrowingDetailSidebar 560px) */}
          <div
            className={`w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden ${
              rightPanel.mode === 'detail' ? 'max-w-xl' : 'max-w-2xl'
            } border-l`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                {rightPanel.mode !== 'detail' && (
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {rightPanel.mode === 'team' ? 'Đang gán đội' : 'Đặt trước thiết bị'}
                  </p>
                )}
                {rightPanel.mode === 'equipment' ? (
                  <>
                    <h2 className="text-base font-semibold text-black">Chọn phiên & thiết bị</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Đặt thiết bị cho một hoặc nhiều phiên
                    </p>
                  </>
                ) : rightPanel.mode === 'detail' ? (
                  <>
                    <h2 className="text-lg font-bold text-slate-900">
                      Phiên {rightPanel.session.sessionNo}
                      {(rightPanel.session as RequestSessionSummary & { notes?: string }).notes
                        ? `: ${(rightPanel.session as RequestSessionSummary & { notes?: string }).notes}`
                        : ''}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-medium text-sky-600">Dạy học</span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          rightPanel.session.teamAssigned
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {rightPanel.session.teamAssigned ? 'Đã gắn đội' : 'Chưa gắn đội'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-black">
                      Phiên {rightPanel.session.sessionNo}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {dayjs(rightPanel.session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                      {dayjs(rightPanel.session.endAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRightPanel(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
              {rightPanel.mode === 'detail' && request && (
                <>
                  {/* Thông tin phiên + Danh sách thiết bị: luôn hiển thị, kể cả khi đã gắn đội / đã duyệt */}
                <RequestSessionDetailPanel
                  // Tránh trường hợp rightPanel.session bị "chụp" lúc chưa có reservationId.
                  // Luôn ưu tiên session mới nhất từ state `sessions`.
                  session={
                    sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                  }
                  requestCode={request.requestCode ?? ''}
                />
                  <div className="mt-6">
                    {rightPanel.session.teamAssigned ? (
                      <RequestDetailTeamSummary
                        session={rightPanel.session}
                        assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                      />
                    ) : (
                      <RequestDetailTeamPanel
                        session={rightPanel.session}
                        sessionsCount={sessions.length}
                        allSessions={sessions.map((s) => ({
                          sessionId: s.sessionId,
                          teachersRequired: (s as SessionWithFlags).teachersRequired ?? null,
                          tasRequired: (s as SessionWithFlags).tasRequired ?? null,
                        }))}
                        suggestedTeamIdsBySessionId={suggestedTeamIdsBySessionId}
                        currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                        onEnsureSuggestedTeamIdsForSessions={ensureSuggestedTeamIdsForSessions}
                        onClose={() => setRightPanel(null)}
                        onAssignSession={handleAssignSession}
                        onAssignAllUi={handleAssignAllUi}
                        onClearAllUi={handleClearAllUi}
                        onQuantitiesChange={handleQuantitiesChange}
                      />
                    )}
                  </div>
                </>
              )}
              {rightPanel.mode === 'team' && (
                <RequestDetailTeamPanel
                  session={rightPanel.session}
                  sessionsCount={sessions.length}
                  allSessions={sessions.map((s) => ({
                    sessionId: s.sessionId,
                    teachersRequired: (s as SessionWithFlags).teachersRequired ?? null,
                    tasRequired: (s as SessionWithFlags).tasRequired ?? null,
                  }))}
                  suggestedTeamIdsBySessionId={suggestedTeamIdsBySessionId}
                  currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                  onEnsureSuggestedTeamIdsForSessions={ensureSuggestedTeamIdsForSessions}
                  onClose={() => setRightPanel(null)}
                  onAssignSession={handleAssignSession}
                  onAssignAllUi={handleAssignAllUi}
                  onClearAllUi={handleClearAllUi}
                  onQuantitiesChange={handleQuantitiesChange}
                />
              )}
              {rightPanel.mode === 'assignment' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
                    </div>
                    <div className="px-4 py-3 space-y-1 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Thời gian:</span>{' '}
                        {dayjs(rightPanel.session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                        {dayjs(rightPanel.session.endAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                      <p>
                        <span className="font-medium">Giảng viên yêu cầu:</span>{' '}
                        {rightPanel.session.teachersRequired ?? 1}
                        {' · '}
                        <span className="font-medium">Trợ giảng yêu cầu:</span>{' '}
                        {rightPanel.session.tasRequired ?? 1}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">Danh sách phân công</h3>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          approvingSessionId === rightPanel.session.sessionId ||
                          (assignmentsBySessionId[rightPanel.session.sessionId] ?? []).every((r) => {
                            const statusText = (r.status || '').toUpperCase();
                            return (
                              statusText === 'APPROVED' ||
                              statusText === '2' ||
                              statusText === 'REJECTED' ||
                              statusText === '3'
                            );
                          })
                        }
                        onClick={() => void handleApproveSelectedAssignments(rightPanel.session.sessionId)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {approvingSessionId === rightPanel.session.sessionId
                          ? 'Đang duyệt...'
                          : 'Duyệt tất cả phân công'}
                      </Button>
                    </div>
                    <div className="px-4 py-3 space-y-1 text-sm">
                      {(() => {
                        const rows = assignmentsBySessionId[rightPanel.session.sessionId] ?? [];
                        if (!rows.length) {
                          return (
                            <p className="text-xs text-gray-500">
                              Phiên này hiện chưa có assignment nào (hoặc chưa được Team Leader phân công).
                            </p>
                          );
                        }
                        const selectedIds =
                          selectedAssignmentIdsBySessionId[rightPanel.session.sessionId] ?? [];
                        return rows.map((row) => {
                          const checked = selectedIds.includes(row.assignmentId);
                          const isTeacher = row.staffRole === 'TE' || row.staffRole === 'TEACHER';
                          const statusText = (row.status || '').toUpperCase();
                          const isApproved = statusText === 'APPROVED' || statusText === '2';
                          const isRejected = statusText === 'REJECTED' || statusText === '3';
                          const canReview = !isApproved && !isRejected;
                          return (
                            <div
                              key={row.assignmentId}
                              className={`flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg transition-colors ${
                                checked && canReview ? 'bg-sky-50' : 'bg-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    isTeacher ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {isTeacher ? 'Giảng viên' : 'Trợ giảng'}
                                </span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                                    {row.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={row.avatarUrl}
                                        alt={row.fullName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/img/avatar.png';
                                        }}
                                      />
                                    ) : (
                                      (row.fullName || 'N')[0]
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-900 truncate">
                                      {row.fullName || '—'}
                                    </p>
                                    {row.email && (
                                      <p className="text-[11px] text-slate-500 truncate">{row.email}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isApproved && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] px-2 py-0.5 font-semibold">
                                    Đã duyệt
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] px-2 py-0.5 font-semibold">
                                    Đã từ chối
                                  </span>
                                )}
                                {canReview && (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] px-2 py-0.5"
                                      onClick={() =>
                                        handleOpenRejectAssignment(rightPanel.session.sessionId, row)
                                      }
                                    >
                                      Từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleAssignmentSelection(
                                          rightPanel.session.sessionId,
                                          row.assignmentId
                                        )
                                      }
                                      className={`rounded-lg border text-[11px] px-2 py-0.5 ${
                                        checked
                                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                      }`}
                                      disabled={!canReview}
                                    >
                                      {checked ? 'Bỏ chọn' : 'Chọn duyệt'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {rightPanel.mode === 'equipment' && (
                <RequestDetailEquipmentPanel
                  sessions={sessions
                    .filter((s) => !s.equipmentReserved)
                    .map((s) => ({
                      sessionId: s.sessionId,
                      sessionNo: s.sessionNo,
                      startAt: s.startAt,
                      endAt: s.endAt,
                    }))}
                  createdByMemberId={createdByMemberId}
                  onClose={() => setRightPanel(null)}
                  onSuccess={handleEquipmentSuccess}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popup preview file đính kèm */}
      <Dialog
        open={attachmentPreviewOpen}
        onClose={() => setAttachmentPreviewOpen(false)}
        title={attachmentPreview?.fileName ?? 'Tệp đính kèm'}
        description="Xem nội dung tệp đính kèm"
        className="max-w-4xl border-0 shadow-2xl"
      >
        {attachmentPreview?.fileUrl ? (
          (() => {
            const url = attachmentPreview.fileUrl;
            const lower = url.toLowerCase();
            const isImage = /\.(png|jpg|jpeg|gif|webp)$/.test(lower);
            const isPdf = /\.pdf(\?|#|$)/.test(lower);

            if (isImage) {
              return (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={attachmentPreview.fileName}
                    className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              );
            }

            if (isPdf) {
              return (
                <div className="space-y-3">
                  <iframe
                    src={url}
                    title={attachmentPreview.fileName}
                    className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Trình duyệt không hỗ trợ preview trực tiếp cho loại tệp này.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 px-3 py-2 hover:bg-sky-100"
                >
                  Mở tệp
                </a>
              </div>
            );
          })()
        ) : (
          <div className="text-xs text-slate-500">Không có nội dung để hiển thị.</div>
        )}
      </Dialog>

      {/* Dialog từ chối assignment */}
      <Dialog
        open={rejectAssignmentState.open}
        onClose={() => {
          setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
          setRejectAssignmentReason('');
        }}
        title="Từ chối phân công"
        description={
          rejectAssignmentState.displayName
            ? `Assignment của: ${rejectAssignmentState.displayName}`
            : undefined
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reject-assignment-reason" className="text-black text-xs">
            Lý do từ chối
          </Label>
          <textarea
            id="reject-assignment-reason"
            className="w-full min-h-[72px] rounded-lg border border-slate-200 px-3 py-2 text-xs text-black outline-none focus:ring-1 focus:ring-rose-400"
            placeholder="Nhập lý do từ chối phân công này..."
            value={rejectAssignmentReason}
            onChange={(e) => setRejectAssignmentReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
              setRejectAssignmentReason('');
            }}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs px-4"
            onClick={handleConfirmRejectAssignment}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </Dialog>

      {/* Duyệt yêu cầu — form gọn, cùng tone với action bar */}
      <Dialog
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        title="Xác nhận duyệt yêu cầu"
        description="Yêu cầu sẽ chuyển sang trạng thái đã duyệt."
        className="max-w-md border-0 shadow-2xl"
      >
        {request && (
          <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Mã yêu cầu</span>
              <span className="font-medium text-gray-900">{request.requestCode}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Phiên đã gán đội</span>
              <span className="font-medium text-gray-900">
                {assignedCount}/{sessions.length || 0}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-5 mt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-gray-200"
            disabled={actionLoading}
            onClick={() => setApproveOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="rounded-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            disabled={actionLoading}
            onClick={handleConfirmApprove}
          >
            {actionLoading ? (
              'Đang xử lý...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Duyệt
              </>
            )}
          </Button>
        </div>
      </Dialog>

      {/* Từ chối yêu cầu — bắt buộc lý do */}
      <Dialog
        open={rejectOpen}
        onClose={() => !actionLoading && setRejectOpen(false)}
        title="Từ chối yêu cầu"
        description="Nhập lý do từ chối. Thao tác không thể hoàn tác."
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
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Lịch trình trùng với phiên khác..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={actionLoading}
              onClick={() => setRejectOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={actionLoading}
              onClick={handleConfirmReject}
            >
              {actionLoading ? 'Đang xử lý...' : 'Từ chối'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}

