import { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { AlertTriangle, ArrowLeft, MapPin, Pencil, Trash2, X } from 'lucide-react';
import { Paperclip } from 'lucide-react';
import { message, Modal, Spin } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  getRequestStatusInfo,
  getRequestStatusCode,
  getSessionStatusCode,
  getSessionStatusInfo,
  REQUEST_STATUS,
  SESSION_STATUS,
} from '@/constants/status';
import { useRequestDetailManager } from '../hooks/useRequestDetailManager';
import type { RequestLayoutOutletContext, SessionWithFlags } from '../requestDetail.types';
import type { RequestSessionSummary } from '../request';
import { getSessionDisplayTitle } from '../utils/getSessionDisplayTitle';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import sessionService from '../api/sessionApi';
import requestService from '../api/requestApi';

export default function RequestDetailPC() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();

  const {
    request,
    sessions,
    rightPanel,
    setRightPanel,
    loading,
    uiAssignedTeamIdsBySessionId,
    refreshDetail,
  } = useRequestDetailManager({
    id,
    viewMode,
    refreshRequestSidebar,
  });

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [cancelSessionOpen, setCancelSessionOpen] = useState(false);
  const [cancelSessionReason, setCancelSessionReason] = useState('');
  const [cancelSessionLoading, setCancelSessionLoading] = useState(false);
  const [huyYeuCauOpen, setHuyYeuCauOpen] = useState(false);
  const [huyYeuCauReason, setHuyYeuCauReason] = useState('');
  const [huyYeuCauLoading, setHuyYeuCauLoading] = useState(false);

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
    const ext = extMatch && extMatch.length > 1 ? String(extMatch[1]).toUpperCase() : undefined;

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
    return (
      <div className="flex flex-1 min-h-[320px] items-center justify-center app-page-bg text-black p-6">
        <Spin size="large" tip="Đang tải chi tiết yêu cầu và danh sách buổi..." />
      </div>
    );
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  const requestTypeLabel = request.courseId
    ? 'Khóa học'
    : request.eventId
      ? 'Sự kiện'
      : request.subjectId
        ? 'Môn học'
        : 'Khác';
  const statusInfo = getRequestStatusInfo(request.status);
  const dotClass = 'mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#2197C0] align-middle';
  const metaLabelClass = 'text-[11px] uppercase tracking-wide text-[#2197C0] font-semibold';
  const requestStatusCode = getRequestStatusCode(request.status);
  const canHuyYeuCau =
    requestStatusCode === REQUEST_STATUS.APPROVED ||
    requestStatusCode === REQUEST_STATUS.ASSIGNING;
  const isPendingRequest =
    requestStatusCode === REQUEST_STATUS.PENDING || statusInfo.label === 'Chờ duyệt';
  const isRejected = statusInfo.label === 'Từ chối';
  const sessionCount = sessions.length || request.sessionsRequired || 0;
  const sessionSortedByNo = [...sessions].sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0));
  const firstSession = sessionSortedByNo[0];
  const lastSession = sessionSortedByNo[sessionSortedByNo.length - 1];
  const requestRaw = request as Record<string, unknown>;
  const courseRaw =
    (requestRaw.course as Record<string, unknown> | undefined) ??
    (requestRaw.Course as Record<string, unknown> | undefined) ??
    undefined;
  const subjectRaw =
    (requestRaw.subject as Record<string, unknown> | undefined) ??
    (requestRaw.Subject as Record<string, unknown> | undefined) ??
    undefined;
  const eventRaw =
    (requestRaw.event as Record<string, unknown> | undefined) ??
    (requestRaw.Event as Record<string, unknown> | undefined) ??
    undefined;
  const sourceRaw = eventRaw ?? courseRaw ?? subjectRaw;
  const sourceName = request.courseId
    ? String(courseRaw?.courseName ?? courseRaw?.CourseName ?? '').trim()
    : request.eventId
      ? String(eventRaw?.eventName ?? eventRaw?.EventName ?? '').trim()
      : request.subjectId
        ? String(subjectRaw?.subjectName ?? subjectRaw?.SubjectName ?? '').trim()
        : '';
  const sourceNameLabel = request.courseId
    ? 'Tên khóa học'
    : request.eventId
      ? 'Tên sự kiện'
      : request.subjectId
        ? 'Tên môn học'
        : 'Tên';
  const eventName = String(
    eventRaw?.eventName ??
      eventRaw?.EventName ??
      ''
  ).trim();
  const sourceDescription = String(
    sourceRaw?.description ??
      sourceRaw?.Description ??
      ''
  ).trim();
  const sourceDuration = String(
    sourceRaw?.duration ??
      sourceRaw?.Duration ??
      ''
  ).trim();
  const hasSourceDescription = Boolean(sourceDescription);
  const hasSourceName = Boolean(sourceName);
  const hasSourceDuration = Boolean(sourceDuration);
  const hasStartAt = Boolean(firstSession?.startAt);
  const hasEndAt = Boolean(lastSession?.endAt);
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

  const handleDeleteRequest = () => {
    Modal.confirm({
      title: 'Xác nhận xóa yêu cầu',
      icon: <ExclamationCircleFilled className="text-rose-500" />,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: {
        className: 'bg-rose-500 hover:bg-rose-600 border-0 text-white font-medium rounded-lg px-4 shadow-sm',
        style: { color: '#FFFFFF' },
      },
      content: 'Yêu cầu sẽ bị xóa vĩnh viễn. Bạn có chắc không?',
      onOk: async () => {
        try {
          await requestService.remove(request.requestId);
          message.success('Xóa yêu cầu thành công.');
          refreshRequestSidebar?.();
          navigate('/pc/requests', { replace: true });
        } catch (err: unknown) {
          const e = err as Record<string, unknown>;
          const apiMessage =
            (typeof err === 'string' && err) ||
            (e?.message as string) ||
            (e?.detail as string) ||
            (e?.title as string) ||
            (e?.error as string) ||
            (Array.isArray(e?.errors) && (e.errors[0] as string)) ||
            ((e?.response as Record<string, unknown>)?.data as string);
          message.error((apiMessage as string) ?? 'Xóa yêu cầu thất bại.');
        }
      },
    });
  };

  const handleConfirmHuyYeuCau = async () => {
    const trimmed = huyYeuCauReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do hủy yêu cầu.');
      return;
    }
    try {
      setHuyYeuCauLoading(true);
      await requestService.cancel(Number(id), { reason: trimmed });
      message.success('Đã hủy yêu cầu');
      setHuyYeuCauOpen(false);
      setHuyYeuCauReason('');
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Hủy yêu cầu thất bại.';
      message.error(msg);
    } finally {
      setHuyYeuCauLoading(false);
    }
  };

  const handleConfirmCancelSession = async () => {
    if (!resolvedDetailSession) return;
    const trimmed = cancelSessionReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do hủy buổi.');
      return;
    }
    try {
      setCancelSessionLoading(true);
      await sessionService.cancel({ sessionId: resolvedDetailSession.sessionId, reason: trimmed });
      message.success('Đã hủy buổi.');
      setCancelSessionOpen(false);
      setCancelSessionReason('');
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Hủy buổi thất bại.';
      message.error(msg);
    } finally {
      setCancelSessionLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col app-page-bg overflow-hidden p-6 text-black">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
          <div className="w-full min-w-0 space-y-4 pb-1">
        <div className="bg-white rounded-xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/pc/requests')}
              className="!p-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black bg-white hover:bg-gray-100 transition-colors"
              aria-label="Quay lại danh sách yêu cầu"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h5 className="truncate text-xl font-bold text-slate-900">
                  Chi tiết {request.requestName || eventName || request.requestCode}
                </h5>
                <p className="text-xs text-slate-700">
                  <span className="text-slate-500">Mã yêu cầu: </span>
                  <span className="font-semibold text-slate-900">{request.requestCode}</span>
                </p>
              </div>
              
            </div>


            <div className="flex min-w-[260px] shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Trạng thái:</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                {isPendingRequest ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/pc/requests/edit/${request.requestId}`)}
                      className="h-8 w-8 p-0 shrink-0 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                      aria-label="Sửa yêu cầu"
                      title="Sửa yêu cầu"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteRequest}
                      className="h-8 w-8 p-0 shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                      aria-label="Xóa yêu cầu"
                      title="Xóa yêu cầu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
                {canHuyYeuCau ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHuyYeuCauReason('');
                      setHuyYeuCauOpen(true);
                    }}
                    className="shrink-0 gap-1.5 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Hủy yêu cầu
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className='flex flex-col gap-1 px-5 pt-3'>
            {hasSourceName ? (
                <p className="mt-1 text-sm font-semibold">
                  <span className="text-[#2197C0]">
                    <span className={dotClass} aria-hidden />
                    {sourceNameLabel}:{' '}
                  </span>
                  <span className="text-slate-900">{sourceName || '—'}</span>
                  </p>
                ) : null}
                {hasSourceDescription ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {sourceDescription}
                </p>
            ) : null}
          </div>
            <div className={`mt-4 grid gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4 ${
              hasSourceDuration || hasStartAt || hasEndAt
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'
                : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Loại yêu cầu
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{requestTypeLabel}</p>
            </div>

            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Ngày gửi
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {request.createdAt ? dayjs(request.createdAt).format('DD/MM/YYYY') : dayjs(request.startDate).format('DD/MM/YYYY')}
              </p>
            </div>

            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Số lượng buổi
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {loading ? '—' : `${sessionCount} buổi`}
              </p>
            </div>

            {hasSourceDuration || hasStartAt || hasEndAt ? (
              <>
                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Thời lượng
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{sourceDuration || '—'}</p>
                </div>

                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Ngày bắt đầu
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {firstSession?.startAt ? dayjs(firstSession.startAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Ngày kết thúc
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {lastSession?.endAt ? dayjs(lastSession.endAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {isRejected && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-semibold text-rose-700">Lý do từ chối</p>
              <p className="mt-1 text-sm text-rose-900 whitespace-pre-line">
                {request.reason?.trim() || 'Không có lý do cụ thể.'}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                  onClick={() => navigate(`/pc/requests/edit/${request.requestId}`)}
                >
                  Chỉnh sửa và gửi duyệt lại
                </button>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-4 text-black">
          <TabsList className="bg-transparent border-0 shadow-none p-0 mb-0">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mb-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Danh sách buổi học</h3>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[240px] py-10">
                  <Spin tip="Đang tải danh sách buổi..." />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Yêu cầu này chưa có danh sách buổi chi tiết.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const topic = session.subjectSession ?? session.eventSession;
                    const sessionTitle = getSessionDisplayTitle(session);
                    const sessionSkills = session.sessionSkills ?? [];
                    const location =
                      (session as RequestSessionSummary & { location?: string }).location || '—';
                    const sessionStatusInfo = getSessionStatusInfo(session.status);

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
                        className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50/60 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200/70 focus:ring-offset-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs text-[#2197C0] font-semibold tabular-nums">
                              <span className="text-slate-600 font-medium">
                                {dayjs(session.startAt).format('DD/MM/YYYY')}
                              </span>
                              <span className="text-slate-300 font-normal mx-1">·</span>
                              {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">Trạng thái:</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sessionStatusInfo.className}`}
                            >
                              {sessionStatusInfo.label}
                            </span>
                          </div>

                          <span
                            className="inline-flex items-center gap-0.5 text-xs font-semibold text-sky-700 select-none"
                            aria-hidden
                          >
                            Chi tiết
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                          {sessionTitle}
                        </p>
                        {topic?.description?.trim() ? (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{topic.description.trim()}</p>
                        ) : null}
                        {sessionSkills.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sessionSkills.slice(0, 3).map((name) => (
                              <span
                                key={`${session.sessionId}-${name}`}
                                className="inline-flex items-center rounded-md border-0 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {name}
                              </span>
                            ))}
                            {sessionSkills.length > 3 ? (
                              <span className="inline-flex items-center rounded-md border-0 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                +{sessionSkills.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{location}</span>
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
          </div>
        </div>
      </div>

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
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết buổi</p>
                  {resolvedDetailSession ? (
                    <>
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {getSessionDisplayTitle(resolvedDetailSession)}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        <span>Buổi {resolvedDetailSession.sessionNo}</span>
                        <span className="text-slate-300">{' · '}</span>
                        <span className="font-semibold text-[#2197C0]">
                          {dayjs(resolvedDetailSession.startAt).format('HH:mm')} – {dayjs(resolvedDetailSession.endAt).format('HH:mm')}
                        </span>
                        <span className="text-slate-300">{' · '}</span>
                        <span className="font-semibold text-[#2197C0]">{dayjs(resolvedDetailSession.startAt).format('DD/MM/YYYY')}</span>
                      </p>
                    </>
                  ) : (
                    <h2 className="text-lg font-bold text-slate-900">Buổi {rightPanel.session.sessionNo}</h2>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {(() => {
                      const info = getSessionStatusInfo((resolvedDetailSession as any)?.status);
                      return (
                        <>
                          <span className="text-[11px] font-medium text-slate-500">Trạng thái:</span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
                            {info.label}
                          </span>
                        </>
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
                {request && (
                  <>
                    <RequestSessionDetailPanel
                      session={
                        sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                      }
                      requestId={Number(request.requestId)}
                      requestCode={request.requestCode ?? ''}
                      assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                      showReservedEquipment={false}
                    />
                  </>
                )}
                {resolvedDetailSession ? (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="relative inline-flex group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCancelDetailSession) {
                            message.info('Không đủ điều kiện hủy buổi.');
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
                        Hủy buổi
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

        {/* Hủy yêu cầu (PC) — PUT /requests/{id}/cancel */}
        <Dialog
          open={huyYeuCauOpen}
          onClose={() => !huyYeuCauLoading && setHuyYeuCauOpen(false)}
          title="Hủy yêu cầu"
          description="Nhập lý do hủy. Thao tác không thể hoàn tác."
          className="max-w-md border-0 shadow-2xl"
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="huy-yeu-cau-reason" className="text-black">
                Lý do <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="huy-yeu-cau-reason"
                rows={4}
                value={huyYeuCauReason}
                onChange={(e) => setHuyYeuCauReason(e.target.value)}
                placeholder="Ví dụ: Không còn nhu cầu, đổi lịch..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-200"
                disabled={huyYeuCauLoading}
                onClick={() => setHuyYeuCauOpen(false)}
              >
                Đóng
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                disabled={huyYeuCauLoading}
                onClick={handleConfirmHuyYeuCau}
              >
                {huyYeuCauLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Hủy buổi (PUT /sessions/cancel) — cần lý do */}
        <Dialog
          open={cancelSessionOpen}
          onClose={() => !cancelSessionLoading && setCancelSessionOpen(false)}
          title="Hủy buổi"
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

