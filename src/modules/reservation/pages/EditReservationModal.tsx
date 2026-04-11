import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Search } from 'lucide-react';
import { DatePicker, Image, message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentResponse, ReservationDetail } from '@/modules/reservation/reservation.types';
import reservationApi from '@/modules/reservation/api/reservationApi';
import {
  normalizeEquipmentPagedResponse,
  normalizeReservationResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';

type Props = {
  open: boolean;
  reservation: ReservationDetail | null;
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

export default function EditReservationModal({ open, reservation, onClose, onSaved }: Props) {
  const [startAtLocal, setStartAtLocal] = useState('');
  const [endAtLocal, setEndAtLocal] = useState('');
  const [sessionIds, setSessionIds] = useState<number[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentResponse>>({});

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [availabilityItems, setAvailabilityItems] = useState<EquipmentResponse[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const hasStarted = reservation ? !dayjs(reservation.StartAt).isAfter(dayjs()) : false;
  const hasEnded = reservation ? !dayjs(reservation.EndAt).isAfter(dayjs()) : false;

  useEffect(() => {
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
  }, []);

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
    setAvailabilityError(null);
  }, [open, reservation?.ReservationId]);

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
          PageNumber: 1,
          PageSize: AVAIL_PAGE,
        }),
      );
      setAvailabilityItems(res.Items ?? []);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';
      setAvailabilityError(msg || 'Không tải được thiết bị khả dụng.');
      setAvailabilityItems([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [open, reservation, startAtLocal, endAtLocal, categoryId]);

  useEffect(() => {
    if (!open || !reservation) return;
    const t = window.setTimeout(() => {
      void loadAvailability();
    }, 350);
    return () => window.clearTimeout(t);
  }, [open, reservation?.ReservationId, startAtLocal, endAtLocal, categoryId, loadAvailability]);

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

  /** Đồng bộ meta khi bật chọn từ list */
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
    if ((reservation.Sessions ?? []).length > 0 && sessionIds.length === 0) {
      message.error('Chọn ít nhất một phiên.');
      return;
    }

    setSubmitLoading(true);
    try {
      const detail = normalizeReservationResponse(
        await reservationApi.update(reservation.ReservationId, {
          StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
          EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
          Equipment: selectedEquipmentIds.map((EquipmentId) => ({ EquipmentId })),
          SessionIds:
            (reservation.Sessions ?? []).length > 0 && sessionIds.length > 0
              ? sessionIds
              : undefined,
        }),
      );
      message.success('Đã cập nhật đặt trước.');
      await onSaved(detail);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Cập nhật đặt trước thất bại.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleSession = (sessionId: number, checked: boolean) => {
    setSessionIds((prev) => {
      if (checked) return prev.includes(sessionId) ? prev : [...prev, sessionId];
      return prev.filter((id) => id !== sessionId);
    });
  };

  if (!reservation) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Sửa đặt trước #${reservation.ReservationId}`}
      description={
        hasEnded
          ? 'Đặt trước đã kết thúc, không thể chỉnh sửa.'
          : hasStarted
            ? 'Đặt trước đã bắt đầu — chỉ có thể đổi danh sách thiết bị / phiên, không đổi khung giờ.'
            : 'Điều chỉnh thời gian, phiên và thiết bị. Thiết bị đang gán cho đặt trước này vẫn hiển thị trong danh sách.'
      }
      className="max-w-2xl w-[96vw]"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {hasEnded ? (
          <p className="text-sm text-red-600">Không thể sửa đặt trước đã kết thúc.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ mượn</label>
                <DatePicker
                  className="h-9 w-full text-xs border-gray-200 bg-white rounded-lg"
                  value={startAtLocal ? dayjs(startAtLocal) : null}
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  disabled={hasStarted}
                  onChange={(v) => setStartAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '')}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ trả</label>
                <DatePicker
                  className="h-9 w-full text-xs border-gray-200 bg-white rounded-lg"
                  value={endAtLocal ? dayjs(endAtLocal) : null}
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  disabled={hasStarted}
                  onChange={(v) => setEndAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '')}
                />
              </div>
            </div>

            {(reservation.Sessions ?? []).length > 0 ? (
              <div>
                <span className="block text-[11px] font-medium text-gray-500 mb-2">Phiên liên quan</span>
                <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50/50 px-3 py-2">
                  {(reservation.Sessions ?? []).map((s) => (
                    <label key={s.SessionId} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={sessionIds.includes(s.SessionId)}
                        onChange={(e) => toggleSession(s.SessionId, e.target.checked)}
                      />
                      <span>
                        Phiên {s.SessionNo} (#{s.SessionId}) ·{' '}
                        {dayjs(s.StartAt).format('DD/MM HH:mm')}–{dayjs(s.EndAt).format('HH:mm')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedEquipmentIds.length > 0 && (
              <div className="rounded-md border border-blue-100 bg-blue-50/40 px-3 py-2">
                <div className="text-[11px] font-semibold text-blue-700 mb-1">
                  Đã chọn ({selectedEquipmentIds.length})
                </div>
                <div className="flex flex-wrap gap-2">
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
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-800 hover:bg-blue-50"
                      >
                        <span className="max-w-[200px] truncate">
                          {meta?.EquipmentName ?? `Thiết bị #${id}`}
                        </span>
                        <span className="text-blue-500">×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Tìm theo tên hoặc mã thiết bị..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 py-1.5 text-xs border-gray-200 bg-white rounded-lg"
                />
              </div>
              <Select
                value={categoryId != null ? String(categoryId) : 'all'}
                onValueChange={(v) => setCategoryId(v === 'all' ? null : Number(v))}
              >
                <SelectTrigger className="h-9 w-[170px] text-xs bg-white text-gray-700 border-gray-300">
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
            </div>

            {availabilityLoading ? (
              <p className="text-xs text-gray-500 py-4 text-center">Đang tải thiết bị…</p>
            ) : availabilityError ? (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{availabilityError}</p>
            ) : filteredEquipment.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Không có thiết bị phù hợp.</p>
            ) : (
              <div className="rounded-md border border-gray-200 bg-white px-2 py-2 space-y-2 max-h-52 overflow-y-auto">
                {filteredEquipment.map((eq) => {
                  const isSelected = selectedEquipmentIds.includes(eq.EquipmentId);
                  return (
                    <div
                      key={eq.EquipmentId}
                      className={`rounded-md border px-3 py-2 flex items-center gap-3 text-sm transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center ${
                          eq.ImgLink ? 'border bg-gray-50' : 'bg-gray-50'
                        }`}
                      >
                        {eq.ImgLink ? (
                          <Image
                            src={eq.ImgLink}
                            alt={eq.EquipmentName ?? `#${eq.EquipmentId}`}
                            width={40}
                            height={40}
                            className="object-cover"
                            preview={{ mask: 'Xem ảnh' }}
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => selectEquipment(eq, !isSelected)}
                        className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{eq.EquipmentName}</div>
                          <div className="text-xs text-gray-500">Mã: {eq.EquipmentCode}</div>
                        </div>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 bg-white text-gray-400'
                          }`}
                        >
                          {isSelected ? <Check size={9} strokeWidth={3} /> : ''}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitLoading}>
                Hủy
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitLoading || hasEnded}>
                {submitLoading ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
