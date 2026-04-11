import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Search } from 'lucide-react';
import { DatePicker, Image, Select as AntSelect, message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentResponse } from '@/modules/reservation/reservation.types';
import reservationApi from '../../reservation/api/reservationApi';
import { normalizeEquipmentPagedResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';

export type SessionOption = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
};

type ReservationRow = {
  sessionIds: number[];
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
    { sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' },
  ]);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentResponse>>({});
  const [availabilityByKey, setAvailabilityByKey] = useState<
    Record<string, { items: EquipmentResponse[]; total: number; loading: boolean; error: string | null }>
  >({});
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [reserveSubmitLoading, setReserveSubmitLoading] = useState(false);
  const [reserveSubmitError, setReserveSubmitError] = useState<string | null>(null);

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
      row.sessionIds.join(',') || 'none',
      row.startAtLocal || 'none',
      row.endAtLocal || 'none',
      row.categoryId ?? 'all',
    ].join('|');
  }, []);

  // UX: panel này hỗ trợ "đặt dài hạn" bằng cách chọn nhiều phiên cùng lúc,
  // lấy khung thời gian mượn/trả từ session đầu-cuối để check availability.

  // Load thiết bị khả dụng theo từng dòng (session + start/end + category)
  useEffect(() => {
    if (sessions.length === 0) return;
    const rowsToLoad = reservationRows
      .filter((r) => r.sessionIds.length > 0 && r.startAtLocal && r.endAtLocal)
      .filter((r) => {
        const key = getRowAvailabilityKey(r);
        return !availabilityByKey[key]?.loading && !availabilityByKey[key]?.items?.length;
      });
    if (rowsToLoad.length === 0) return;

    const load = async (row: ReservationRow) => {
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

        const res = normalizeEquipmentPagedResponse(
          await reservationApi.getAvailability({
            StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
            EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
            CategoryIds: row.categoryId != null ? [row.categoryId] : undefined,
            PageNumber: 1,
            PageSize: PAGE_SIZE,
          }),
        );

        setAvailabilityByKey((prev) => ({
          ...prev,
          [key]: { items: res.Items ?? [], total: res.TotalItems ?? 0, loading: false, error: null },
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

  const setReservationRowSessions = useCallback(
    (_index: number, nextSessionIds: number[]) => {
      // Đổi phiên => đổi khung thời gian => bỏ lựa chọn thiết bị để tránh stale.
      setSelectedEquipmentById({});
      setReservationRows((prev) => {
        const next =
          prev.length
            ? [...prev]
            : [
                { sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' },
              ];

        const selectedSessions = nextSessionIds
          .map((id) => sessions.find((s) => s.sessionId === id))
          .filter((s): s is SessionOption => !!s);

        const earliest = [...selectedSessions].sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf())[0];
        const latest = [...selectedSessions].sort((a, b) => dayjs(a.endAt).valueOf() - dayjs(b.endAt).valueOf()).slice(-1)[0];

        const startAtLocal = earliest?.startAt ? dayjs(earliest.startAt).format('YYYY-MM-DDTHH:mm') : '';
        const endAtLocal = latest?.endAt ? dayjs(latest.endAt).format('YYYY-MM-DDTHH:mm') : '';

        next[0] = {
          ...next[0],
          sessionIds: nextSessionIds,
          startAtLocal,
          endAtLocal,
          categoryId: null,
          equipmentIds: [],
          search: next[0].search ?? '',
        };
        return [next[0]];
      });
    },
    [sessions],
  );

  const setReservationRowTime = useCallback((_index: number, patch: Partial<Pick<ReservationRow, 'startAtLocal' | 'endAtLocal'>>) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      return [{ ...base, ...patch, equipmentIds: [] }];
    });
    // Changing time invalidates availability; clear selected items to avoid stale reservations.
    setSelectedEquipmentById({});
  }, []);

  const setReservationRowCategory = useCallback((_index: number, categoryId: number | null) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      // Changing category is only a filter; do NOT clear selected equipments.
      return [{ ...base, categoryId }];
    });
  }, []);

  const setReservationRowSearch = useCallback((_index: number, search: string) => {
    setReservationRows((prev) => {
      const base = prev[0] ?? { sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' };
      return [{ ...base, search }];
    });
  }, []);

  const toggleReservationRowEquipment = useCallback((_rowIndex: number, equipment: EquipmentResponse) => {
    setReservationRows((prev) => {
      const next = prev.length
        ? [...prev]
        : [{ sessionIds: [], startAtLocal: '', endAtLocal: '', categoryId: null, equipmentIds: [], search: '' }];
      const row = next[0];
      const exists = row.equipmentIds.includes(equipment.EquipmentId);
      const ids = exists
        ? row.equipmentIds.filter((id) => id !== equipment.EquipmentId)
        : [...row.equipmentIds, equipment.EquipmentId];
      next[0] = { ...row, equipmentIds: ids };
      return [next[0]];
    });
    setSelectedEquipmentById((prev) => {
      const next = { ...prev };
      if (next[equipment.EquipmentId]) delete next[equipment.EquipmentId];
      else next[equipment.EquipmentId] = equipment;
      return next;
    });
  }, []);

  const validReservationRows = useMemo(
    () =>
      reservationRows.filter(
        (r) =>
          r.sessionIds.length > 0 &&
          r.equipmentIds.length > 0 &&
          dayjs(r.startAtLocal).isValid() &&
          dayjs(r.endAtLocal).isValid() &&
          dayjs(r.endAtLocal).isAfter(dayjs(r.startAtLocal))
      ) as {
        sessionIds: number[];
        equipmentIds: number[];
        startAtLocal: string;
        endAtLocal: string;
      }[],
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
      const selectableIds = new Set(sessions.map((s) => s.sessionId));
      const notSelectable = row.sessionIds.filter((id) => !selectableIds.has(id));
      if (notSelectable.length > 0) {
        setReserveSubmitError('Một số phiên đã có thiết bị đặt trước. Vui lòng chỉnh sửa trong chi tiết phiên.');
        return;
      }
      const start = dayjs(row.startAtLocal);
      const end = dayjs(row.endAtLocal);
      if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
        setReserveSubmitError('Thời gian không hợp lệ.');
        return;
      }
      await reservationApi.create({
        SessionIds: row.sessionIds,
        StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
        EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
        Equipment: row.equipmentIds.map((EquipmentId) => ({ EquipmentId })),
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

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
          {reservationRows.slice(0, 1).map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="rounded-2xl bg-slate-50/70 p-5 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            >
             

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[11px] font-medium text-gray-500">Phiên học (chọn nhiều)</label>
                  {row.sessionIds.length > 0 && (
                    <span className="text-[11px] font-medium text-sky-800 bg-sky-100/80 rounded-full px-2.5 py-0.5">
                      {row.sessionIds.length} phiên
                    </span>
                  )}
                </div>
                {row.sessionIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {row.sessionIds.map((id) => {
                      const s = sessions.find((x) => x.sessionId === id);
                      if (!s) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setReservationRowSessions(rowIndex, row.sessionIds.filter((x) => x !== id))}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-sky-800 shadow-sm ring-1 ring-sky-200/60 hover:bg-sky-50/90 hover:ring-sky-300/70"
                          title="Bỏ phiên"
                        >
                          <span className="font-semibold">Phiên {s.sessionNo}</span>
                          <span className="text-sky-600">×</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sessionPickerOpen ? (
                  <AntSelect
                    mode="multiple"
                    open={sessionPickerOpen}
                    onDropdownVisibleChange={(open) => setSessionPickerOpen(open)}
                    style={{ width: '100%' }}
                    placeholder="— Chọn phiên —"
                    value={row.sessionIds.map((id) => String(id))}
                    showSearch
                    maxTagCount={0}
                    maxTagPlaceholder={() => null}
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const label = String((option as any)?.label ?? '');
                      return label.toLowerCase().includes(String(input).toLowerCase());
                    }}
                    onChange={(vals) => {
                      const next = (vals as Array<string | number>)
                        .map((v) => Number(v))
                        .filter((n) => Number.isFinite(n) && n > 0);
                      setReservationRowSessions(rowIndex, next);
                      setSessionPickerOpen(false);
                    }}
                    options={sessions.map((s) => ({
                      value: String(s.sessionId),
                      label: `Phiên ${s.sessionNo} · ${dayjs(s.startAt).format('DD/MM HH:mm')}–${dayjs(s.endAt).format('HH:mm')}`,
                    }))}
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full w-full border-slate-200/90 bg-white shadow-sm hover:bg-slate-50"
                    onClick={() => setSessionPickerOpen(true)}
                  >
                    {row.sessionIds.length > 0 ? 'Chọn thêm' : 'Chọn phiên'}
                  </Button>
                )}
              </div>

              {row.sessionIds.length > 0 && (
                <div className="space-y-4 pt-1 border-t border-slate-200/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ mượn</label>
                      <DatePicker
                        className="h-9 w-full text-xs text-black !rounded-xl border-slate-200/90 bg-white shadow-sm"
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
                        className="h-9 w-full text-xs text-black !rounded-xl border-slate-200/90 bg-white shadow-sm"
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

                  <label className="block text-[11px] font-medium text-slate-600 mb-2">
                    Thiết bị khả dụng (chọn ít nhất 1)
                  </label>
                  {row.equipmentIds.length > 0 && (
                    <div className="rounded-xl bg-sky-50/90 px-3 py-2.5">
                      <div className="text-[11px] font-semibold text-sky-900 mb-1.5">
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
                              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-sky-900 shadow-sm ring-1 ring-sky-200/50 hover:bg-white"
                              title="Bỏ chọn"
                            >
                              <span className="max-w-[220px] truncate">
                                {meta?.EquipmentName ?? `Thiết bị #${id}`}
                              </span>
                              <span className="text-blue-500">×</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mb-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Tìm theo tên hoặc mã thiết bị..."
                        value={row.search ?? ''}
                        onChange={(e) => setReservationRowSearch(rowIndex, e.target.value)}
                        className="pl-8 py-1.5 text-xs text-black border-0 shadow-none rounded-xl bg-slate-100/90 focus-visible:ring-0 focus-visible:bg-white focus-visible:shadow-[0_0_0_2px_rgba(14,165,233,0.25)]"
                      />
                    </div>
                    <Select
                      value={row.categoryId != null ? String(row.categoryId) : 'all'}
                      onValueChange={(v) => setReservationRowCategory(rowIndex, v === 'all' ? null : Number(v))}
                    >
                      <SelectTrigger className="h-9 w-[180px] text-xs font-medium bg-slate-100/90 text-slate-700 rounded-xl border-0 shadow-none ring-0 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white data-[state=open]:shadow-[0_0_0_2px_rgba(14,165,233,0.2)]">
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
                        <div className="py-10 text-center text-xs text-slate-500 rounded-xl bg-white/60">
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
                            (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
                            (eq.EquipmentCode ?? '').toLowerCase().includes(q)
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
                      <div className="flex flex-col gap-1">
                        {items.map((eq) => {
                          const isSelected = row.equipmentIds.includes(eq.EquipmentId);
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
                                    alt={eq.EquipmentName ?? `Thiết bị #${eq.EquipmentId}`}
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
                                onClick={() => toggleReservationRowEquipment(rowIndex, eq)}
                                className="flex-1 flex items-center justify-between gap-2 text-left"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {eq.EquipmentName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Mã: {eq.EquipmentCode ?? eq.EquipmentId}
                                  </div>
                                  <div className="text-[11px] text-gray-500 truncate">
                                    Danh mục:{' '}
                                    {eq.CategoryName ?? '---'}
                                  </div>
                                </div>
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                    isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200/80'
                                  }`}
                                  aria-hidden
                                >
                                  {isSelected ? <Check size={9} strokeWidth={3} /> : null}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {row.equipmentIds.length > 0 && (
                    <p className="text-[11px] text-sky-700/90 font-medium mt-2">
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
    </>
  );
}

