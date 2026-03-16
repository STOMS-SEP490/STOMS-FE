import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Check, ImageOff, Plus, Search, X } from 'lucide-react';
import { message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { reservationApi } from '../api/reservationApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentListItem } from '@/modules/equipment/equipment';

export type SessionOption = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
};

type ReservationRow = { sessionId: number | null; equipmentIds: number[]; search: string };

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
    { sessionId: null, equipmentIds: [], search: '' },
  ]);
  const [availabilityBySessionId, setAvailabilityBySessionId] = useState<
    Record<number, { items: EquipmentListItem[]; total: number; loading: boolean; error: string | null }>
  >({});
  const [reserveSubmitLoading, setReserveSubmitLoading] = useState(false);
  const [reserveSubmitError, setReserveSubmitError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState<string>('Hình ảnh thiết bị');

  // Load thiết bị khả dụng theo từng session trong các dòng
  useEffect(() => {
    if (sessions.length === 0) return;
    const sessionIdsToLoad = reservationRows
      .map((r) => r.sessionId)
      .filter((id): id is number => id != null)
      .filter((id) => !availabilityBySessionId[id]?.items?.length && !availabilityBySessionId[id]?.loading);
    if (sessionIdsToLoad.length === 0) return;

    const load = async (sid: number) => {
      setAvailabilityBySessionId((prev) => ({
        ...prev,
        [sid]: { items: [], total: 0, loading: true, error: null },
      }));
      const session = sessions.find((s) => s.sessionId === sid);
      if (!session) return;
      try {
        const res = await reservationApi.getAvailability({
          startAt: session.startAt,
          endAt: session.endAt,
          pageNumber: 1,
          pageSize: PAGE_SIZE,
        });
        setAvailabilityBySessionId((prev) => ({
          ...prev,
          [sid]: { items: res.items, total: res.totalItems, loading: false, error: null },
        }));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị khả dụng.';
        setAvailabilityBySessionId((prev) => ({
          ...prev,
          [sid]: { items: [], total: 0, loading: false, error: msg },
        }));
      }
    };
    sessionIdsToLoad.forEach((sid) => void load(sid));
  }, [reservationRows, sessions, availabilityBySessionId]);

  const addReservationRow = useCallback(() => {
    setReservationRows((prev) => [...prev, { sessionId: null, equipmentIds: [], search: '' }]);
  }, []);

  const removeReservationRow = useCallback((index: number) => {
    setReservationRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setReservationRowSession = useCallback((index: number, sessionId: number | null) => {
    setReservationRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], sessionId, equipmentIds: [], search: next[index].search ?? '' };
      return next;
    });
  }, []);

  const setReservationRowSearch = useCallback((index: number, search: string) => {
    setReservationRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], search };
      return next;
    });
  }, []);

  const toggleReservationRowEquipment = useCallback((rowIndex: number, equipmentId: number) => {
    setReservationRows((prev) => {
      const next = [...prev];
      const row = next[rowIndex];
      const ids = row.equipmentIds.includes(equipmentId)
        ? row.equipmentIds.filter((id) => id !== equipmentId)
        : [...row.equipmentIds, equipmentId];
      next[rowIndex] = { ...row, equipmentIds: ids };
      return next;
    });
  }, []);

  const validReservationRows = useMemo(
    () =>
      reservationRows.filter(
        (r) => r.sessionId != null && r.equipmentIds.length > 0
      ) as { sessionId: number; equipmentIds: number[] }[],
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
      for (const row of validReservationRows) {
        const session = sessions.find((s) => s.sessionId === row.sessionId);
        if (!session) continue;
        await reservationApi.create({
          createdByMemberId,
          sessionIds: [row.sessionId],
          startAt: session.startAt,
          endAt: session.endAt,
          equipment: row.equipmentIds.map((equipmentId) => ({ equipmentId })),
        });
      }
      message.success(`Đã tạo ${validReservationRows.length} đặt trước thiết bị.`);
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
  }, [validReservationRows, sessions, createdByMemberId, onSuccess, onClose]);

  return (
    <>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Mỗi dòng: chọn 1 phiên và 1 hoặc nhiều thiết bị → tạo 1 đặt trước. Có thể đặt thiết bị A cho phiên 1, thiết bị B cho phiên 2, hoặc cùng thiết bị A cho nhiều phiên (nhiều dòng).
        </p>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
          {reservationRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">Dòng {rowIndex + 1}</span>
                {reservationRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReservationRow(rowIndex)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Xóa dòng"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Phiên học</label>
                <Select
                  value={row.sessionId != null ? String(row.sessionId) : ''}
                  onValueChange={(v) =>
                    setReservationRowSession(rowIndex, v ? Number(v) : null)
                  }
                >
                  <SelectTrigger className="h-9 w-full text-sm bg-white text-gray-700 border-gray-300">
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
                  <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
                    Thiết bị khả dụng (chọn ít nhất 1)
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Tìm theo tên hoặc mã thiết bị..."
                      value={row.search ?? ''}
                      onChange={(e) => setReservationRowSearch(rowIndex, e.target.value)}
                      className="pl-8 py-1.5 text-xs text-black border-gray-200 bg-white rounded-lg"
                    />
                  </div>
                  {(() => {
                    const cache = availabilityBySessionId[row.sessionId];
                    if (!cache) {
                      return (
                        <div className="py-4 text-center text-xs text-gray-500 rounded-lg bg-white border border-gray-100">
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
                    const items = q
                      ? rawItems.filter(
                          (eq) =>
                            (eq.equipmentName ?? '').toLowerCase().includes(q) ||
                            (eq.equipmentCode ?? '').toLowerCase().includes(q)
                        )
                      : rawItems;
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
                      <div className="rounded-xl border border-gray-200 max-h-48 overflow-y-auto bg-white px-2 py-2 space-y-2">
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
                                onClick={() => toggleReservationRowEquipment(rowIndex, eq.equipmentId)}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
          onClick={addReservationRow}
        >
          <Plus size={16} className="mr-2" />
          Thêm dòng (phiên + thiết bị)
        </Button>

        {reserveSubmitError && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{reserveSubmitError}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
          <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50"
            disabled={validReservationRows.length === 0 || reserveSubmitLoading}
            onClick={() => void handleReserveSubmit()}
          >
            {reserveSubmitLoading ? 'Đang xử lý...' : `Đặt trước (${validReservationRows.length} đặt trước)`}
          </Button>
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

