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
  onClose: () => void;
  onCreated: (detail: ReservationDetail) => void | Promise<void>;
};

const AVAIL_PAGE = 200;

const PRIMARY_BTN =
  'gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white border-0 shadow-sm font-medium rounded-md';

export default function CreateReservationModal({ open, onClose, onCreated }: Props) {
  const [startAtLocal, setStartAtLocal] = useState('');
  const [endAtLocal, setEndAtLocal] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [selectedEquipmentById, setSelectedEquipmentById] = useState<Record<number, EquipmentResponse>>({});

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [availabilityItems, setAvailabilityItems] = useState<EquipmentResponse[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

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
    if (!open) return;
    const start = dayjs().add(30, 'minute');
    const end = start.add(2, 'hour');
    setStartAtLocal(start.format('YYYY-MM-DDTHH:mm'));
    setEndAtLocal(end.format('YYYY-MM-DDTHH:mm'));
    setSelectedEquipmentIds([]);
    setSelectedEquipmentById({});
    setSearch('');
    setCategoryId(null);
    setAvailabilityError(null);
  }, [open]);

  const loadAvailability = useCallback(async () => {
    if (!open) return;
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
  }, [open, startAtLocal, endAtLocal, categoryId]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void loadAvailability();
    }, 350);
    return () => window.clearTimeout(t);
  }, [open, startAtLocal, endAtLocal, categoryId, loadAvailability]);

  const filteredEquipment = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = availabilityItems;
    if (q) {
      list = list.filter(
        (eq) =>
          (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
          (eq.EquipmentCode ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [availabilityItems, search]);

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

    setSubmitLoading(true);
    try {
      const created = await reservationApi.create({
        SessionIds: [],
        StartAt: start.format('YYYY-MM-DDTHH:mm:ss'),
        EndAt: end.format('YYYY-MM-DDTHH:mm:ss'),
        Equipment: selectedEquipmentIds.map((EquipmentId) => ({ EquipmentId })),
      });
      const raw = Array.isArray(created) ? created[0] : created;
      const detail = normalizeReservationResponse(raw);
      message.success('Đã tạo đặt trước thiết bị.');
      await onCreated(detail);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Tạo đặt trước thất bại.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tạo đặt trước thiết bị"
      description="Chọn khung thời gian và thiết bị cần giữ. Không gắn phiên học — dùng khi đặt theo lịch tự do."
      className="max-w-2xl w-[96vw]"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ bắt đầu</label>
            <DatePicker
              className="h-9 w-full text-xs border-gray-200 bg-white rounded-lg"
              value={startAtLocal ? dayjs(startAtLocal) : null}
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              onChange={(v) => {
                setStartAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '');
                setSelectedEquipmentIds([]);
                setSelectedEquipmentById({});
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Giờ kết thúc</label>
            <DatePicker
              className="h-9 w-full text-xs border-gray-200 bg-white rounded-lg"
              value={endAtLocal ? dayjs(endAtLocal) : null}
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              onChange={(v) => {
                setEndAtLocal(v ? v.format('YYYY-MM-DDTHH:mm') : '');
                setSelectedEquipmentIds([]);
                setSelectedEquipmentById({});
              }}
            />
          </div>
        </div>

        {selectedEquipmentIds.length > 0 && (
          <div className="rounded-md border border-sky-100 bg-sky-50/50 px-3 py-2">
            <div className="text-[11px] font-semibold text-[#208AAE] mb-1">Đã chọn ({selectedEquipmentIds.length})</div>
            <div className="flex flex-wrap gap-2">
              {selectedEquipmentIds.map((id) => {
                const meta = selectedEquipmentById[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      meta ? selectEquipment(meta, false) : setSelectedEquipmentIds((p) => p.filter((x) => x !== id))
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-1 text-[11px] text-sky-900 hover:bg-sky-50/90"
                  >
                    <span className="max-w-[200px] truncate">{meta?.EquipmentName ?? `Thiết bị #${id}`}</span>
                    <span className="text-sky-500">×</span>
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
          <p className="text-xs text-gray-500 py-2">Không có thiết bị phù hợp trong khung giờ này.</p>
        ) : (
          <div className="rounded-md border border-gray-200 bg-white px-2 py-2 space-y-2 max-h-52 overflow-y-auto">
            {filteredEquipment.map((eq) => {
              const isSelected = selectedEquipmentIds.includes(eq.EquipmentId);
              return (
                <div
                  key={eq.EquipmentId}
                  className={`rounded-md border px-3 py-2 flex items-center gap-3 text-sm transition ${
                    isSelected
                      ? 'border-[#2197C0] bg-sky-50/60'
                      : 'border-gray-100 hover:border-sky-200 hover:bg-gray-50'
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
                          ? 'bg-[#2197C0] border-[#2197C0] text-white'
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
          <Button type="button" className={PRIMARY_BTN} onClick={() => void handleSubmit()} disabled={submitLoading}>
            {submitLoading ? 'Đang tạo…' : 'Tạo đặt trước'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
