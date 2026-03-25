import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  AlertCircle,
  Calendar,
  Hash,
  List,
  MapPin,
  X,
} from 'lucide-react';
import { Paperclip, Eye, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getRequestStatusInfo } from '@/constants/status';
import { useRequestDetailManager } from '../hooks/useRequestDetailManager';
import type { RequestLayoutOutletContext, SessionWithFlags } from '../requestDetail.types';
import type { RequestSessionSummary } from '../request';
import { Dialog } from '@/shared/components/ui/dialog';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import RequestDetailTeamSummary from './RequestDetailTeamSummary';

export default function RequestDetailPC() {
  const { id } = useParams<{ id: string }>();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();

  const { request, sessions, rightPanel, setRightPanel, loading, uiAssignedTeamIdsBySessionId } =
    useRequestDetailManager({
      id,
      viewMode,
      refreshRequestSidebar,
    });

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(null);

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

    return { kind: 'file' as const, label: ext ? `.${ext}` : 'Tệp', ext, badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', iconClass: 'text-sky-600' };
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
        <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-xl font-bold text-slate-800 truncate min-w-0 flex-1">
              {request.requestName ?? request.requestCode}
            </h5>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                {typeInfo.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}>
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
                    const location =
                      (session as RequestSessionSummary & { location?: string }).location || '—';

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
                            onClick={() => setRightPanel({ mode: 'detail', session: session as SessionWithFlags })}
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
                  <h2 className="text-lg font-bold text-slate-900">
                    Phiên {rightPanel.session.sessionNo}
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
                {request && (
                  <>
                    <RequestSessionDetailPanel
                      session={
                        sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                      }
                      requestCode={request.requestCode ?? ''}
                    />

                    <div className="mt-6">
                      <RequestDetailTeamSummary
                        session={rightPanel.session}
                        assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

