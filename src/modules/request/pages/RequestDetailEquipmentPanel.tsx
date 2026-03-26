import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Search } from 'lucide-react';
import { DatePicker, message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentListItem } from '@/modules/equipment/equipment';
import reservationApi from '../api/reservationApi';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';

export type SessionOption = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
};

type ReservationRow = {
  sessionId: number | null;
  startAtLocal: string;
  endAtLocal: string;
  categoryId: number | null;
  equipmentIds: number[];
  search: string;
};

const PAGE_SIZE = 50;

type Props = {
  sessions: SessionOption[];
  createdByMemberId: number;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function RequestDetailEquipmentPanel({
  sessions,
  createdByMemberId,
  onClose,
  onSuccess,
}: Props) {
  const [reservationRows, setReservationRows] = useState<ReservationRow[]>([
    { sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' },
  ]);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentListItem>>({});
  const [availabilityByKey, setAvailabilityByKey] = useState<
    Record<string, { items: EquipmentListItem[]; total: number; loading: boolean; error: string | null }>
  >({});
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [reserveSubmitLoading, setReserveSubmitLoading] = useState(false);
  const [reserveSubmitError, setReserveSubmitError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState<string>('Hình ảnh thiết bị');

  // Load categories (for filter dropdown)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setCategoriesLoading(true);
        // Pull a reasonably large page; categories list is typically small.
        const res = await categoryApi.getCategories({ pageNumber: 1, pageSize: 200 });
        if (cancelled) return;
        setCategories(res.items ?? []);
      } catch {
        if (cancelled) return;
        setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getRowAvailabilityKey = useCallback((row: ReservationRow) => {
    return [
      row.sessionId ?? 'none',
      row.startAtLocal || 'none',
      row.endAtLocal || 'none',
      row.categoryId ?? 'all',
    ].join('|');
  }, []);

  // UX: chỉ cho đặt 1 lần / 1 phiên trong panel này => không cần "giữ chỗ" giữa nhiều dòng.

  // Load thiết bị khả dụng theo từng dòng (session + start/end + category)
  useEffect(() => {
    if (sessions.length === 0) return;
    const rowsToLoad = reservationRows
      .filter((r) => r.sessionId != null && r.startAtLocal && r.endAtLocal)
      .filter((r) => {
        const key = getRowAvailabilityKey(r);
        return !availabilityByKey[key]?.loading && !availabilityByKey[key]?.items?.length;
      });
    if (rowsToLoad.length === 0) return;

    const load = async (row: ReservationRow) => {
      if (row.sessionId == null) return;
      const key = getRowAvailabilityKey(row);
      setAvailabilityByKey((prev) => ({
        ...prev,
        [key]: { items: [], total: 0, loading: true, error: null },
      }));

      try {
        const start = dayjs(row.startAtLocal);
        const end = dayjs(row.endAtLocal);
        if (!start.isValid() || !end.isValid()) {
          setAvailabilityByKey((prev) => ({
            ...prev,
            [key]: { items: [], total: 0, loading: false, error: 'Thời gian mượn/trả không hợp lệ.' },
          }));
          return;
        }
        if (!end.isAfter(start)) {
          setAvailabilityByKey((prev) => ({
            ...prev,
            [key]: { items: [], total: 0, loading: false, error: 'Giờ trả phải sau giờ mượn.' },
          }));
          return;
        }

        const res = await reservationApi.getAvailability({
          startAt: start.format('YYYY-MM-DDTHH:mm:ss'),
          endAt: end.format('YYYY-MM-DDTHH:mm:ss'),
          categoryIds: row.categoryId != null ? [row.categoryId] : undefined,
          pageNumber: 1,
          pageSize: PAGE_SIZE,
        });

        setAvailabilityByKey((prev) => ({
          ...prev,
          [key]: { items: res.items, total: res.totalItems, loading: false, error: null },
        }));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị khả dụng.';
        setAvailabilityByKey((prev) => ({
          ...prev,
          [key]: { items: [], total: 0, loading: false, error: msg },
        }));
      }
    };

    rowsToLoad.forEach((r) => void load(r));
  }, [reservationRows, sessions, availabilityByKey, getRowAvailabilityKey]);

  const setReservationRowSession = useCallback((_index: number, sessionId: number | null) => {
    setReservationRows((prev) => {
      const next = prev.length ? [...prev] : [{ sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' }];
      const session = sessionId != null ? sessions.find((s) => s.sessionId === sessionId) : undefined;
      const startAtLocal = session?.startAt ? dayjs(session.startAt).format('YYYY-MM-DDTHH:mm') : '';
      const endAtLocal = session?.endAt ? dayjs(session.endAt).format('YYYY-MM-DDTHH:mm') : '';
      next[0] = {
        ...next[0],
        sessionId,
        startAtLocal,
        endAtLocal,
        categoryId: null,
        equipmentIds: [],
        search: next[0].search ?? '',
      };
      return [next[0]];
    });
  }, [sessions]);

  const setReservationRowTime = useCallback((_index: number, patch: Partial<Pick<ReservationRow, 'startAtLocal' | 'endAtLocal'>>) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      return [{ ...base, ...patch, equipmentIds: [] }];
    });
    // Changing time invalidates availability; clear selected items to avoid stale reservations.
    setSelectedEquipmentById({});
  }, []);

  const setReservationRowCategory = useCallback((_index: number, categoryId: number | null) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      // Changing category is only a filter; do NOT clear selected equipments.
      return [{ ...base, categoryId }];
    });
  }, []);

  const setReservationRowSearch = useCallback((_index: number, search: string) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      return [{ ...base, search }];
    });
  }, []);

  const toggleReservationRowEquipment = useCallback((_rowIndex: number, equipment: EquipmentListItem) => {
    setReservationRows((prev) => {
      const next = prev.length ? [...prev] : [{ sessionId: null, startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' }];
      const row = next[0];
      const exists = row.equipmentIds.includes(equipment.equipmentId);
      const ids = exists
        ? row.equipmentIds.filter((id) => id !== equipment.equipmentId)
        : [...row.equipmentIds, equipment.equipmentId];
      next[0] = { ...row, equipmentIds: ids };
      return [next[0]];
    });
    setSelectedEquipmentById((prev) => {
      const next = { ...prev };
      if (next[equipment.equipmentId]) delete next[equipment.equipmentId];
      else next[equipment.equipmentId] = equipment;
      return next;
    });
  }, []);

  const validReservationRows = useMemo(
    () =>
      reservationRows.filter(
        (r) =>
          r.sessionId != null &&
          r.equipmentIds.length > 0 &&
          dayjs(r.startAtLocal).isValid() &&
          dayjs(r.endAtLocal).isValid() &&
          dayjs(r.endAtLocal).isAfter(dayjs(r.startAtLocal))
      ) as { sessionId: number; equipmentIds: number[]; startAtLocal: string; endAtLocal: string }[],
    [reservationRows]
  );

  const handleReserveSubmit = useCallback(async () => {
    if (validReservationRows.length === 0) return;
    if (createdByMemberId <= 0) {
      setReserveSubmitError('Vui lòng đăng nhập để đặt thiết bị.');
      return;
    }
    setReserveSubmitLoading(true);
    setReserveSubmitError(null);
    try {
      const row = validReservationRows[0];
      // Sessions prop is expected to contain only sessions that are NOT reserved yet.
      // Guard against stale UI state: if session is no longer in selectable list, block submit.
      if (!sessions.some((s) => s.sessionId === row.sessionId)) {
        setReserveSubmitError('Phiên này đã có thiết bị đặt trước. Vui lòng chỉnh sửa trong chi tiết phiên.');
        return;
      }
      const start = dayjs(row.startAtLocal);
      const end = dayjs(row.endAtLocal);
      if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
        setReserveSubmitError('Thời gian không hợp lệ.');
        return;
      }
      await reservationApi.create({
        sessionIds: [row.sessionId],
        startAt: start.format('YYYY-MM-DDTHH:mm:ss'),
        endAt: end.format('YYYY-MM-DDTHH:mm:ss'),
        equipment: row.equipmentIds.map((equipmentId) => ({ equipmentId })),
      });
      message.success('Đã tạo đặt trước thiết bị.');
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      const raw =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
      const friendly = raw.includes('StartAt phải >= thời điểm hiện tại')
        ? 'Phiên này đã quá hạn để đặt trước thiết bị.'
        : raw || 'Đặt trước thiết bị thất bại.';
      setReserveSubmitError(friendly);
    } finally {
      setReserveSubmitLoading(false);
    }
  }, [validReservationRows, createdByMemberId, onSuccess, onClose, sessions]);

  return (
    <>
      <div className="flex flex-col gap-4 h-full min-h-[70vh]">
        <p className="text-xs text-gray-500">
          Mỗi dòng: chọn 1 phiên và 1 hoặc nhiều thiết bị → tạo 1 đặt trước. Có thể đặt thiết bị A cho phiên 1, thiết bị B cho phiên 2, hoặc cùng thiết bị A cho nhiều phiên (nhiều dòng).
        </p>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
          {reservationRows.slice(0, 1).map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">Đặt trước cho 1 phiên</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Phiên học</label>
                <Select
                  value={row.sessionId != null ? String(row.sessionId) : ''}
                  onValueChange={(v) =>
                    setReservationRowSession(rowIndex, v ? Number(v) : null)
                  }
                >
                  <SelectTrigger className="h-10 w-full text-sm bg-white text-gray-700 border-gray-300">
                    <SelectValue placeholder="— Chọn phiên —" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.sessionId} value={String(s.sessionId)} className="text-gray-800">
                        Phiên {s.sessionNo} · {dayjs(s.startAt).format('DD/MM HH:mm')}–{dayjs(s.endAt).format('HH:mm')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {row.sessionId != null && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ mượn</label>
                      <DatePicker
                        className="h-9 w-full text-xs text-black border-gray-200 bg-white rounded-lg"
                        value={row.startAtLocal ? dayjs(row.startAtLocal) : null}
                        showTime={{ format: 'HH:mm' }}
                        format="DD/MM/YYYY HH:mm"
                        placeholder="Chọn giờ mượn"
                        onChange={(v) =>
                          setReservationRowTime(rowIndex, {
                            startAtLocal: v ? v.format('YYYY-MM-DDTHH:mm') : '',
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ trả</label>
                      <DatePicker
                        className="h-9 w-full text-xs text-black border-gray-200 bg-white rounded-lg"
                        value={row.endAtLocal ? dayjs(row.endAtLocal) : null}
                        showTime={{ format: 'HH:mm' }}
                        format="DD/MM/YYYY HH:mm"
                        placeholder="Chọn giờ trả"
                        onChange={(v) =>
                          setReservationRowTime(rowIndex, {
                            endAtLocal: v ? v.format('YYYY-MM-DDTHH:mm') : '',
                          })
                        }
                      />
                    </div>
                  </div>

                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                    Thiết bị khả dụng (chọn ít nhất 1)
                  </label>
                  {row.equipmentIds.length > 0 && (
                    <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2">
                      <div className="text-[11px] font-semibold text-blue-700 mb-1">
                        Thiết bị đã chọn ({row.equipmentIds.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {row.equipmentIds.map((id) => {
                          const meta = selectedEquipmentById[id];
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                if (meta) toggleReservationRowEquipment(rowIndex, meta);
                                else {
                                  // Fallback: if meta missing, just remove id from selection.
                                  setReservationRows((prev) => {
                                    const base = prev[0];
                                    if (!base) return prev;
                                    return [{ ...base, equipmentIds: base.equipmentIds.filter((x) => x !== id) }];
                                  });
                                  setSelectedEquipmentById((prev) => {
                                    const next = { ...prev };
                                    delete next[id];
                                    return next;
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-800 hover:bg-blue-50"
                              title="Bỏ chọn"
                            >
                              <span className="max-w-[220px] truncate">
                                {meta?.equipmentName ?? `Thiết bị #${id}`}
                              </span>
                              <span className="text-blue-500">×</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Tìm theo tên hoặc mã thiết bị..."
                        value={row.search ?? ''}
                        onChange={(e) => setReservationRowSearch(rowIndex, e.target.value)}
                        className="pl-8 py-1.5 text-xs text-black border-gray-200 bg-white rounded-lg"
                      />
                    </div>
                    <Select
                      value={row.categoryId != null ? String(row.categoryId) : 'all'}
                      onValueChange={(v) => setReservationRowCategory(rowIndex, v === 'all' ? null : Number(v))}
                    >
                      <SelectTrigger className="h-9 w-[180px] text-xs bg-white text-gray-700 border-gray-300">
                        <SelectValue placeholder="Danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-gray-800">
                          Tất cả danh mục
                        </SelectItem>
                        {categoriesLoading ? (
                          <SelectItem value="__loading" disabled className="text-gray-500">
                            Đang tải...
                          </SelectItem>
                        ) : (
                          categories.map((c) => (
                            <SelectItem key={(c as any).categoryId ?? (c as any).CategoryId} value={String((c as any).categoryId ?? (c as any).CategoryId)} className="text-gray-800">
                              {(c as any).categoryName ?? (c as any).CategoryName ?? '---'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {(() => {
                    const key = getRowAvailabilityKey(row);
                    const cache = availabilityByKey[key];
                    if (!cache) {
                      return (
                        <div className="py-4 text-center text-xs text-gray-500 rounded-lg bg-white border border-gray-100">
                          {row.startAtLocal && row.endAtLocal ? 'Đang tải thiết bị...' : 'Vui lòng chọn giờ mượn/giờ trả.'}
                        </div>
                      );
                    }
                    if (cache.error) {
                      return (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{cache.error}</p>
                      );
                    }
                    const rawItems = cache.items;
                    const q = (row.search ?? '').trim().toLowerCase();
                    const itemsBase = rawItems;
                    const items = q
                      ? itemsBase.filter(
                          (eq) =>
                            (eq.equipmentName ?? '').toLowerCase().includes(q) ||
                            (eq.equipmentCode ?? '').toLowerCase().includes(q)
                        )
                      : itemsBase;
                    if (items.length === 0) {
                      return (
                        <p className="text-xs text-gray-500 py-2">
                          {rawItems.length === 0
                            ? 'Không có thiết bị khả dụng trong khung giờ phiên này.'
                            : 'Không có thiết bị nào trùng với từ khóa tìm kiếm.'}
                        </p>
                      );
                    }
                    return (
                      <div className="rounded-xl border border-gray-200 bg-white px-2 py-2 space-y-2">
                        {items.map((eq) => {
                          const isSelected = row.equipmentIds.includes(eq.equipmentId);
                          return (
                            <div
                              key={eq.equipmentId}
                              className={`rounded-xl border px-3 py-2 flex items-center gap-3 text-sm transition ${
                                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center ${
                                  eq.imgLink ? 'border bg-gray-50' : 'bg-gray-50'
                                }`}
                              >
                                {eq.imgLink ? (
                                  <button
                                    type="button"
                                    className="w-full h-full"
                                    onClick={() => {
                                      setImageUrl(eq.imgLink ?? null);
                                      setImageAlt(eq.equipmentName ?? 'Hình ảnh thiết bị');
                                      setImageOpen(true);
                                    }}
                                    title="Xem ảnh thiết bị"
                                  >
                                    <img
                                      src={eq.imgLink}
                                      alt={eq.equipmentName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <ImageOff className="w-5 h-5 text-gray-300" />
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleReservationRowEquipment(rowIndex, eq)}
                                className="flex-1 flex items-center justify-between gap-2 text-left"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {eq.equipmentName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Mã: {eq.equipmentCode ?? eq.equipmentId}
                                  </div>
                                  <div className="text-[11px] text-gray-500 truncate">
                                    Danh mục:{' '}
                                    {(eq as any).categoryName ?? '---'}
                                  </div>
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
                    );
                  })()}
                  {row.equipmentIds.length > 0 && (
                    <p className="text-[11px] text-blue-600 mt-1.5">
                      Đã chọn {row.equipmentIds.length} thiết bị
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto bg-white/95 backdrop-blur border-t border-gray-100 pt-3">
          {reserveSubmitError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">{reserveSubmitError}</p>
          )}

          <div className="flex justify-end gap-3 pb-1">
            <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50"
              disabled={validReservationRows.length === 0 || reserveSubmitLoading}
              onClick={() => void handleReserveSubmit()}
            >
              {reserveSubmitLoading ? 'Đang xử lý...' : 'Đặt trước'}
            </Button>
          </div>
        </div>
      </div>

      {imageOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setImageOpen(false)}
        >
          <div
            className="max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrl ? (
              <img src={imageUrl} alt={imageAlt} className="w-full h-full object-contain" />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

