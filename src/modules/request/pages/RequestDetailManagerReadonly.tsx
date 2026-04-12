import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { AlertCircle, AlertTriangle, Calendar, Hash, List, MapPin, X, Paperclip } from 'lucide-react';
import { message } from 'antd';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getRequestStatusInfo, getSessionStatusCode, getSessionStatusInfo, SESSION_STATUS } from '@/constants/status';
import { useRequestDetailManager } from '../hooks/useRequestDetailManager';
import type { RequestLayoutOutletContext, SessionWithFlags } from '../requestDetail.types';
import type { RequestSessionSummary } from '../request';
import { getSessionDisplayTitle } from '../utils/getSessionDisplayTitle';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import sessionService from '../api/sessionApi';

export default function RequestDetailManagerReadonly() {
  const { id } = useParams<{ id: string }>();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();

  const { request, sessions, rightPanel, setRightPanel, loading, uiAssignedTeamIdsBySessionId, refreshDetail } =
    useRequestDetailManager({
      id,
      viewMode,
      refreshRequestSidebar,
    });

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [cancelSessionOpen, setCancelSessionOpen] = useState(false);
  const [cancelSessionReason, setCancelSessionReason] = useState('');
  const [cancelSessionLoading, setCancelSessionLoading] = useState(false);

  const openAttachmentPreview = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    if (!fileUrl) return;
    setAttachmentPreview({ fileName: fileName || 'Tệp đính kèm', fileUrl });
    setAttachmentPreviewOpen(true);
  };

  const getAttachmentMeta = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    const urlOrName = (fileUrl ?? fileName ?? '').toLowerCase();
    const extMatch = urlOrName.match(/\.([a-z0-9]{1,10})(?:\?|#|$)/);
    const ext = extMatch && extMatch.length > 1 ? String(extMatch[1]).toUpperCase() : undefined;

    if (/\.(png|jpg|jpeg|gif|webp)(?:\?|#|$)/.test(urlOrName)) {
      return {
        kind: 'image' as const,
        label: 'Hình ảnh',
        ext,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconClass: 'text-emerald-600',
      };
    }
    if (/\.pdf(?:\?|#|$)/.test(urlOrName)) {
      return {
        kind: 'pdf' as const,
        label: 'PDF',
        ext,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        iconClass: 'text-rose-600',
      };
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
  const isRejected = statusInfo.label === 'Từ chối';
  const sessionCount = sessions.length || request.sessionsRequired || 0;
  const resolvedDetailSession =
    rightPanel?.mode === 'detail'
      ? (sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session)
      : null;
  const canCancelDetailSession = (() => {
    if (!resolvedDetailSession) return false;
    const code = getSessionStatusCode((resolvedDetailSession as any).status);
    if (code == null) return true;
    const blocked = new Set<number>([SESSION_STATUS.ONGOING, SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED]);
    return !blocked.has(code);
  })();

  const openCancelSessionDialog = () => {
    if (!resolvedDetailSession) return;
    setCancelSessionReason('');
    setCancelSessionOpen(true);
  };

  const handleConfirmCancelSession = async () => {
    if (!resolvedDetailSession) return;
    const trimmed = cancelSessionReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do hủy phiên.');
      return;
    }
    try {
      setCancelSessionLoading(true);
      await sessionService.cancel({ sessionId: resolvedDetailSession.sessionId, reason: trimmed });
      message.success('Đã hủy phiên.');
      setCancelSessionOpen(false);
      setCancelSessionReason('');
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Hủy phiên thất bại.';
      message.error(msg);
    } finally {
      setCancelSessionLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-slate-50 overflow-hidden text-black">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain pr-1">
          <div className="w-full min-w-0 space-y-4">
        <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-xl font-bold text-slate-800 truncate min-w-0 flex-1">
              {request.requestName ?? request.requestCode}
            </h5>

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
                  {request.createdAt ? dayjs(request.createdAt).format('DD/MM/YYYY') : dayjs(request.startDate).format('DD/MM/YYYY')}
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

          {isRejected ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-semibold text-rose-700">Lý do từ chối</p>
              <p className="mt-1 text-sm text-rose-900 whitespace-pre-line">
                {request.reason?.trim() || 'Không có lý do cụ thể.'}
              </p>
            </div>
          ) : null}
        </div>

        <Tabs defaultValue="overview" className="space-y-4 text-black">
          <TabsList className="bg-transparent border-0 shadow-none p-0 mb-0">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mb-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Danh sách phiên học</h3>
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Yêu cầu này chưa có danh sách phiên chi tiết.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const teamIds = uiAssignedTeamIdsBySessionId[session.sessionId] ?? [];
                    const teamCount = teamIds.length;
                    const sessionTitle = (session as RequestSessionSummary & { notes?: string }).notes
                      ? `Phiên ${session.sessionNo}: ${(session as RequestSessionSummary & { notes?: string }).notes}`
                      : `Phiên ${session.sessionNo}`;
                    const location = (session as RequestSessionSummary & { location?: string }).location || '—';

                    return (
                      <div
                        key={session.sessionId}
                        role="button"
                        tabIndex={0}
                        onClick={() => setRightPanel({ mode: 'detail', session: session as SessionWithFlags })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setRightPanel({ mode: 'detail', session: session as SessionWithFlags });
                          }
                        }}
                        className="w-full border border-slate-200 rounded-lg bg-white px-4 py-2.5 hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200/70 focus:ring-offset-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-sky-600 font-medium">
                              {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-semibold ${
                                (session as SessionWithFlags).teamAssigned
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {!(session as SessionWithFlags).teamAssigned ? (
                                <AlertCircle className="w-3 h-3 shrink-0" />
                              ) : null}
                              {(session as SessionWithFlags).teamAssigned ? 'Đã gắn đội' : 'Chưa gắn đội'}
                            </span>
                          </div>

                          <span
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 underline-offset-2 select-none"
                            aria-hidden
                          >
                            Chi tiết
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-900 leading-tight">{sessionTitle}</p>

                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{location}</span>
                          {(session as SessionWithFlags).teamAssigned && teamCount > 0 ? (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600">{teamCount} đội</span>
                            </>
                          ) : null}
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
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.badgeClass}`}
                                  >
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

          </div>
        </div>
      </div>

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
                  <p className="text-xs text-slate-600">Trình duyệt không hỗ trợ preview trực tiếp cho loại tệp này.</p>
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

        {rightPanel && rightPanel.mode === 'detail' && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <div className="flex-1 bg-black/30" onClick={() => setRightPanel(null)} />

            <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-2xl border-l">
              <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
                  {resolvedDetailSession ? (
                    <>
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {getSessionDisplayTitle(resolvedDetailSession)}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        Phiên {resolvedDetailSession.sessionNo}
                        {' · '}
                        {dayjs(resolvedDetailSession.startAt).format('HH:mm')} –{' '}
                        {dayjs(resolvedDetailSession.endAt).format('HH:mm')}
                        {' · '}
                        {dayjs(resolvedDetailSession.startAt).format('DD/MM/YYYY')}
                      </p>
                    </>
                  ) : (
                    <h2 className="text-lg font-bold text-slate-900">Phiên {rightPanel.session.sessionNo}</h2>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {(() => {
                      const info = getSessionStatusInfo((resolvedDetailSession as any)?.status);
                      return (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
                          {info.label}
                        </span>
                      );
                    })()}
                  </div>
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
                {request ? (
                  <>
                    <RequestSessionDetailPanel
                      session={sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session}
                      requestId={Number(request.requestId)}
                      requestCode={request.requestCode ?? ''}
                      assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                      showReservedEquipment
                      canEditReservation={false}
                    />
                  </>
                ) : null}

                {resolvedDetailSession ? (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="relative inline-flex group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCancelDetailSession) {
                            message.info('Không đủ điều kiện hủy phiên.');
                            return;
                          }
                          openCancelSessionDialog();
                        }}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 ${
                          canCancelDetailSession
                            ? 'text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2'
                            : 'text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                        Hủy phiên
                      </button>
                      {!canCancelDetailSession ? (
                        <span className="pointer-events-none absolute left-0 bottom-full z-50 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block">
                          Không đủ điều kiện hủy
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Hủy phiên (PUT /sessions/cancel) — cần lý do */}
        <Dialog
          open={cancelSessionOpen}
          onClose={() => !cancelSessionLoading && setCancelSessionOpen(false)}
          title="Hủy phiên"
          description="Nhập lý do hủy. Thao tác không thể hoàn tác."
          className="max-w-md border-0 shadow-2xl"
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cancel-session-reason" className="text-black">
                Lý do <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="cancel-session-reason"
                rows={4}
                value={cancelSessionReason}
                onChange={(e) => setCancelSessionReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng đổi lịch, không còn nhu cầu..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-200"
                disabled={cancelSessionLoading}
                onClick={() => setCancelSessionOpen(false)}
              >
                Đóng
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                disabled={cancelSessionLoading}
                onClick={handleConfirmCancelSession}
              >
                {cancelSessionLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </Button>
            </div>
          </div>
        </Dialog>
    </>
  );
}

