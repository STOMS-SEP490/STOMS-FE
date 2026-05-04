import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { UserCheck, X } from 'lucide-react';
import { Image, message } from 'antd';
import attendanceApi, { type AttendanceFaceRecognizeResponse } from '@/modules/attendance/attendanceApi';
import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';
import { cn } from '@/shared/lib/utils';
import { getErrorMessage } from '@/shared/lib/errorMessage';

type AttendanceActionMode = 'delegate' | 'checkin' | 'checkout' | null;
type AttendanceTab = Exclude<AttendanceActionMode, null>;

function getInitials(name?: string) {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export type TeamLeaderAttendanceSlideOverProps = {
  actionMode: AttendanceActionMode;
  activeSession: TeamLeaderTimetableAssignmentRow | null;
  sessionDetail: SessionDetail | null;
  attendanceItems: AttendanceItem[];
  membersById: Record<number, MemberDetail>;
  attendanceByMemberIdForSession: number | null;
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  memberNotes: Record<number, string>;
  setMemberNotes: Dispatch<SetStateAction<Record<number, string>>>;
  selectedMemberIds: number[];
  setSelectedMemberIds: Dispatch<SetStateAction<number[]>>;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  setActionMode: Dispatch<SetStateAction<AttendanceActionMode>>;
  isLoadingAttendance?: boolean;
  /** Đổi tab Đầu giờ / Cuối giờ / Ủy quyền (đồng bộ chọn thành viên). */
  switchActionMode: (mode: AttendanceTab) => void;
  closePanel: () => void;
  saveAttendance: () => void;
  refreshAttendanceItems: () => Promise<{ items: AttendanceItem[]; membersById: Record<number, MemberDetail> } | void>;
  refetch?: () => Promise<void>;
  /** z-index lớp phủ (vd. z-[80] khi mở từ popover lịch) */
  overlayZClass?: string;
  /** Ẩn tab Ủy quyền (dùng cho role Teacher/TA) */
  hideDelegate?: boolean;
};

export default function TeamLeaderAttendanceSlideOver({
  actionMode,
  activeSession,
  sessionDetail,
  attendanceItems,
  membersById,
  attendanceByMemberIdForSession,
  memberSearch,
  setMemberSearch: _setMemberSearch,
  memberNotes,
  setMemberNotes,
  selectedMemberIds: _selectedMemberIds,
  setSelectedMemberIds: _setSelectedMemberIds,
  isSubmitting,
  setIsSubmitting,
  setActionMode,
  isLoadingAttendance = false,
  switchActionMode,
  closePanel,
  saveAttendance: _saveAttendance,
  refreshAttendanceItems,
  refetch,

  overlayZClass = 'z-[80]',
  hideDelegate = false,
}: TeamLeaderAttendanceSlideOverProps) {
  const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const [checkinProofImage, setCheckinProofImage] = useState<File | null>(null);
  const [checkoutProofImage, setCheckoutProofImage] = useState<File | null>(null);
  const [checkedCheckinByMemberId, setCheckedCheckinByMemberId] = useState<Record<number, boolean>>({});
  const [checkedCheckoutByMemberId, setCheckedCheckoutByMemberId] = useState<Record<number, boolean>>({});
  const [pendingCheckinResetByMemberId, setPendingCheckinResetByMemberId] = useState<Record<number, boolean>>({});
  const [pendingCheckoutResetByMemberId, setPendingCheckoutResetByMemberId] = useState<Record<number, boolean>>({});
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [autoMatchesByAttendanceId, setAutoMatchesByAttendanceId] = useState<Record<number, number>>({});
  const [autoRecognizing, setAutoRecognizing] = useState(false);
  const [autoPreviewUrl, setAutoPreviewUrl] = useState<string | null>(null);
  const [autoDetectedFaces, setAutoDetectedFaces] = useState<
    Array<{ faceIndex: number; boundingBox: { left: number; top: number; width: number; height: number }; isMatched: boolean }>
  >([]);
  const [autoMatchedResults, setAutoMatchedResults] = useState<
    Array<{
      attendanceId: number;
      targetMemberId: number;
      fullName: string;
      similarity: number;
      detectedFaceIndex: number;
      boundingBox: { left: number; top: number; width: number; height: number };
    }>
  >([]);
  const [autoMatchBoxByAttendanceId, setAutoMatchBoxByAttendanceId] = useState<
    Record<number, { similarity: number; boundingBox: { left: number; top: number; width: number; height: number } }>
  >({});

  useEffect(() => {
    // Reset ảnh khi đổi mode/buổi để tránh gửi nhầm.
    if (actionMode !== 'checkin' || !activeSession?.sessionId) {
      setCheckinProofImage(null);
      setCheckedCheckinByMemberId({});
      setPendingCheckinResetByMemberId({});
      setAutoMatchesByAttendanceId({});
      setAutoDetectedFaces([]);
      setAutoMatchedResults([]);
      setAutoMatchBoxByAttendanceId({});
      if (autoPreviewUrl) URL.revokeObjectURL(autoPreviewUrl);
      setAutoPreviewUrl(null);
    }
    if (actionMode !== 'checkout' || !activeSession?.sessionId) {
      setCheckoutProofImage(null);
      setCheckedCheckoutByMemberId({});
      setPendingCheckoutResetByMemberId({});
      setAutoMatchesByAttendanceId({});
      setAutoDetectedFaces([]);
      setAutoMatchedResults([]);
      setAutoMatchBoxByAttendanceId({});
      if (autoPreviewUrl) URL.revokeObjectURL(autoPreviewUrl);
      setAutoPreviewUrl(null);
    }
  }, [actionMode, activeSession?.sessionId]);

  const currentMemberId = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { memberId?: number | string };
      const id = Number(parsed.memberId ?? 0);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }, []);

  const canSaveAttendance = useMemo(() => {
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return false;
    const ownerId = attendanceByMemberIdForSession;
    const uid = currentMemberId;
    if (uid == null || uid <= 0) return false;
    if (ownerId == null || ownerId <= 0) return false;
    return ownerId === uid;
  }, [actionMode, attendanceByMemberIdForSession, currentMemberId]);

  const selectedIdsToSubmit = useMemo(() => {
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return [];
    const checked = actionMode === 'checkout' ? checkedCheckoutByMemberId : checkedCheckinByMemberId;
    const proof = actionMode === 'checkout' ? checkoutProofImage : checkinProofImage;
    if (!proof) return [];
    const ids = Object.entries(checked)
      .filter(([, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0)
    return Array.from(new Set(ids));
  }, [
    actionMode,
    checkinProofImage,
    checkoutProofImage,
    checkedCheckinByMemberId,
    checkedCheckoutByMemberId,
  ]);

  const pendingResetMemberIds = useMemo(() => {
    const m = actionMode === 'checkout' ? pendingCheckoutResetByMemberId : pendingCheckinResetByMemberId;
    return Object.entries(m)
      .filter(([, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [actionMode, pendingCheckinResetByMemberId, pendingCheckoutResetByMemberId]);

  const hasPendingChanges = selectedIdsToSubmit.length > 0 || pendingResetMemberIds.length > 0;

  const filteredAttendanceItems = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return attendanceItems;
    return attendanceItems.filter((item) => {
      const memberId = Number((item as { memberId?: number }).memberId ?? item.MemberId ?? 0);
      const detail = membersById[memberId];
      const name = detail?.fullName ?? '';
      const email = detail?.userEmail ?? '';
      return `${name} ${email}`.toLowerCase().includes(keyword);
    });
  }, [attendanceItems, memberSearch, membersById]);

  const topic = sessionDetail?.SubjectSession ?? sessionDetail?.EventSession;
  const requestNameText = activeSession?.requestName?.trim() ? activeSession.requestName.trim() : '';

  const startAt = sessionDetail?.StartAt ?? activeSession?.startAt;
  const endAt = sessionDetail?.EndAt ?? activeSession?.endAt;

  /** Tiêu đề header: ưu tiên tên khóa / tên yêu cầu. */
  const panelTitle = useMemo(() => {
    const t = topic?.Title?.trim();
    if (t) return t;
    if (requestNameText) return requestNameText;
    if (activeSession?.sessionNo != null) return `Buổi ${activeSession.sessionNo}`;
    return 'Xác nhận tham gia';
  }, [topic?.Title, requestNameText, activeSession?.sessionNo]);

  const headerSubtitle =
    startAt && endAt
      ? `${dayjs(startAt).format('DD/MM/YYYY')} · ${dayjs(startAt).format('HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
      : '';

  const tabs: { id: AttendanceTab; label: string }[] = [
    { id: 'checkin', label: 'Đầu giờ' },
    { id: 'checkout', label: 'Cuối giờ' },
    ...(!hideDelegate ? [{ id: 'delegate' as AttendanceTab, label: 'Ủy quyền' }] : []),
  ];

  const closePreview = () => setPreviewImgUrl(null);

  const handleSave = async () => {
    if (!activeSession?.sessionId) {
      message.error('Không tìm thấy thông tin buổi để xác nhận tham gia.');
      return;
    }
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return;
    if (!canSaveAttendance) {
      message.warning('Bạn không có quyền lưu xác nhận tham gia cho buổi này.');
      return;
    }

    const selected = selectedIdsToSubmit;
    const pendingResetIds = pendingResetMemberIds;
    if (selected.length === 0 && pendingResetIds.length === 0) {
      message.warning('Vui lòng chọn ảnh hoặc đánh dấu xóa ít nhất 1 thành viên.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resetTargets = attendanceItems
        .map((attendance) => {
          const memberId = Number(
            (attendance as unknown as { MemberId?: number; memberId?: number }).MemberId ??
              (attendance as unknown as { MemberId?: number; memberId?: number }).memberId ??
              0,
          );
          const attendanceId = Number(
            (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
              (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
              0,
          );
          return { memberId, attendanceId, attendance };
        })
        .filter(({ memberId, attendanceId }) => pendingResetIds.includes(memberId) && attendanceId > 0);

      if (resetTargets.length > 0) {
        await Promise.all(
          resetTargets.map(({ attendanceId, memberId, attendance }) =>
            attendanceApi.reset(attendanceId, {
              isCheckIn: actionMode === 'checkin',
              note:
                (memberNotes?.[memberId] ?? '').trim() ||
                ((attendance as unknown as { Note?: string | null; note?: string | null }).Note ??
                  (attendance as unknown as { Note?: string | null; note?: string | null }).note ??
                  null),
            }),
          ),
        );
      }

      if (actionMode === 'checkin') {
        const items = selected
          .map((memberId) => {
            const attendanceId = Number(
              attendanceItems.find((a) => {
                const mid = Number(
                  (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                    (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                    0,
                );
                return mid === memberId;
              }) as unknown as { AttendanceId?: number; attendanceId?: number } | undefined
                ? (attendanceItems.find((a) => {
                    const mid = Number(
                      (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                        (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                        0,
                    );
                    return mid === memberId;
                  }) as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                  (attendanceItems.find((a) => {
                    const mid = Number(
                      (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                        (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                        0,
                    );
                    return mid === memberId;
                  }) as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                  0
                : 0,
            );

            return {
              memberId,
              attendanceId,
              note: (memberNotes?.[memberId] ?? '').trim() || null,
            };
          })
          .filter((x) => Number.isFinite(x.attendanceId) && x.attendanceId > 0);

        if (items.length > 0) {
          if (!checkinProofImage) {
            message.warning('Vui lòng tải ảnh minh chứng trước khi lưu.');
            return;
          }
          const form = new FormData();
          form.append('SessionId', String(activeSession.sessionId));
          items.forEach((x, i) => {
            // BE expects AttendanceId + 1 ảnh dùng chung (Image)
            form.append(`Items[${i}].AttendanceId`, String(x.attendanceId));
            if (x.note) form.append(`Items[${i}].Note`, x.note);
          });
          form.append('Image', checkinProofImage, checkinProofImage.name);

          const res = await attendanceApi.checkInWithImages(form);
          if (res?.SkippedMemberIds?.length) {
            message.warning(`Đã bỏ qua ${res.SkippedMemberIds.length} member.`);
          } else {
            message.success(
              resetTargets.length > 0 ? 'Đã cập nhật xác nhận và xóa ảnh đã chọn.' : 'Đã lưu xác nhận.',
            );
          }
        } else if (resetTargets.length > 0) {
          message.success('Đã xóa ảnh xác nhận đã chọn.');
        }
      } else {
        const items = selected
          .map((memberId) => {
            const attendanceId = Number(
              attendanceItems.find((a) => {
                const mid = Number(
                  (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                    (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                    0,
                );
                return mid === memberId;
              }) as unknown as { AttendanceId?: number; attendanceId?: number } | undefined
                ? (attendanceItems.find((a) => {
                    const mid = Number(
                      (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                        (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                        0,
                    );
                    return mid === memberId;
                  }) as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                  (attendanceItems.find((a) => {
                    const mid = Number(
                      (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                        (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
                        0,
                    );
                    return mid === memberId;
                  }) as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                  0
                : 0,
            );

            return {
              memberId,
              attendanceId,
              note: (memberNotes?.[memberId] ?? '').trim() || null,
            };
          })
          .filter((x) => Number.isFinite(x.attendanceId) && x.attendanceId > 0);

        if (items.length > 0) {
          if (!checkoutProofImage) {
            message.warning('Vui lòng tải ảnh minh chứng trước khi lưu.');
            return;
          }
          const form = new FormData();
          form.append('SessionId', String(activeSession.sessionId));
          items.forEach((x, i) => {
            form.append(`Items[${i}].AttendanceId`, String(x.attendanceId));
            if (x.note) form.append(`Items[${i}].Note`, x.note);
          });
          form.append('Image', checkoutProofImage, checkoutProofImage.name);

          const res = await attendanceApi.checkOutWithImages(form);
          if (res?.SkippedMemberIds?.length) {
            message.warning(`Đã bỏ qua ${res.SkippedMemberIds.length} member.`);
          } else {
            message.success(
              resetTargets.length > 0 ? 'Đã cập nhật giờ ra và xóa ảnh đã chọn.' : 'Đã lưu giờ ra.',
            );
          }
        } else if (resetTargets.length > 0) {
          message.success('Đã xóa ảnh giờ ra đã chọn.');
        }
      }

      await refreshAttendanceItems();
      await refetch?.();

      // Clear chọn/ảnh của mode hiện tại để tránh gửi lại
      if (actionMode === 'checkin') {
        setCheckedCheckinByMemberId({});
        setCheckinProofImage(null);
        setPendingCheckinResetByMemberId({});
      }
      if (actionMode === 'checkout') {
        setCheckedCheckoutByMemberId({});
        setCheckoutProofImage(null);
        setPendingCheckoutResetByMemberId({});
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoUploadAndRecognize = async (file: File) => {
    if (!activeSession?.sessionId) {
      message.error('Không tìm thấy thông tin buổi để nhận diện.');
      return;
    }
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return;

    setAutoRecognizing(true);
    try {
      // dùng ảnh này làm ảnh minh chứng để lưu luôn
      if (actionMode === 'checkin') setCheckinProofImage(file);
      else setCheckoutProofImage(file);

      if (autoPreviewUrl) URL.revokeObjectURL(autoPreviewUrl);
      setAutoPreviewUrl(URL.createObjectURL(file));

      const form = new FormData();
      form.append('SessionId', String(activeSession.sessionId));
      form.append('ImageFile', file, file.name);

      const res: AttendanceFaceRecognizeResponse = await attendanceApi.recognizeGroupPhoto(form);
      const raw = res as unknown as Record<string, unknown>;
      const matchedResultsRaw =
        (raw.MatchedResults as unknown[]) ??
        (raw.matchedResults as unknown[]) ??
        ([] as unknown[]);
      const matchedAttendanceIdsRaw =
        (raw.MatchedAttendanceIds as unknown[]) ??
        (raw.matchedAttendanceIds as unknown[]) ??
        ([] as unknown[]);
      const detectedFacesRaw =
        (raw.DetectedFaces as unknown[]) ??
        (raw.detectedFaces as unknown[]) ??
        ([] as unknown[]);

      const map: Record<number, number> = {};
      (matchedResultsRaw ?? []).forEach((r0) => {
        const r = (r0 ?? {}) as Record<string, unknown>;
        const id = Number(r.AttendanceId ?? r.attendanceId ?? 0);
        const sim = Number(r.Similarity ?? r.similarity ?? 0);
        if (Number.isFinite(id) && id > 0) map[id] = Number.isFinite(sim) ? sim : 0;
      });
      setAutoMatchesByAttendanceId(map);

      const matchedParsed = (matchedResultsRaw ?? [])
        .map((r0) => {
          const r = (r0 ?? {}) as Record<string, unknown>;
          const attendanceId = Number(r.AttendanceId ?? r.attendanceId ?? 0);
          const detectedFaceIndex = Number(r.DetectedFaceIndex ?? r.detectedFaceIndex ?? -1);
          const similarity = Number(r.Similarity ?? r.similarity ?? 0);
          const bbRaw = (r.BoundingBox ?? r.boundingBox ?? {}) as Record<string, unknown>;
          const boundingBox = {
            left: Number(bbRaw.Left ?? bbRaw.left ?? 0),
            top: Number(bbRaw.Top ?? bbRaw.top ?? 0),
            width: Number(bbRaw.Width ?? bbRaw.width ?? 0),
            height: Number(bbRaw.Height ?? bbRaw.height ?? 0),
          };
          return {
            attendanceId,
            targetMemberId: Number(r.TargetMemberId ?? r.targetMemberId ?? 0),
            fullName: String(r.FullName ?? r.fullName ?? ''),
            similarity: Number.isFinite(similarity) ? similarity : 0,
            detectedFaceIndex: Number.isFinite(detectedFaceIndex) ? detectedFaceIndex : -1,
            boundingBox,
          };
        })
        .filter((x) => Number.isFinite(x.detectedFaceIndex) && x.detectedFaceIndex >= 0 && x.boundingBox.width > 0);
      setAutoMatchedResults(matchedParsed);
      const boxMap: Record<number, { similarity: number; boundingBox: { left: number; top: number; width: number; height: number } }> = {};
      matchedParsed.forEach((m) => {
        if (!Number.isFinite(m.attendanceId) || m.attendanceId <= 0) return;
        boxMap[m.attendanceId] = { similarity: m.similarity, boundingBox: m.boundingBox };
      });
      setAutoMatchBoxByAttendanceId(boxMap);

      const detectedParsed = (detectedFacesRaw ?? [])
        .map((f0) => {
          const f = (f0 ?? {}) as Record<string, unknown>;
          const bbRaw = (f.BoundingBox ?? f.boundingBox ?? {}) as Record<string, unknown>;
          const boundingBox = {
            left: Number(bbRaw.Left ?? bbRaw.left ?? 0),
            top: Number(bbRaw.Top ?? bbRaw.top ?? 0),
            width: Number(bbRaw.Width ?? bbRaw.width ?? 0),
            height: Number(bbRaw.Height ?? bbRaw.height ?? 0),
          };
          return {
            faceIndex: Number(f.FaceIndex ?? f.faceIndex ?? -1),
            boundingBox,
            isMatched: Boolean(f.IsMatched ?? f.isMatched ?? false),
          };
        })
        .filter((x) => Number.isFinite(x.faceIndex) && x.faceIndex >= 0 && x.boundingBox.width > 0);
      setAutoDetectedFaces(detectedParsed);

      // auto tick các member được match
      const attendanceIdToMemberId = new Map<number, number>();
      attendanceItems.forEach((a) => {
        const memberId = Number(
          (a as unknown as { MemberId?: number; memberId?: number }).MemberId ??
            (a as unknown as { MemberId?: number; memberId?: number }).memberId ??
            0,
        );
        const attendanceId = Number(
          (a as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
            (a as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
            0,
        );
        if (attendanceId > 0 && memberId > 0) attendanceIdToMemberId.set(attendanceId, memberId);
      });

      const nextChecked: Record<number, boolean> = {};
      (matchedAttendanceIdsRaw ?? []).forEach((aid) => {
        const mid = attendanceIdToMemberId.get(Number(aid ?? 0));
        if (mid) nextChecked[mid] = true;
      });

      if (actionMode === 'checkin') setCheckedCheckinByMemberId((prev) => ({ ...prev, ...nextChecked }));
      else setCheckedCheckoutByMemberId((prev) => ({ ...prev, ...nextChecked }));

      message.success(`Nhận diện xong: match ${matchedAttendanceIdsRaw?.length ?? 0} người.`);
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setAutoRecognizing(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 isolate ${overlayZClass} ${actionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          actionMode ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closePanel}
        aria-hidden={!actionMode}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[640px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none ${
          actionMode ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Xác nhận tham gia</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 leading-snug">{panelTitle}</h2>
                {headerSubtitle ? (
                  <p className="mt-1 text-xs text-slate-500">{headerSubtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                onClick={closePanel}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {actionMode ? (
              <nav
                className="mt-3 flex flex-wrap items-center gap-5 border-b border-slate-200"
                role="tablist"
                aria-label="Chế độ xác nhận tham gia"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={actionMode === tab.id}
                    onClick={() => switchActionMode(tab.id)}
                    className={cn(
                      '-mb-px cursor-pointer border-b-2 bg-transparent px-0 pb-2 text-[11px] font-medium transition-colors sm:text-xs',
                      actionMode === tab.id
                        ? 'border-[#2197C0] text-[#2197C0]'
                        : 'border-transparent text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
            <div className="bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">Danh sách thành viên được phân công</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {actionMode === 'delegate'
                      ? 'Chọn thành viên để ủy quyền xác nhận tham gia.'
                      : `Tải ảnh minh chứng để ${actionMode === 'checkin' ? 'xác nhận' : 'xác nhận'}.`}
                  </p>
                </div>
                {(actionMode === 'checkin' || actionMode === 'checkout') ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {/**
                     * Khi đã upload ảnh thông minh (đã có preview/match),
                     * khóa upload thường để tránh đổi ảnh làm lệch kết quả nhận diện.
                     */}
                    {(() => {
                      const hasAutoProof = !!autoPreviewUrl || autoMatchedResults.length > 0 || autoDetectedFaces.length > 0;
                      return (
                    <label className="inline-flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0] ?? null;
                          if (!f) return;
                          if (f.size > MAX_UPLOAD_SIZE_BYTES) {
                            message.warning('Vui lòng chọn ảnh có dung lượng không quá 5MB.');
                            e.currentTarget.value = '';
                            return;
                          }
                          // Upload ảnh bình thường: chỉ set ảnh minh chứng, không nhận diện
                          if (actionMode === 'checkin') {
                            setCheckinProofImage(f);
                            setAutoMatchesByAttendanceId({});
                          } else {
                            setCheckoutProofImage(f);
                            setAutoMatchesByAttendanceId({});
                          }
                          e.currentTarget.value = '';
                        }}
                        disabled={isSubmitting || autoRecognizing || hasAutoProof}
                      />
                      <span
                        className={cn(
                          'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors',
                          isSubmitting || autoRecognizing || hasAutoProof
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        Tải ảnh
                      </span>
                    </label>
                      );
                    })()}

                    {autoPreviewUrl && (autoDetectedFaces.length > 0 || autoMatchedResults.length > 0) ? (
                      <button
                        type="button"
                        className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setPreviewImgUrl(autoPreviewUrl)}
                        disabled={isSubmitting || autoRecognizing}
                      >
                        Xem ảnh nhận diện
                      </button>
                    ) : null}

                    <label className="inline-flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0] ?? null;
                          if (f) {
                            if (f.size > MAX_UPLOAD_SIZE_BYTES) {
                              message.warning('Vui lòng chọn ảnh có dung lượng không quá 5MB.');
                              e.currentTarget.value = '';
                              return;
                            }
                            void handleAutoUploadAndRecognize(f);
                          }
                          e.currentTarget.value = '';
                        }}
                        disabled={isSubmitting || autoRecognizing}
                      />
                      <span
                        className={cn(
                          'inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition-colors',
                          isSubmitting || autoRecognizing
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        {autoRecognizing ? 'Đang nhận diện...' : 'Tải ảnh thông minh'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-[#2197C0] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#208AAE] disabled:opacity-50"
                      disabled={isSubmitting || !canSaveAttendance || !hasPendingChanges}
                    >
                      Lưu xác nhận
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Preview ảnh đã tải */}
              {(actionMode === 'checkin' || actionMode === 'checkout') && (
                (actionMode === 'checkin' && checkinProofImage) || (actionMode === 'checkout' && checkoutProofImage)
              ) ? (
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600">Ảnh đã tải:</span>
                    <Image
                      src={URL.createObjectURL(actionMode === 'checkin' ? checkinProofImage! : checkoutProofImage!)}
                      alt="Xem trước"
                      width={80}
                      height={80}
                      className="rounded border border-slate-200"
                      style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      
                    />
                    <button
                      type="button"
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => {
                        if (actionMode === 'checkin') {
                          setCheckinProofImage(null);
                          setCheckedCheckinByMemberId({});
                        } else {
                          setCheckoutProofImage(null);
                          setCheckedCheckoutByMemberId({});
                        }
                      }}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="px-5 pb-5">
              {filteredAttendanceItems.length === 0 && (
                <div className="bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  {isLoadingAttendance ? 'Đang tải danh sách...' : 'Chưa có thành viên nào cần xác nhận tham gia.'}
                </div>
              )}

              {filteredAttendanceItems.length > 0 && (
              <div className="flex flex-col divide-y divide-slate-100">
              {filteredAttendanceItems.map((attendance) => {
                const memberId = Number(
                  (attendance as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                    (attendance as unknown as { MemberId?: number; memberId?: number }).memberId ??
                    0,
                );
                const assigned = (sessionDetail?.Assignments ?? []).find(
                  (assignment) => assignment.StaffMemberId === memberId,
                );
                const staff = assigned?.StaffMember;
                const cachedMember = membersById[memberId];
                const staffUser = (staff?.User ?? null) as
                  | { AvatarUrl?: string | null; avatarUrl?: string | null }
                  | null;
                const memberName =
                  staff?.FullName ?? cachedMember?.fullName ?? `Member #${memberId}`;
                const memberEmail =
                  staff?.Email ?? staff?.User?.Email ?? cachedMember?.userEmail ?? 'Không có email';
                const memberAvatarUrl =
                  staff?.AvatarUrl ??
                  staffUser?.AvatarUrl ??
                  staffUser?.avatarUrl ??
                  cachedMember?.avatarUrl ??
                  null;
                const checkinAt =
                  (attendance as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).CheckinAt ??
                  (attendance as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).checkinAt ??
                  null;
                const checkoutAt =
                  (attendance as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).CheckoutAt ??
                  (attendance as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).checkoutAt ??
                  null;

                const isCheckedIn = checkinAt != null;
                const isCheckedOut = checkoutAt != null;
                const isPendingCheckinReset = !!pendingCheckinResetByMemberId[memberId];
                const isPendingCheckoutReset = !!pendingCheckoutResetByMemberId[memberId];
                const isCheckedInEffective = isCheckedIn && !isPendingCheckinReset;
                const isCheckedOutEffective = isCheckedOut && !isPendingCheckinReset && !isPendingCheckoutReset;
                const isAuthorizedDelegate =
                  attendanceByMemberIdForSession != null && attendanceByMemberIdForSession === memberId;
                const checkinImgUrl =
                  (attendance as unknown as { imgcheckin?: string | null }).imgcheckin ??
                  (attendance as unknown as { imgCheckin?: string | null }).imgCheckin ??
                  (attendance as unknown as { imgCheckIn?: string | null }).imgCheckIn ??
                  (attendance as unknown as { ImgCheckin?: string | null }).ImgCheckin ??
                  (attendance as unknown as { ImgCheckIn?: string | null }).ImgCheckIn ??
                  (attendance as unknown as { ImgUrl?: string | null }).ImgUrl ??
                  null;
                const checkoutImgUrl =
                  (attendance as unknown as { imgcheckout?: string | null }).imgcheckout ??
                  (attendance as unknown as { imgCheckout?: string | null }).imgCheckout ??
                  (attendance as unknown as { imgCheckOut?: string | null }).imgCheckOut ??
                  (attendance as unknown as { ImgCheckout?: string | null }).ImgCheckout ??
                  (attendance as unknown as { ImgCheckOut?: string | null }).ImgCheckOut ??
                  null;
                const checkinImgUrlEffective = isPendingCheckinReset ? null : checkinImgUrl;
                const checkoutImgUrlEffective = isPendingCheckinReset || isPendingCheckoutReset ? null : checkoutImgUrl;
                return (
                  <div
                    key={
                      Number(
                        (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                          (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                          memberId,
                      )
                    }
                    className={cn(
                      'grid grid-cols-1 gap-3 bg-white px-4 py-3.5',
                      actionMode === 'delegate'
                        ? 'md:grid-cols-[1fr_1.2fr_auto]'
                        : 'md:grid-cols-[1fr_auto]',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {memberAvatarUrl ? (
                          <img
                            src={memberAvatarUrl}
                            alt={memberName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                            }}
                          />
                        ) : (
                          getInitials(memberName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">{memberName}</div>
                          {(() => {
                            const attendanceId = Number(
                              (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                                (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                                0,
                            );
                            const sim = autoMatchesByAttendanceId[attendanceId];
                            if (!sim) return null;
                            const tone =
                              sim >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sim >= 80 ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : sim >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200';
                            return (
                              <span className={cn('inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold', tone)}>
                                Khớp {sim.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </div>
                        <div className="truncate text-xs text-slate-500">{memberEmail}</div>
                      </div>
                      {(() => {
                        if (!autoPreviewUrl) return null;
                        const attendanceId = Number(
                          (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                            (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                            0,
                        );
                        const box = autoMatchBoxByAttendanceId[attendanceId];
                        if (!box) return null;
                        const bb = box.boundingBox;
                        // Crop theo boundingBox ratio (0..1).
                        // Dùng left/top/width/height thay vì translate(%)
                        // để tránh trường hợp ảnh bị đẩy ra ngoài khung -> ô trắng.
                        const w = Number(bb.width);
                        const h = Number(bb.height);
                        const l = Number(bb.left);
                        const t = Number(bb.top);
                        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;

                        const imgW = (1 / w) * 100;
                        const imgH = (1 / h) * 100;
                        const imgL = (-l / w) * 100;
                        const imgT = (-t / h) * 100;
                        return (
                          <div className="shrink-0">
                            <div className="relative h-10 w-10 overflow-hidden border border-emerald-200 bg-white shadow-sm">
                              <img
                                src={autoPreviewUrl}
                                alt=""
                                className="absolute block max-w-none"
                                style={{
                                  width: `${imgW}%`,
                                  height: `${imgH}%`,
                                  left: `${imgL}%`,
                                  top: `${imgT}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {actionMode === 'delegate' ? (
                      isAuthorizedDelegate ? (
                        <span className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 whitespace-nowrap">
                          <UserCheck className="h-3 w-3" />
                          Người xác nhận
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeSession) return;
                            setIsSubmitting(true);
                            try {
                              await attendanceApi.delegate({
                                sessionId: activeSession.sessionId,
                                delegateToMemberId: memberId,
                                previousAttendanceByMemberId: attendanceByMemberIdForSession,
                              });
                              message.success('Ủy quyền xác nhận tham gia thành công.');
                              await refreshAttendanceItems();
                              await refetch?.();
                              setActionMode(null);
                            } catch (err: unknown) {
                              message.error(getErrorMessage(err));
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 whitespace-nowrap"
                          disabled={isSubmitting}
                        >
                          <UserCheck className="h-3 w-3" />
                          Ủy quyền
                        </button>
                      )
                    ) : (
                      <>
                        <div className="flex items-center justify-end gap-3 md:justify-self-end">
                          {actionMode === 'checkin' ? (
                            isCheckedInEffective ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                                Đã xác nhận
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                Chưa xác nhận
                              </span>
                            )
                          ) : actionMode === 'checkout' ? (
                            !isCheckedInEffective ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 whitespace-nowrap">
                                Chưa xác nhận
                              </span>
                            ) : isCheckedOutEffective ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                                Đã xác nhận
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                Chưa xác nhận
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">&nbsp;</span>
                          )}
                          {null}
                        </div>

                        {/* Row 2: ghi chú + ảnh minh chứng (cùng hàng) */}
                        <div className="md:col-span-2 w-full space-y-2">
                          {actionMode === 'checkin' && isCheckedInEffective ? (
                            <div className="flex items-center gap-3">
                              <input
                                className="h-9 flex-1 border-b border-slate-200 bg-transparent px-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                                placeholder="Ghi chú..."
                                value={memberNotes[memberId] ?? ''}
                                onChange={(event) =>
                                  setMemberNotes((prev) => ({
                                    ...prev,
                                    [memberId]: event.target.value,
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-500">Ảnh xác nhận:</span>
                                {checkinImgUrlEffective ? (
                                  <>
                                    <Image
                                      src={checkinImgUrlEffective}
                                      alt="Ảnh xác nhận"
                                      width={36}
                                      height={36}
                                      className="rounded object-cover border border-slate-200 cursor-pointer"
                                      style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                      preview={{
                                        mask: <div className="text-[10px]">Xem</div>,
                                      }}
                                      fallback="/img/ava.png"
                                    />
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                                      onClick={() => {
                                        setPendingCheckinResetByMemberId((prev) => ({ ...prev, [memberId]: true }));
                                        setCheckinProofImage(null);
                                        setCheckedCheckinByMemberId((prev) => ({ ...prev, [memberId]: false }));
                                      }}
                                      disabled={isSubmitting}
                                    >
                                      Xóa
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Chưa có</span>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {actionMode === 'checkout' && isCheckedOutEffective ? (
                            <div className="flex items-center gap-3">
                              <input
                                className="h-9 flex-1 border-b border-slate-200 bg-transparent px-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                                placeholder="Ghi chú..."
                                value={memberNotes[memberId] ?? ''}
                                onChange={(event) =>
                                  setMemberNotes((prev) => ({
                                    ...prev,
                                    [memberId]: event.target.value,
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-500">Ảnh giờ ra:</span>
                                {checkoutImgUrlEffective ? (
                                  <>
                                    <Image
                                      src={checkoutImgUrlEffective}
                                      alt="Ảnh giờ ra"
                                      width={36}
                                      height={36}
                                      className="rounded object-cover border border-slate-200 cursor-pointer"
                                      style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                      preview={{
                                        mask: <div className="text-[10px]">Xem</div>,
                                      }}
                                      fallback="/img/ava.png"
                                    />
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                                      onClick={() => {
                                        setPendingCheckoutResetByMemberId((prev) => ({ ...prev, [memberId]: true }));
                                        setCheckoutProofImage(null);
                                        setCheckedCheckoutByMemberId((prev) => ({ ...prev, [memberId]: false }));
                                      }}
                                      disabled={isSubmitting}
                                    >
                                      Xóa
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Chưa có</span>
                                )}
                              </div>
                            </div>
                          ) : null}

                          {actionMode === 'checkin' && !isCheckedInEffective ? (
                            <>
                              <input
                                className="h-9 w-full border-b border-slate-200 bg-transparent px-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                                placeholder="Ghi chú..."
                                value={memberNotes[memberId] ?? ''}
                                onChange={(event) =>
                                  setMemberNotes((prev) => ({
                                    ...prev,
                                    [memberId]: event.target.value,
                                  }))
                                }
                              />
                              <div className="flex items-center justify-between gap-3 border-l-2 border-slate-200 bg-slate-50/30 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-medium text-slate-600">Xác nhận</div>
                                  <div className="text-[11px] text-slate-500">
                                    {checkinProofImage ? 'Đã có ảnh minh chứng' : 'Vui lòng tải ảnh ở trên'}
                                  </div>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700 shrink-0">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#2197C0]"
                                    checked={!!checkedCheckinByMemberId[memberId]}
                                    onChange={(e) => {
                                      const nextChecked = e.target.checked;
                                      setCheckedCheckinByMemberId((prev) => ({
                                        ...prev,
                                        [memberId]: nextChecked,
                                      }));
                                    }}
                                    disabled={isSubmitting || !checkinProofImage}
                                  />
                                  Chọn
                                </label>
                              </div>
                            </>
                          ) : null}

                          {actionMode === 'checkout' && isCheckedInEffective && !isCheckedOutEffective ? (
                            <>
                              <input
                                className="h-9 w-full border-b border-slate-200 bg-transparent px-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                                placeholder="Ghi chú..."
                                value={memberNotes[memberId] ?? ''}
                                onChange={(event) =>
                                  setMemberNotes((prev) => ({
                                    ...prev,
                                    [memberId]: event.target.value,
                                  }))
                                }
                              />
                              <div className="flex items-center justify-between gap-3 border-l-2 border-slate-200 bg-slate-50/30 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-medium text-slate-600">Xác nhận</div>
                                  <div className="text-[11px] text-slate-500">
                                    {checkoutProofImage ? 'Đã có ảnh minh chứng' : 'Vui lòng tải ảnh ở trên'}
                                  </div>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-700 shrink-0">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#2197C0]"
                                    checked={!!checkedCheckoutByMemberId[memberId]}
                                    onChange={(e) => {
                                      const nextChecked = e.target.checked;
                                      setCheckedCheckoutByMemberId((prev) => ({
                                        ...prev,
                                        [memberId]: nextChecked,
                                      }));
                                    }}
                                    disabled={isSubmitting || !checkoutProofImage}
                                  />
                                  Chọn
                                </label>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {previewImgUrl ? (
        <div className="absolute inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={closePreview}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-full max-w-[900px]">
              <button
                type="button"
                className="absolute -top-3 -right-3 rounded-full bg-white/95 border border-slate-200 p-2 text-slate-700 shadow hover:bg-white"
                onClick={closePreview}
                aria-label="Đóng ảnh"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative w-full rounded-xl bg-black/20 overflow-hidden">
                <img
                  src={previewImgUrl}
                  alt="Xem trước"
                  className="max-h-[90vh] w-full object-contain"
                />
                {previewImgUrl === autoPreviewUrl ? (
                  <div className="absolute inset-0 pointer-events-none">
                    {autoDetectedFaces.map((f) => (
                      <div
                        key={`face-${f.faceIndex}`}
                        className={cn(
                          'absolute border-2 rounded-[2px]',
                          f.isMatched ? 'border-emerald-400/90' : 'border-white/50',
                        )}
                        style={{
                          left: `${Math.max(0, Math.min(1, f.boundingBox.left)) * 100}%`,
                          top: `${Math.max(0, Math.min(1, f.boundingBox.top)) * 100}%`,
                          width: `${Math.max(0, Math.min(1, f.boundingBox.width)) * 100}%`,
                          height: `${Math.max(0, Math.min(1, f.boundingBox.height)) * 100}%`,
                        }}
                      />
                    ))}
                    {autoMatchedResults.map((m) => (
                      <div
                        key={`match-${m.attendanceId}-${m.detectedFaceIndex}`}
                        className="absolute"
                        style={{
                          left: `${Math.max(0, Math.min(1, m.boundingBox.left)) * 100}%`,
                          top: `${Math.max(0, Math.min(1, m.boundingBox.top)) * 100}%`,
                        }}
                      >
                        <div className="translate-y-[-110%] rounded-md bg-emerald-600/90 px-2 py-1 text-[10px] font-semibold text-white shadow">
                          {m.similarity.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
