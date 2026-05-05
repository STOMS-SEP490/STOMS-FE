import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff } from 'lucide-react';
import { DatePicker, Image, message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentResponse, ReservationDetail } from '@/modules/reservation/reservation.types';
import reservationApi from '@/modules/reservation/api/reservationApi';
import sessionApi from '@/modules/request/api/sessionApi';
import {
  normalizeEquipmentPagedResponse,
  normalizeReservationResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { EQUIPMENT_STATUS_OPTIONS, getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/status';

type Props = {
  open: boolean;
  reservation: ReservationDetail | null;
  requestId?: number | null; // Optional requestId to load all sessions
  onClose: () => void;
  onSaved: (detail: ReservationDetail) => void | Promise<void>;
};

const AVAIL_PAGE = 200;

function equipmentFromDetailToListItem(
  equipmentReservations: NonNullable<ReservationDetail['EquipmentReservations']>,
): Map<number, EquipmentResponse> {
  const m = new Map<number, EquipmentResponse>();
  for (const er of equipmentReservations) {
    const eq = er.Equipment;
    if (!eq) continue;
    m.set(er.EquipmentId, {
      EquipmentId: er.EquipmentId,
      CategoryId: eq.CategoryId,
      CategoryName: eq.CategoryName ?? null,
      SponsoredBy: '',
      EquipmentName: eq.EquipmentName ?? `Thiết bị #${er.EquipmentId}`,
      EquipmentCode: eq.EquipmentCode ?? String(er.EquipmentId),
      HandoverMinute: '',
      Status: eq.Status ?? '',
      Description: '',
      ImgLink: eq.ImgLink ?? null,
      CreatedAt: null,
    });
  }
  return m;
}

export default function EditReservationModal({ open, reservation, requestId, onClose, onSaved }: Props) {
  const [startAtLocal, setStartAtLocal] = useState('');
  const [endAtLocal, setEndAtLocal] = useState('');
  const [sessionIds, setSessionIds] = useState<number[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentResponse>>({});

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [availabilityItems, setAvailabilityItems] = useState<EquipmentResponse[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // All sessions from the request
  const [allSessions, setAllSessions] = useState<Array<{
    SessionId: number
    SessionNo: number
    StartAt: string
    EndAt: string
    ReservationId: number | null
  }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const hasStarted = reservation ? !dayjs(reservation.StartAt).isAfter(dayjs()) : false;
  const hasEnded = reservation ? !dayjs(reservation.EndAt).isAfter(dayjs()) : false;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await categoryApi.getCategories({ pageNumber: 1, pageSize: 200 });
        if (!cancelled) setCategories(res.items ?? []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !reservation) return;
    setStartAtLocal(
      reservation.StartAt ? dayjs(reservation.StartAt).format('YYYY-MM-DDTHH:mm') : '',
    );
    setEndAtLocal(reservation.EndAt ? dayjs(reservation.EndAt).format('YYYY-MM-DDTHH:mm') : '');
    const sids = (reservation.Sessions ?? []).map((s) => s.SessionId);
    setSessionIds(sids);
    const eqList = reservation.EquipmentReservations ?? [];
    const activeIds = eqList
      .filter((er) => !er.IsTemporarilyCancelled)
      .map((er) => er.EquipmentId);
    const fallbackIds = eqList.map((er) => er.EquipmentId);
    const initialIds = activeIds.length > 0 ? activeIds : fallbackIds;
    setSelectedEquipmentIds(initialIds);
    const byDetail = equipmentFromDetailToListItem(eqList);
    setSelectedEquipmentById(Object.fromEntries(byDetail));
    setSearch('');
    setCategoryId(null);
    setStatusFilter(null);
    setAvailabilityError(null);
  }, [open, reservation]);

  // Load all sessions of the request if requestId is provided
  useEffect(() => {
    if (!open || !requestId) {
      setAllSessions([]);
      return;
    }

    let cancelled = false;
    const loadSessions = async () => {
      try {
        setLoadingSessions(true);
        const res = await sessionApi.getFilter({
          RequestId: requestId,
          PageNumber: 1,
          PageSize: 500,
        });

        if (cancelled) return;

        const sessions = (res.Items ?? [])
          .filter((s) => Number(s.SessionId) > 0)
          .map((s) => ({
            SessionId: Number(s.SessionId),
            SessionNo: Number(s.SessionNo ?? 0),
            StartAt: String(s.StartAt ?? ''),
            EndAt: String(s.EndAt ?? ''),
            ReservationId: s.ReservationId != null ? Number(s.ReservationId) : null,
          }))
          .sort((a, b) => a.SessionNo - b.SessionNo);

        setAllSessions(sessions);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load sessions:', err);
          setAllSessions([]);
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [open, requestId, reservation?.ReservationId]);

  const loadAvailability = useCallback(async () => {
    if (!open || !reservation) return;
    const start = dayjs(startAtLocal);
    const end = dayjs(endAtLocal);
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      setAvailabilityItems([]);
      return;
    }
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const res = normalizeEquipmentPagedResponse(
        await reservationApi.getAvailability({
          StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
          EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
          CategoryIds: categoryId != null ? [categoryId] : undefined,
          Statuses: statusFilter != null ? [statusFilter] : undefined,
          PageNumber: 1,
          PageSize: AVAIL_PAGE,
        }),
      );
      setAvailabilityItems(res.Items ?? []);
    } catch (e: unknown) {
      const msg = getErrorMessage(
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: unknown } }).response?.data
          : e
      );
      setAvailabilityError(msg || 'Không tải được thiết bị khả dụng.');
      setAvailabilityItems([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [open, reservation, startAtLocal, endAtLocal, categoryId, statusFilter]);

  useEffect(() => {
    if (!open || !reservation) return;
    const t = window.setTimeout(() => {
      void loadAvailability();
    }, 350);
    return () => window.clearTimeout(t);
  }, [open, reservation, startAtLocal, endAtLocal, categoryId, statusFilter, loadAvailability]);

  const mergedEquipmentList = useMemo(() => {
    if (!reservation) return [];
    const byId = new Map<number, EquipmentResponse>();
    for (const eq of availabilityItems) {
      byId.set(eq.EquipmentId, eq);
    }
    const fromRes = equipmentFromDetailToListItem(reservation.EquipmentReservations ?? []);
    fromRes.forEach((eq, id) => {
      if (!byId.has(id)) byId.set(id, eq);
    });
    return Array.from(byId.values());
  }, [availabilityItems, reservation]);

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = mergedEquipmentList;
    if (q) {
      list = list.filter(
        (eq) =>
          (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
          (eq.EquipmentCode ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [mergedEquipmentList, search]);

  const selectEquipment = (eq: EquipmentResponse, select: boolean) => {
    if (select) {
      setSelectedEquipmentIds((prev) =>
        prev.includes(eq.EquipmentId) ? prev : [...prev, eq.EquipmentId],
      );
      setSelectedEquipmentById((prev) => ({ ...prev, [eq.EquipmentId]: eq }));
    } else {
      setSelectedEquipmentIds((prev) => prev.filter((id) => id !== eq.EquipmentId));
      setSelectedEquipmentById((prev) => {
        const next = { ...prev };
        delete next[eq.EquipmentId];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!reservation) return;
    const start = dayjs(startAtLocal);
    const end = dayjs(endAtLocal);
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      message.error('Thời gian mượn/trả không hợp lệ.');
      return;
    }
    if (selectedEquipmentIds.length === 0) {
      message.error('Chọn ít nhất một thiết bị.');
      return;
    }
    const hasAnySessions = allSessions.length > 0 || (reservation.Sessions ?? []).length > 0;
    if (hasAnySessions && sessionIds.length === 0) {
      message.error('Chọn ít nhất một buổi.');
      return;
    }

    setSubmitLoading(true);
    try {
      const detail = normalizeReservationResponse(
        await reservationApi.update(reservation.ReservationId, {
          StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
          EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
          Equipment: selectedEquipmentIds.map((EquipmentId) => ({ EquipmentId })),
          SessionIds: hasAnySessions && sessionIds.length > 0 ? sessionIds : undefined,
        }),
      );
      message.success('Đã cập nhật đặt trước.');
      await onSaved(detail);
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : err
      );
      message.error(msg || 'Cập nhật đặt trước thất bại.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleSession = (sessionId: number, checked: boolean) => {
    setSessionIds((prev) => {
      const newIds = checked 
        ? (prev.includes(sessionId) ? prev : [...prev, sessionId])
        : prev.filter((id) => id !== sessionId);
      
      updateTimeRangeFromSessions(newIds);
      return newIds;
    });
  };

  const updateTimeRangeFromSessions = (selectedIds: number[]) => {
    if (selectedIds.length === 0) return;

    const sessions = allSessions.length > 0 ? allSessions : (reservation?.Sessions ?? []);
    const selectedSessions = sessions.filter(s => selectedIds.includes(s.SessionId));
    
    if (selectedSessions.length === 0) return;

    const startTimes = selectedSessions
      .map(s => dayjs(s.StartAt))
      .filter(d => d.isValid());
    
    const endTimes = selectedSessions
      .map(s => dayjs(s.EndAt))
      .filter(d => d.isValid());

    if (startTimes.length > 0 && endTimes.length > 0) {
      const earliestStart = startTimes.reduce((min, curr) => curr.isBefore(min) ? curr : min);
      const latestEnd = endTimes.reduce((max, curr) => curr.isAfter(max) ? curr : max);
      
      setStartAtLocal(earliestStart.format('YYYY-MM-DDTHH:mm'));
      setEndAtLocal(latestEnd.format('YYYY-MM-DDTHH:mm'));
    }
  };

  if (!reservation) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Sửa đơn yêu cầu thiết bị #${reservation.ReservationId}`}
      description={
        hasEnded
          ? 'Đặt trước đã kết thúc, không thể chỉnh sửa.'
          : hasStarted
            ? 'Đặt trước đã bắt đầu'
            : 'Điều chỉnh thời gian, buổi và thiết bị.'
      }
      className="max-w-4xl w-[min(96vw,56rem)] max-h-[92vh]"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {hasEnded ? (
          <p className="text-sm text-red-600">Không thể sửa đặt trước đã kết thúc.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black">Giờ mượn</label>
                <DatePicker
                  className="h-9 w-full text-xs text-black border-gray-200 bg-white"
                  value={startAtLocal ? dayjs(startAtLocal) : null}
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  disabled={hasStarted}
                  onChange={(v) => setStartAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black">Giờ trả</label>
                <DatePicker
                  className="h-9 w-full text-xs text-black border-gray-200 bg-white"
                  value={endAtLocal ? dayjs(endAtLocal) : null}
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  disabled={hasStarted}
                  onChange={(v) => setEndAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '')}
                />
              </div>
            </div>

            {((allSessions.length > 0) || (reservation.Sessions ?? []).length > 0) && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black">
                  Buổi liên quan {loadingSessions && <span className="text-xs text-gray-500">(Đang tải...)</span>}
                </label>
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 max-h-40 overflow-y-auto">
                  {(allSessions.length > 0 ? allSessions : (reservation.Sessions ?? []))
                    .filter((s) => {
                      const hasOtherReservation = 'ReservationId' in s && s.ReservationId != null && s.ReservationId !== reservation.ReservationId;
                      return !hasOtherReservation;
                    })
                    .map((s) => {
                      const isChecked = sessionIds.includes(s.SessionId);

                      return (
                        <label
                          key={s.SessionId}
                          className={`flex items-center gap-3 py-2 rounded-lg px-2 -mx-2 transition-colors cursor-pointer ${
                            isChecked ? 'bg-sky-50/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-[#2197C0] focus:ring-[#2197C0]"
                            checked={isChecked}
                            onChange={(e) => toggleSession(s.SessionId, e.target.checked)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              Buổi {s.SessionNo} (#{s.SessionId})
                            </div>
                            <div className="text-xs text-gray-500">
                              {dayjs(s.StartAt).format('DD/MM/YYYY HH:mm')} – {dayjs(s.EndAt).format('HH:mm')}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {selectedEquipmentIds.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-black">
                  Đã chọn ({selectedEquipmentIds.length})
                </label>
                <div className="flex flex-wrap gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                  {selectedEquipmentIds.map((id) => {
                    const meta = selectedEquipmentById[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          meta
                            ? selectEquipment(meta, false)
                            : setSelectedEquipmentIds((p) => p.filter((x) => x !== id))
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#2197C0]/30 bg-[#2197C0]/5 px-3 py-1 text-xs text-[#2197C0] hover:bg-[#2197C0]/10 transition-colors"
                      >
                        <span className="max-w-[200px] truncate font-medium">
                          {meta?.EquipmentName ?? `Thiết bị #${id}`}
                        </span>
                        <span className="text-[#2197C0]/60">×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-black">Thiết bị khả dụng</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Tìm theo tên / mã"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 text-xs text-black border-gray-200 bg-white rounded-xl"
                  />
                </div>
                <Select
                  value={categoryId != null ? String(categoryId) : 'all'}
                  onValueChange={(v) => setCategoryId(v === 'all' ? null : Number(v))}
                >
                  <SelectTrigger className="h-9 w-[160px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90">
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter != null ? String(statusFilter) : 'all'}
                  onValueChange={(v) => setStatusFilter(v === 'all' ? null : Number(v))}
                >
                  <SelectTrigger className="h-9 w-[160px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {availabilityLoading ? (
                <div className="py-10 text-center text-xs text-slate-500 rounded-xl bg-white/60">
                  Đang tải thiết bị...
                </div>
              ) : availabilityError ? (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-md">{availabilityError}</p>
              ) : filteredEquipment.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center rounded-xl bg-gray-50">
                  Không có thiết bị phù hợp.
                </p>
              ) : (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto rounded-md bg-white px-1 py-2 border border-gray-200">
                  {filteredEquipment.map((eq) => {
                    const isSelected = selectedEquipmentIds.includes(eq.EquipmentId);
                    const code = (eq.EquipmentCode ?? '').trim();
                    const name = (eq.EquipmentName ?? '').trim();
                    const displayName = name && code ? `${name} - ${code}` : name || code || `Thiết bị #${eq.EquipmentId}`;
                    const cat = (eq.CategoryName ?? '').trim();
                    const alt = eq.EquipmentName ?? `Equipment ${eq.EquipmentId}`;
                    const statusLabel = getEquipmentStatusDisplay(eq.Status ?? '');

                    return (
                      <div
                        key={eq.EquipmentId}
                        className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                          isSelected ? 'bg-sky-50/95' : 'hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                          {eq.ImgLink ? (
                            <Image
                              src={eq.ImgLink}
                              alt={alt}
                              width={40}
                              height={40}
                              className="h-10 w-10 object-cover"
                              preview={{ mask: false }}
                            />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => selectEquipment(eq, !isSelected)}
                          className="flex-1 flex items-center justify-between gap-2 text-left"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{displayName}</div>
                            <div className="text-[11px] text-gray-500 truncate">Danh mục: {cat || '---'}</div>
                            <div className="mt-1">
                              <span className="text-[11px] text-gray-500 mr-1">Trạng thái:</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getEquipmentStatusColor(eq.Status)}`}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                              isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200/80'
                            }`}
                            aria-hidden
                          >
                            {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={submitLoading}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitLoading || hasEnded}
                className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
              >
                {submitLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
