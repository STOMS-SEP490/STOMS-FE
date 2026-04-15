import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Search } from 'lucide-react';
import { DatePicker, Select as AntSelect, message } from 'antd';
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

/** Không chọn ngày trước hôm nay (lịch). */
function disabledBorrowDate(current: dayjs.Dayjs | null) {
  if (!current) return false;
  return current.isBefore(dayjs(), 'day');
}

/** Hôm nay: không chọn giờ/phút đã qua. */
function disabledBorrowTime(date: dayjs.Dayjs | null) {
  if (!date || !date.isSame(dayjs(), 'day')) {
    return {};
  }
  const now = dayjs();
  return {
    disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
    disabledMinutes: (selectedHour: number) => {
      if (selectedHour < now.hour()) return Array.from({ length: 60 }, (_, i) => i);
      if (selectedHour > now.hour()) return [];
      return Array.from({ length: now.minute() }, (_, i) => i);
    },
  };
}

function getEquipmentStatusMeta(status?: string | null) {
  const value = String(status ?? '').trim().toLowerCase();
  switch (value) {
    case 'available':
      return {
        label: 'Sẵn sàng',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'in_use':
    case 'inuse':
      return {
        label: 'Đang sử dụng',
        className: 'bg-sky-50 text-sky-700 border border-sky-200',
      };
    case 'maintenance':
      return {
        label: 'Bảo trì',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    case 'broken':
    case 'damaged':
      return {
        label: 'Hỏng',
        className: 'bg-rose-50 text-rose-700 border border-rose-200',
      };
    case 'inactive':
      return {
        label: 'Ngưng hoạt động',
        className: 'bg-slate-100 text-slate-600 border border-slate-200',
      };
    default:
      return {
        label: status?.trim() || 'Không rõ',
        className: 'bg-slate-100 text-slate-600 border border-slate-200',
      };
  }
}

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
  type AvailabilityEntry = {
    items: EquipmentResponse[];
    total: number;
    loading: boolean;
    error: string | null;
    /** Đã fetch xong (kể cả danh sách rỗng / lỗi) — tránh lặp vô hạn effect. */
    loaded: boolean;
  };
  const [availabilityByKey, setAvailabilityByKey] = useState<Record<string, AvailabilityEntry>>({});
  const availabilityByKeyRef = useRef(availabilityByKey);
  availabilityByKeyRef.current = availabilityByKey;
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

  // UX: panel này hỗ trợ "đặt dài hạn" bằng cách chọn nhiều buổi cùng lúc,
  // lấy khung thời gian mượn/trả từ session đầu-cuối để check availability.

  // Load thiết bị khả dụng theo từng dòng (session + start/end + category).
  // Không đưa `availabilityByKey` vào dependency: mỗi lần set state sẽ chạy lại effect;
  // điều kiện cũ `!items.length` còn khiến reload vô hạn khi API trả danh sách rỗng (vd. sau khi bấm "Now").
  useEffect(() => {
    if (sessions.length === 0) return;
    const rowsToLoad = reservationRows
      .filter((r) => r.sessionIds.length > 0 && r.startAtLocal && r.endAtLocal)
      .filter((r) => {
        const key = getRowAvailabilityKey(r);
        const entry = availabilityByKeyRef.current[key];
        if (entry?.loading) return false;
        if (entry?.loaded) return false;
        return true;
      });
    if (rowsToLoad.length === 0) return;

    const load = async (row: ReservationRow) => {
      const key = getRowAvailabilityKey(row);
      setAvailabilityByKey((prev) => ({
        ...prev,
        [key]: { items: [], total: 0, loading: true, error: null, loaded: false },
      }));

      try {
        const start = dayjs(row.startAtLocal);
        const end = dayjs(row.endAtLocal);
        if (!start.isValid() || !end.isValid()) {
          setAvailabilityByKey((prev) => ({
            ...prev,
            [key]: {
              items: [],
              total: 0,
              loading: false,
              error: 'Thời gian mượn/trả không hợp lệ.',
              loaded: true,
            },
          }));
          return;
        }
        if (!end.isAfter(start)) {
          setAvailabilityByKey((prev) => ({
            ...prev,
            [key]: {
              items: [],
              total: 0,
              loading: false,
              error: 'Giờ trả phải sau giờ mượn.',
              loaded: true,
            },
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
          [key]: {
            items: res.Items ?? [],
            total: res.TotalItems ?? 0,
            loading: false,
            error: null,
            loaded: true,
          },
        }));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị khả dụng.';
        setAvailabilityByKey((prev) => ({
          ...prev,
          [key]: { items: [], total: 0, loading: false, error: msg, loaded: true },
        }));
      }
    };

    rowsToLoad.forEach((r) => void load(r));
  }, [reservationRows, sessions, getRowAvailabilityKey]);

  const setReservationRowSessions = useCallback(
    (_index: number, nextSessionIds: number[]) => {
      // Đổi buổi => đổi khung thời gian => bỏ lựa chọn thiết bị để tránh stale.
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

        const now = dayjs();
        let start = earliest?.startAt ? dayjs(earliest.startAt) : null;
        if (start && start.isBefore(now)) {
          start = now;
        }
        let end = latest?.endAt ? dayjs(latest.endAt) : null;
        if (start && end && !end.isAfter(start)) {
          end = start.add(1, 'hour');
        }

        const startAtLocal = start ? start.format('YYYY-MM-DDTHH:mm') : '';
        const endAtLocal = end ? end.format('YYYY-MM-DDTHH:mm') : '';

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
      const selectableIds = new Set(sessions.map((s) => s.sessionId));
      const notSelectable = row.sessionIds.filter((id) => !selectableIds.has(id));
      if (notSelectable.length > 0) {
        setReserveSubmitError('Một số buổi đã có thiết bị được yêu cầu. Vui lòng chỉnh sửa trong chi tiết buổi.');
        return;
      }
      const start = dayjs(row.startAtLocal);
      const end = dayjs(row.endAtLocal);
      if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
        setReserveSubmitError('Thời gian không hợp lệ.');
        return;
      }
      if (start.isBefore(dayjs())) {
        setReserveSubmitError('Giờ mượn không được là thời điểm trong quá khứ.');
        return;
      }
      await reservationApi.create({
        SessionIds: row.sessionIds,
        StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
        EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
        Equipment: row.equipmentIds.map((EquipmentId) => ({ EquipmentId })),
      });
      message.success('Đã tạo đơn yêu cầu thiết bị.');
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      const raw =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
      const friendly = raw.includes('StartAt phải >= thời điểm hiện tại')
        ? 'Buổi này đã quá hạn để tạo đơn yêu cầu thiết bị.'
        : raw || 'Đơn yêu cầu thiết bị thất bại.';
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
                  <label className="block text-[11px] font-medium text-gray-500">Buổi học (chọn nhiều)</label>
                  {row.sessionIds.length > 0 && (
                    <span className="text-[11px] font-medium text-sky-800 bg-sky-100/80 rounded-full px-2.5 py-0.5">
                      {row.sessionIds.length} buổi
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
                          title="Bỏ buổi"
                        >
                          <span className="font-semibold">Buổi {s.sessionNo}</span>
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
                    placeholder="— Chọn buổi —"
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
                      label: `Buổi ${s.sessionNo} · ${dayjs(s.startAt).format('DD/MM HH:mm')}–${dayjs(s.endAt).format('HH:mm')}`,
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
                    {row.sessionIds.length > 0 ? 'Chọn thêm' : 'Chọn buổi'}
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
                        disabledDate={disabledBorrowDate}
                        disabledTime={disabledBorrowTime}
                        onChange={(v) => {
                          if (v && v.isBefore(dayjs())) {
                            message.warning('Giờ mượn không được chọn thời điểm trong quá khứ.');
                            return;
                          }
                          setReservationRowTime(rowIndex, {
                            startAtLocal: v ? v.format('YYYY-MM-DDTHH:mm') : '',
                          });
                        }}
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
                        disabledDate={disabledBorrowDate}
                        disabledTime={(date) => {
                          const now = dayjs();
                          const start = row.startAtLocal ? dayjs(row.startAtLocal) : null;
                          const selected = date ?? null;
                          const disabledHours = new Set<number>();
                          const disabledMinutesByHour: Record<number, Set<number>> = {};

                          if (selected?.isSame(now, 'day')) {
                            for (let h = 0; h < now.hour(); h += 1) disabledHours.add(h);
                            disabledMinutesByHour[now.hour()] = new Set(
                              Array.from({ length: now.minute() }, (_, i) => i)
                            );
                          }

                          if (start && selected?.isSame(start, 'day')) {
                            for (let h = 0; h < start.hour(); h += 1) disabledHours.add(h);
                            const startMinuteSet = disabledMinutesByHour[start.hour()] ?? new Set<number>();
                            for (let m = 0; m <= start.minute(); m += 1) startMinuteSet.add(m);
                            disabledMinutesByHour[start.hour()] = startMinuteSet;
                          }

                          return {
                            disabledHours: () => Array.from(disabledHours).sort((a, b) => a - b),
                            disabledMinutes: (selectedHour: number) =>
                              Array.from(disabledMinutesByHour[selectedHour] ?? []).sort((a, b) => a - b),
                          };
                        }}
                        onChange={(v) => {
                          if (v && v.isBefore(dayjs())) {
                            message.warning('Giờ trả không được chọn thời điểm trong quá khứ.');
                            return;
                          }
                          if (v && row.startAtLocal && !v.isAfter(dayjs(row.startAtLocal))) {
                            message.warning('Giờ trả phải sau giờ mượn.');
                            return;
                          }
                          setReservationRowTime(rowIndex, {
                            endAtLocal: v ? v.format('YYYY-MM-DDTHH:mm') : '',
                          });
                        }}
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
                        className="pl-8 py-1.5 text-xs text-black border border-slate-200/90 shadow-none rounded-xl bg-white focus-visible:ring-0 focus-visible:bg-white focus-visible:shadow-[0_0_0_2px_rgba(14,165,233,0.25)]"
                      />
                    </div>
                    <Select
                      value={row.categoryId != null ? String(row.categoryId) : 'all'}
                      onValueChange={(v) => setReservationRowCategory(rowIndex, v === 'all' ? null : Number(v))}
                    >
                      <SelectTrigger className="h-9 w-[180px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90 shadow-none ring-0 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-white data-[state=open]:shadow-[0_0_0_2px_rgba(14,165,233,0.2)]">
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
                    if (cache.loading) {
                      return (
                        <div className="py-10 text-center text-xs text-slate-500 rounded-xl bg-white/60">
                          Đang tải thiết bị...
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
                            ? 'Không có thiết bị khả dụng trong khung giờ buổi này.'
                            : 'Không có thiết bị nào trùng với từ khóa tìm kiếm.'}
                        </p>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-1">
                        {items.map((eq) => {
                          const isSelected = row.equipmentIds.includes(eq.EquipmentId);
                          const statusMeta = getEquipmentStatusMeta(eq.Status);
                          return (
                            <div
                              key={eq.EquipmentId}
                              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                                isSelected ? 'bg-sky-50/95' : 'hover:bg-slate-100/60'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                                {eq.ImgLink ? (
                                  <img
                                    src={eq.ImgLink}
                                    alt={eq.EquipmentName ?? `Thiết bị #${eq.EquipmentId}`}
                                    width={40}
                                    height={40}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-10 w-10 object-cover"
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
                                  <div className="mt-1">
                                    <span className="text-[11px] text-gray-500 mr-1">Trạng thái:</span>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusMeta.className}`}
                                    >
                                      {statusMeta.label}
                                    </span>
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

