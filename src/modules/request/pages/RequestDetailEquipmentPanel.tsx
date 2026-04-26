import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Search } from 'lucide-react';
import { DatePicker, Select as AntSelect, message, Image } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentResponse } from '@/modules/reservation/reservation.types';
import reservationApi from '../../reservation/api/reservationApi';
import { normalizeEquipmentPagedResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';
import { EQUIPMENT_STATUS_OPTIONS, getEquipmentStatusDisplay, getEquipmentStatusColor } from '@/constants/status';

export type SessionOption = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
};

const PAGE_SIZE = 50;

function disabledBorrowDate(current: dayjs.Dayjs | null) {
  if (!current) return false;
  return current.isBefore(dayjs(), 'day');
}

function disabledBorrowTime(date: dayjs.Dayjs | null) {
  if (!date || !date.isSame(dayjs(), 'day')) return {};
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

type Props = {
  sessions: SessionOption[];
  createdByMemberId: number;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function RequestDetailEquipmentPanel({ sessions, createdByMemberId, onClose, onSuccess }: Props) {
  // --- session / time selection ---
  const [sessionIds, setSessionIds] = useState<number[]>([]);
  const [startAtLocal, setStartAtLocal] = useState('');
  const [endAtLocal, setEndAtLocal] = useState('');
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);

  // --- filters ---
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // --- equipment list ---
  const [equipmentItems, setEquipmentItems] = useState<EquipmentResponse[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);

  // --- selected equipment ---
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentResponse>>({});

  // --- categories ---
  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  // --- submit ---
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    categoryApi.getCategories({ pageNumber: 1, pageSize: 200 })
      .then((res) => setCategories(res.items ?? []))
      .catch(() => setCategories([]));
  }, []);

  // Fetch equipment khi filter thay đổi
  useEffect(() => {
    if (!startAtLocal || !endAtLocal || sessionIds.length === 0) {
      setEquipmentItems([]);
      setEquipmentError(null);
      return;
    }
    const start = dayjs(startAtLocal);
    const end = dayjs(endAtLocal);
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
      setEquipmentItems([]);
      setEquipmentError('Thời gian không hợp lệ.');
      return;
    }

    let cancelled = false;
    setEquipmentLoading(true);
    setEquipmentError(null);

    reservationApi.getAvailability({
      StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
      EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
      CategoryIds: categoryId != null ? [categoryId] : undefined,
      Statuses: statusFilter !== null ? [statusFilter] : undefined,
      PageNumber: 1,
      PageSize: PAGE_SIZE,
    })
      .then((raw) => {
        if (cancelled) return;
        const res = normalizeEquipmentPagedResponse(raw);
        setEquipmentItems(res.Items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không tải được thiết bị khả dụng.';
        setEquipmentError(msg);
        setEquipmentItems([]);
      })
      .finally(() => { if (!cancelled) setEquipmentLoading(false); });

    return () => { cancelled = true; };
  }, [startAtLocal, endAtLocal, categoryId, statusFilter, sessionIds]);

  // Khi đổi buổi → tự fill giờ mượn/trả từ session
  const handleSetSessions = useCallback((ids: number[]) => {
    setSessionIds(ids);
    setSelectedEquipmentIds([]);
    setSelectedEquipmentById({});

    const selected = ids.map((id) => sessions.find((s) => s.sessionId === id)).filter(Boolean) as SessionOption[];
    const earliest = [...selected].sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf())[0];
    const latest = [...selected].sort((a, b) => dayjs(b.endAt).valueOf() - dayjs(a.endAt).valueOf())[0];

    const now = dayjs();
    let start = earliest?.startAt ? dayjs(earliest.startAt) : null;
    if (start && start.isBefore(now)) start = now;
    let end = latest?.endAt ? dayjs(latest.endAt) : null;
    if (start && end && !end.isAfter(start)) end = start.add(1, 'hour');

    setStartAtLocal(start ? start.format('YYYY-MM-DDTHH:mm') : '');
    setEndAtLocal(end ? end.format('YYYY-MM-DDTHH:mm') : '');
  }, [sessions]);

  const toggleEquipment = useCallback((eq: EquipmentResponse) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(eq.EquipmentId) ? prev.filter((id) => id !== eq.EquipmentId) : [...prev, eq.EquipmentId]
    );
    setSelectedEquipmentById((prev) => {
      const next = { ...prev };
      if (next[eq.EquipmentId]) delete next[eq.EquipmentId];
      else next[eq.EquipmentId] = eq;
      return next;
    });
  }, []);

  // Filter client-side theo search
  const displayItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equipmentItems;
    return equipmentItems.filter(
      (eq) =>
        (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
        (eq.EquipmentCode ?? '').toLowerCase().includes(q)
    );
  }, [equipmentItems, search]);

  // --- infinite scroll ---
  const PAGE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setVisibleCount(PAGE); }, [displayItems]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((c) => c + PAGE); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayItems]);

  const canSubmit = sessionIds.length > 0 && selectedEquipmentIds.length > 0 &&
    dayjs(startAtLocal).isValid() && dayjs(endAtLocal).isValid() &&
    dayjs(endAtLocal).isAfter(dayjs(startAtLocal));

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    if (createdByMemberId <= 0) { setSubmitError('Vui lòng đăng nhập.'); return; }
    const start = dayjs(startAtLocal);
    const end = dayjs(endAtLocal);
    if (start.isBefore(dayjs())) { setSubmitError('Giờ mượn không được là thời điểm trong quá khứ.'); return; }

    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await reservationApi.create({
        SessionIds: sessionIds,
        StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
        EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
        Equipment: selectedEquipmentIds.map((EquipmentId) => ({ EquipmentId })),
      });
      message.success('Đã tạo đơn yêu cầu thiết bị.');
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      const raw = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
      setSubmitError(raw || 'Đơn yêu cầu thiết bị thất bại.');
    } finally {
      setSubmitLoading(false);
    }
  }, [canSubmit, createdByMemberId, startAtLocal, endAtLocal, sessionIds, selectedEquipmentIds, onClose, onSuccess]);

  return (
    <>
      <div className="flex flex-col gap-4 h-full min-h-[70vh]">
        <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
          <div className="rounded-2xl bg-slate-50/70 p-5 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">

            {/* Chọn buổi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-[11px] font-medium text-gray-500">Buổi học (chọn nhiều)</label>
                {sessionIds.length > 0 && (
                  <span className="text-[11px] font-medium text-sky-800 bg-sky-100/80 rounded-full px-2.5 py-0.5">
                    {sessionIds.length} buổi
                  </span>
                )}
              </div>
              {sessionIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {sessionIds.map((id) => {
                    const s = sessions.find((x) => x.sessionId === id);
                    if (!s) return null;
                    return (
                      <button key={id} type="button"
                        onClick={() => handleSetSessions(sessionIds.filter((x) => x !== id))}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-sky-800 shadow-sm ring-1 ring-sky-200/60 hover:bg-sky-50/90"
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
                  value={sessionIds.map(String)}
                  showSearch
                  maxTagCount={0}
                  maxTagPlaceholder={() => null}
                  optionFilterProp="label"
                  filterOption={(input, option) => String((option as any)?.label ?? '').toLowerCase().includes(String(input).toLowerCase())}
                  onChange={(vals) => {
                    handleSetSessions((vals as string[]).map(Number).filter((n) => n > 0));
                    setSessionPickerOpen(false);
                  }}
                  options={sessions.map((s) => ({
                    value: String(s.sessionId),
                    label: `Buổi ${s.sessionNo} · ${dayjs(s.startAt).format('DD/MM HH:mm')}–${dayjs(s.endAt).format('HH:mm')}`,
                  }))}
                />
              ) : (
                <Button type="button" size="sm" variant="outline"
                  className="rounded-full w-full border-slate-200/90 bg-white shadow-sm hover:bg-slate-50"
                  onClick={() => setSessionPickerOpen(true)}
                >
                  {sessionIds.length > 0 ? 'Chọn thêm' : 'Chọn buổi'}
                </Button>
              )}
            </div>

            {sessionIds.length > 0 && (
              <div className="space-y-4 pt-1 border-t border-slate-200/60">
                {/* Giờ mượn / trả */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ mượn</label>
                    <DatePicker
                      className="h-9 w-full text-xs text-black !rounded-xl border-slate-200/90 bg-white shadow-sm"
                      value={startAtLocal ? dayjs(startAtLocal) : null}
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      placeholder="Chọn giờ mượn"
                      disabledDate={disabledBorrowDate}
                      disabledTime={disabledBorrowTime}
                      onChange={(v) => {
                        if (v && v.isBefore(dayjs())) { message.warning('Giờ mượn không được chọn thời điểm trong quá khứ.'); return; }
                        setStartAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '');
                        setSelectedEquipmentIds([]);
                        setSelectedEquipmentById({});
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ trả</label>
                    <DatePicker
                      className="h-9 w-full text-xs text-black !rounded-xl border-slate-200/90 bg-white shadow-sm"
                      value={endAtLocal ? dayjs(endAtLocal) : null}
                      showTime={{ format: 'HH:mm' }}
                      format="DD/MM/YYYY HH:mm"
                      placeholder="Chọn giờ trả"
                      disabledDate={disabledBorrowDate}
                      onChange={(v) => {
                        if (v && v.isBefore(dayjs())) { message.warning('Giờ trả không được chọn thời điểm trong quá khứ.'); return; }
                        if (v && startAtLocal && !v.isAfter(dayjs(startAtLocal))) { message.warning('Giờ trả phải sau giờ mượn.'); return; }
                        setEndAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '');
                        setSelectedEquipmentIds([]);
                        setSelectedEquipmentById({});
                      }}
                    />
                  </div>
                </div>

                <label className="block text-[11px] font-medium text-slate-600 mb-2">
                  Thiết bị khả dụng (chọn ít nhất 1)
                </label>

                {/* Thiết bị đã chọn */}
                {selectedEquipmentIds.length > 0 && (
                  <div className="rounded-xl bg-sky-50/90 px-3 py-2.5">
                    <div className="text-[11px] font-semibold text-sky-900 mb-1.5">
                      Thiết bị đã chọn ({selectedEquipmentIds.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEquipmentIds.map((id) => {
                        const meta = selectedEquipmentById[id];
                        return (
                          <button key={id} type="button"
                            onClick={() => { if (meta) toggleEquipment(meta); else setSelectedEquipmentIds((p) => p.filter((x) => x !== id)); }}
                            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-sky-900 shadow-sm ring-1 ring-sky-200/50 hover:bg-white"
                          >
                            <span className="max-w-[220px] truncate">{meta?.EquipmentName ?? `Thiết bị #${id}`}</span>
                            <span className="text-blue-500">×</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="flex gap-2 mb-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Tìm theo tên hoặc mã thiết bị..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 py-1.5 text-xs text-black border border-slate-200/90 shadow-none rounded-xl bg-white focus-visible:ring-0"
                    />
                  </div>
                  <Select value={categoryId != null ? String(categoryId) : 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? null : Number(v))}>
                    <SelectTrigger className="h-9 w-[160px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90 shadow-none ring-0 focus:ring-0">
                      <SelectValue placeholder="Danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-gray-800">Tất cả danh mục</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={(c as any).categoryId} value={String((c as any).categoryId)} className="text-gray-800">
                          {(c as any).categoryName ?? '---'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter != null ? String(statusFilter) : 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : Number(v))}>
                    <SelectTrigger className="h-9 w-[140px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90 shadow-none ring-0 focus:ring-0">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-gray-800">Tất cả trạng thái</SelectItem>
                      {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-gray-800">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Equipment list */}
                {!startAtLocal || !endAtLocal ? (
                  <div className="py-10 text-center text-xs text-slate-500 rounded-xl bg-white/60">
                    Vui lòng chọn giờ mượn/giờ trả.
                  </div>
                ) : equipmentLoading ? (
                  <div className="py-10 text-center text-xs text-slate-500 rounded-xl bg-white/60">Đang tải thiết bị...</div>
                ) : equipmentError ? (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{equipmentError}</p>
                ) : displayItems.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    {equipmentItems.length === 0 ? 'Không có thiết bị khả dụng trong khung giờ này.' : 'Không có thiết bị nào trùng với từ khóa tìm kiếm.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {displayItems.slice(0, visibleCount).map((eq) => {
                      const isSelected = selectedEquipmentIds.includes(eq.EquipmentId);
                      const statusLabel = getEquipmentStatusDisplay(eq.Status ?? '');
                      const statusClass = getEquipmentStatusColor(eq.Status ?? '');
                      return (
                        <div key={eq.EquipmentId}
                          className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${isSelected ? 'bg-sky-50/95' : 'hover:bg-slate-100/60'}`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                            {eq.ImgLink ? (
                              <Image
                                src={eq.ImgLink}
                                alt={eq.EquipmentName ?? ''}
                                width={40}
                                height={40}
                                className="h-10 w-10 object-cover"
                                preview={{ mask: false }}
                              />
                            ) : (
                              <ImageOff className="w-5 h-5 text-gray-300" />
                            )}
                          </div>
                          <button type="button" onClick={() => toggleEquipment(eq)} className="flex-1 flex items-center justify-between gap-2 text-left">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{eq.EquipmentName}</div>
                              <div className="text-xs text-gray-500">Mã: {eq.EquipmentCode ?? eq.EquipmentId}</div>
                              <div className="text-[11px] text-gray-500 truncate">Danh mục: {eq.CategoryName ?? '---'}</div>
                              <div className="mt-1">
                                <span className="text-[11px] text-gray-500 mr-1">Trạng thái:</span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass} border`}>{statusLabel}</span>
                              </div>
                            </div>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200/80'}`} aria-hidden>
                              {isSelected ? <Check size={9} strokeWidth={3} /> : null}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                    {visibleCount < displayItems.length && (
                      <div ref={sentinelRef} className="py-2 text-center text-xs text-slate-400">Đang tải thêm...</div>
                    )}
                  </div>
                )}

                {selectedEquipmentIds.length > 0 && (
                  <p className="text-[11px] text-sky-700/90 font-medium mt-2">Đã chọn {selectedEquipmentIds.length} thiết bị</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto bg-white/95 backdrop-blur border-t border-gray-100 pt-3">
          {submitError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">{submitError}</p>}
          <div className="flex justify-end gap-3 pb-1">
            <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>Hủy</Button>
            <Button type="button" className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50"
              disabled={!canSubmit || submitLoading}
              onClick={() => void handleSubmit()}
            >
              {submitLoading ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </div>
        </div>
      </div>

    </>
  );
}
