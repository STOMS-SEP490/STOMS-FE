import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { message, Popover } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import type { AssignmentResponse } from '@/modules/request/session.types';
import type { SuggestedStaff } from '@/modules/request/type';
import sessionService from '@/modules/request/api/sessionApi';
import { getAssignmentStatusInfo, ASSIGNMENT_STATUS } from '@/constants/status';

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

type Props = {
  sessionId: number;
  canEdit?: boolean;
  onAssignmentUpdated?: () => void;
};

/**
 * Component dành riêng cho Team Leader để phân công sinh viên trong nhóm của mình
 */
export default function TeamLeaderStaffAssignmentPanel({
  sessionId,
  canEdit = true,
  onAssignmentUpdated,
}: Props) {
  const [taAssignments, setTaAssignments] = useState<AssignmentResponse[]>([]);
  const [initialTaAssignments, setInitialTaAssignments] = useState<AssignmentResponse[]>([]);
  const [taSuggestionsByAssignmentId, setTaSuggestionsByAssignmentId] = useState<Record<number, SuggestedStaff[]>>({});
  const [initialTaByAssignmentId, setInitialTaByAssignmentId] = useState<Record<number, number>>({});
  const [taEditMode, setTaEditMode] = useState(false);
  const [taPickerAssignmentId, setTaPickerAssignmentId] = useState<number | null>(null);
  const [taSearchByAssignmentId, setTaSearchByAssignmentId] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load TA assignments
  useEffect(() => {
    let cancelled = false;
    const fetchTaAssignments = async () => {
      setLoading(true);
      try {
        const detail = await sessionService.getById(sessionId);
        if (cancelled) return;
        const taSlots = (detail.Assignments ?? []).filter((a) => {
          const role = String(a.StaffRole ?? '').toUpperCase();
          return role === 'TA' || role.includes('STUDENT') || role.includes('SV') || role.includes('SINH');
        });
        setTaAssignments(taSlots);
        setInitialTaAssignments(taSlots);
        setInitialTaByAssignmentId(
          taSlots.reduce<Record<number, number>>((acc, slot) => {
            const id = Number(slot.AssignmentId ?? 0);
            if (id > 0) acc[id] = Math.max(0, Number(slot.StaffMemberId ?? 0));
            return acc;
          }, {})
        );
        const pairs = await Promise.all(
          taSlots.map(async (a) => {
            try {
              const list = await assignmentApi.suggestStaff(Number(a.AssignmentId ?? 0));
              return [Number(a.AssignmentId ?? 0), list] as const;
            } catch {
              return [Number(a.AssignmentId ?? 0), [] as SuggestedStaff[]] as const;
            }
          })
        );
        if (cancelled) return;
        setTaSuggestionsByAssignmentId(
          pairs.reduce<Record<number, SuggestedStaff[]>>((acc, [id, list]) => {
            if (id > 0) acc[id] = list;
            return acc;
          }, {})
        );
      } catch (err) {
        if (!cancelled) {
          setTaAssignments([]);
          setInitialTaAssignments([]);
          setTaSuggestionsByAssignmentId({});
          setInitialTaByAssignmentId({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTaAssignments();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleAssignTaToSlot = useCallback(
    (assignmentId: number, staffMemberId: number) => {
      if (assignmentId <= 0) return;
      setTaAssignments((prev) =>
        prev.map((a) => {
          if (a.AssignmentId !== assignmentId) return a;
          const suggested = taSuggestionsByAssignmentId[assignmentId] ?? [];
          const picked = suggested.find((s) => s.memberId === staffMemberId);
          return {
            ...a,
            StaffMemberId: staffMemberId,
            StaffMember: picked
              ? {
                  MemberId: picked.memberId,
                  FullName: picked.fullName,
                  AvatarUrl: picked.avatarUrl || '',
                  Email: picked.email || '',
                  User: { Email: picked.email || '' },
                }
              : a.StaffMember,
          };
        })
      );
      setTaPickerAssignmentId(null);
    },
    [taSuggestionsByAssignmentId]
  );

  const handleLoadTaSuggestions = useCallback(async (assignmentId: number) => {
    if (assignmentId <= 0) return;
    try {
      const list = await assignmentApi.suggestStaff(assignmentId);
      setTaSuggestionsByAssignmentId((prev) => ({ ...prev, [assignmentId]: list }));
    } catch {
      // ignore
    }
  }, []);

  const changedTaAssignments = useMemo(
    () =>
      taAssignments
        .map((slot) => ({
          assignmentId: Number(slot.AssignmentId ?? 0),
          staffMemberId: Math.max(0, Number(slot.StaffMemberId ?? 0)),
        }))
        .filter(
          (item) =>
            item.assignmentId > 0 &&
            initialTaByAssignmentId[item.assignmentId] !== item.staffMemberId
        ),
    [initialTaByAssignmentId, taAssignments]
  );

  const handleSaveTaOnly = useCallback(async () => {
    if (saving) return;
    if (changedTaAssignments.length === 0) {
      setTaEditMode(false);
      return;
    }
    try {
      setSaving(true);
      await assignmentApi.assignMembers(changedTaAssignments);
      
      // Reload data từ server để lấy status mới
      const detail = await sessionService.getById(sessionId);
      const taSlots = (detail.Assignments ?? []).filter((a) => {
        const role = String(a.StaffRole ?? '').toUpperCase();
        return role === 'TA' || role.includes('STUDENT') || role.includes('SV') || role.includes('SINH');
      });
      
      setTaAssignments(taSlots);
      setInitialTaAssignments(taSlots);
      setInitialTaByAssignmentId(
        taSlots.reduce<Record<number, number>>((acc, slot) => {
          const id = Number(slot.AssignmentId ?? 0);
          if (id > 0) acc[id] = Math.max(0, Number(slot.StaffMemberId ?? 0));
          return acc;
        }, {})
      );
      
      message.success('Đã lưu phân công sinh viên.');
      setTaEditMode(false);
      onAssignmentUpdated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lưu phân công sinh viên thất bại.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }, [changedTaAssignments, saving, sessionId, onAssignmentUpdated]);

  const handleCancelTaEdit = useCallback(() => {
    setTaAssignments(initialTaAssignments);
    setTaPickerAssignmentId(null);
    setTaEditMode(false);
  }, [initialTaAssignments]);

  if (loading) {
    return (
      <section className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">Đang tải danh sách phân công...</p>
      </section>
    );
  }

  return (
    <section className="space-y-3 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-slate-900">Sinh viên tham dự</p>
        {taEditMode ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
              disabled={saving}
              onClick={handleCancelTaEdit}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
              disabled={saving}
              onClick={() => void handleSaveTaOnly()}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        ) : canEdit ? (
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
            disabled={saving}
            onClick={() => setTaEditMode(true)}
          >
            Chỉnh sửa
          </Button>
        ) : null}
      </div>

      {taAssignments.length === 0 ? (
        <p className="text-xs text-slate-500">Chưa có slot sinh viên để phân công ở buổi này.</p>
      ) : taEditMode ? (
        <div className="space-y-4">
          {taAssignments.map((slot, index) => {
            const assignmentId = Number(slot.AssignmentId ?? 0);
            const statusInfo = getAssignmentStatusInfo(slot.Status);
            const statusCode = statusInfo.code;
            // Chỉ cho phép chỉnh sửa khi status là PENDING (1), REJECTED (3), hoặc CANCELLED (4)
            const canEditThisSlot = 
              statusCode === ASSIGNMENT_STATUS.PENDING || 
              statusCode === ASSIGNMENT_STATUS.REJECTED || 
              statusCode === ASSIGNMENT_STATUS.CANCELLED;
            const suggestions = taSuggestionsByAssignmentId[assignmentId] ?? [];
            const selectedIdsOnOtherSlots = taAssignments
              .map((s) => (s.AssignmentId === assignmentId ? 0 : Math.max(0, Number(s.StaffMemberId ?? 0))))
              .filter((id) => id > 0);
            const q = (taSearchByAssignmentId[assignmentId] ?? '').trim().toLowerCase();
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
              <div
                key={assignmentId || index}
                className="border-b border-slate-200 bg-white py-2.5 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Sinh viên {index + 1}
                  </p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {canEditThisSlot ? (
                  <Popover
                    trigger="click"
                    open={taPickerAssignmentId === assignmentId}
                    onOpenChange={(visible) => {
                      setTaPickerAssignmentId(visible ? assignmentId : null);
                      if (visible) void handleLoadTaSuggestions(assignmentId);
                    }}
                    placement="bottomLeft"
                    destroyOnHidden
                    content={
                      <div className="w-[min(calc(100vw-2rem),20rem)] p-0.5">
                        <Input
                          className="h-8 text-xs border-slate-200"
                          placeholder="Tìm sinh viên..."
                          value={taSearchByAssignmentId[assignmentId] ?? ''}
                          onChange={(e) =>
                            setTaSearchByAssignmentId((prev) => ({
                              ...prev,
                              [assignmentId]: e.target.value,
                            }))
                          }
                        />
                        <div className="mt-2 max-h-56 overflow-y-auto no-scrollbar space-y-0.5">
                          {filteredSuggestions.length === 0 ? (
                            <p className="text-xs text-slate-500 px-2 py-3 text-center">
                              Không có gợi ý phù hợp.
                            </p>
                          ) : (
                            filteredSuggestions.map((staff) => (
                              <button
                                key={staff.memberId}
                                type="button"
                                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                                onClick={() => {
                                  handleAssignTaToSlot(assignmentId, staff.memberId);
                                }}
                              >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                  <img
                                    src={getAvatarSrc(staff.avatarUrl)}
                                    alt={staff.fullName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">
                                    {staff.fullName || '—'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {staff.email || staff.roleName || '—'}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    }
                    styles={{ content: { padding: 12 } }}
                  >
                    <button
                      type="button"
                      disabled={saving}
                      className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60 rounded-lg border border-slate-200"
                    >
                      {Number(slot.StaffMemberId ?? 0) > 0 ? (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                              <img
                                src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                                alt={slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {slot.StaffMember?.Email ||
                                  slot.StaffMember?.User?.Email ||
                                  'Nhấn để đổi sinh viên'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-slate-500 shrink-0">
                            {saving ? 'Đang lưu...' : 'Đổi'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                              <Plus className="h-5 w-5 stroke-[2.5]" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                Chưa chọn sinh viên
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-violet-700 shrink-0">
                            {saving ? 'Đang lưu...' : 'Thêm'}
                          </span>
                        </>
                      )}
                    </button>
                  </Popover>
                ) : (
                  <div className="w-full flex items-center justify-between gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {Number(slot.StaffMemberId ?? 0) > 0 ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                            alt={slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">Chưa chọn sinh viên</p>
                          <p className="text-xs text-slate-500 truncate">Không thể chỉnh sửa</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {taAssignments.map((slot, index) => {
            const statusInfo = getAssignmentStatusInfo(slot.Status);
            const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
            const rejectReason = slot.Reason?.trim() || '';
            
            return (
              <div
                key={Number(slot.AssignmentId ?? 0) || index}
                className="space-y-2"
              >
                <div className={`border-b border-slate-200 bg-white py-2.5 last:border-b-0 ${isRejected ? 'border-rose-200 bg-rose-50/30' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Sinh viên {index + 1}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2">
                    {Number(slot.StaffMemberId ?? 0) > 0 ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                            alt={slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {slot.StaffMember?.FullName || 'Sinh viên đã chọn'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">Chưa có sinh viên</p>
                          <p className="text-xs text-slate-500 truncate">Bấm chỉnh sửa để chọn sinh viên</p>
                        </div>
                      </div>
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
      )}
    </section>
  );
}
