import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Check, Plus, Search, X } from 'lucide-react';
import { message } from 'antd';
import RequestHeader from '@/shared/components/request/RequestHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { RequestListItem, RequestSessionSummary } from '../request';
import { requestApi } from '../api/requestApi';
import { reservationApi } from '../api/reservationApi';
import type { EquipmentListItem } from '@/modules/equipment/equipment';
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId';

type SessionWithFlags = RequestSessionSummary & {
  teamAssigned?: boolean;
  equipmentReserved?: boolean;
};

type RightPanelState =
  | { mode: 'team'; session: SessionWithFlags }
  | { mode: 'equipment' }
  | null;

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestListItem | null>(null);
  const [sessions, setSessions] = useState<SessionWithFlags[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanelState>(null);
  const [loading, setLoading] = useState(false);
  // Đặt thiết bị: chọn phiên (nhiều) + chọn thiết bị từ danh sách khả dụng
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [availabilityItems, setAvailabilityItems] = useState<EquipmentListItem[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilitySearch, setAvailabilitySearch] = useState('');
  const [availabilityPage, setAvailabilityPage] = useState(1);
  const [availabilityTotal, setAvailabilityTotal] = useState(0);
  const [reserveSubmitLoading, setReserveSubmitLoading] = useState(false);
  const [reserveSubmitError, setReserveSubmitError] = useState<string | null>(null);
  const pageSize = 10;
  const createdByMemberId = useProgramCoordinatorId();

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestApi.getById(Number(id));
        setRequest(detail);

        const mappedSessions: SessionWithFlags[] =
          detail.sessions?.map((s) => ({
            ...s,
            // Tạm thời suy luận flag từ status; sau có thể thay bằng field thực tế
            teamAssigned: s.status?.toLowerCase() === 'approved',
            equipmentReserved: false,
          })) ?? [];
        setSessions(mappedSessions);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  // Reset khi mở panel đặt thiết bị
  useEffect(() => {
    if (rightPanel?.mode === 'equipment') {
      setSelectedSessionIds([]);
      setSelectedEquipmentIds([]);
      setAvailabilitySearch('');
      setAvailabilityPage(1);
      setAvailabilityError(null);
      setReserveSubmitError(null);
    }
  }, [rightPanel?.mode]);

  // Khung giờ tham chiếu để load thiết bị khả dụng (phiên đầu tiên được chọn)
  const referenceSession = useMemo(() => {
    if (selectedSessionIds.length === 0) return null;
    return sessions.find((s) => s.sessionId === selectedSessionIds[0]) ?? null;
  }, [sessions, selectedSessionIds]);

  // Gọi GET /reservations/availability theo khung giờ phiên tham chiếu
  useEffect(() => {
    if (!rightPanel || rightPanel.mode !== 'equipment' || !referenceSession) return;
    const { startAt, endAt } = referenceSession;

    const fetchAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const res = await reservationApi.getAvailability({
          startAt,
          endAt,
          search: availabilitySearch.trim() || undefined,
          pageNumber: availabilityPage,
          pageSize,
        });
        setAvailabilityItems(res.items);
        setAvailabilityTotal(res.totalItems);
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách thiết bị khả dụng.';
        setAvailabilityError(message);
        setAvailabilityItems([]);
        setAvailabilityTotal(0);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    void fetchAvailability();
  }, [rightPanel?.mode, referenceSession?.sessionId, referenceSession?.startAt, referenceSession?.endAt, availabilitySearch, availabilityPage]);

  const toggleSessionSelection = useCallback((sessionId: number) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  }, []);

  const toggleEquipmentSelection = useCallback((equipmentId: number) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(equipmentId) ? prev.filter((id) => id !== equipmentId) : [...prev, equipmentId]
    );
  }, []);

  const handleReserveSubmit = useCallback(async () => {
    if (selectedSessionIds.length === 0 || selectedEquipmentIds.length === 0 || !request) return;
    if (createdByMemberId <= 0) {
      setReserveSubmitError('Vui lòng đăng nhập để đặt thiết bị.');
      return;
    }
    setReserveSubmitLoading(true);
    setReserveSubmitError(null);
    try {
      const equipmentPayload = selectedEquipmentIds.map((equipmentId) => ({ equipmentId }));
      for (const sessionId of selectedSessionIds) {
        const session = sessions.find((s) => s.sessionId === sessionId);
        if (!session) continue;
        await reservationApi.create({
          createdByMemberId,
          sessionId,
          startAt: session.startAt,
          endAt: session.endAt,
          equipment: equipmentPayload,
        });
      }
      message.success('Đặt trước thiết bị thành công.');
      setRightPanel(null);
      const detail = await requestApi.getById(Number(request.requestId));
      setRequest(detail);
      const mappedSessions: SessionWithFlags[] =
        detail.sessions?.map((s) => ({
          ...s,
          teamAssigned: s.status?.toLowerCase() === 'approved',
          equipmentReserved: false,
        })) ?? [];
      setSessions(mappedSessions);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Đặt trước thiết bị thất bại.';
      setReserveSubmitError(message);
    } finally {
      setReserveSubmitLoading(false);
    }
  }, [selectedSessionIds, selectedEquipmentIds, request, sessions, createdByMemberId]);

  const assignedCount = useMemo(
    () => sessions.filter((s) => s.teamAssigned).length,
    [sessions]
  );

  if (!id) {
    return <div className="text-sm text-black">Không tìm thấy mã yêu cầu.</div>;
  }

  if (loading && !request) {
    return <div className="text-sm text-black p-4">Đang tải dữ liệu yêu cầu...</div>;
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  return (
    <div className="space-y-4 text-black">
      {/* SUMMARY HEADER */}
      <RequestHeader
        title={request.requestName ?? request.requestCode}
        status={request.status}
      />

      {/* META + PROGRESS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Mã yêu cầu</p>
          <p className="font-semibold text-sm">{request.requestCode}</p>
          <p className="text-xs text-gray-500 mt-2">
            Khách hàng:{' '}
            <span className="font-medium">
              {request.customerName || 'N/A'}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Ngày bắt đầu</p>
          <p className="font-semibold text-sm">
            {dayjs(request.startDate).format('DD/MM/YYYY')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Số phiên yêu cầu:{' '}
            <span className="font-medium">
              {request.sessions?.length ?? request.sessionsRequired ?? 0}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Tiến độ gán đội</span>
            <span className="text-xs font-medium">
              {assignedCount}/{sessions.length || request.sessionsRequired || 0} phiên
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 rounded-full"
              style={{
                width:
                  sessions.length === 0
                    ? '0%'
                    : `${(assignedCount / sessions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <Tabs defaultValue="overview" className="space-y-4 text-black">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="constraints">Ràng buộc</TabsTrigger>
          <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* ACTION BAR */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Badge className="bg-amber-100 text-amber-700 text-black">Lưu ý</Badge>
              <span className="text-black">
                Vui lòng gán đội cho tất cả phiên trước khi duyệt yêu cầu.
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-red-300 text-red-600 bg-white"
              >
                Từ chối yêu cầu
              </Button>
              <Button
                disabled={assignedCount !== sessions.length || sessions.length === 0}
                className="bg-blue-600 text-white"
              >
                Duyệt yêu cầu
              </Button>
            </div>
          </div>

          {/* SESSION LIST */}
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-black">Danh sách phiên học</h3>
              <Button
                onClick={() => sessions.length > 0 && setRightPanel({ mode: 'equipment' })}
                disabled={sessions.length === 0}
                className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
              >
                <Plus size={16} />
                Đặt trước thiết bị
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Yêu cầu này chưa có danh sách phiên chi tiết.
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="w-full border rounded-xl px-4 py-3 flex justify-between items-center hover:border-blue-400 hover:bg-blue-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">
                        Phiên {session.sessionNo}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayjs(session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                        {dayjs(session.endAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={session.teamAssigned}
                        onClick={() =>
                          !session.teamAssigned &&
                          setRightPanel({ mode: 'team', session })
                        }
                        className="focus:outline-none"
                      >
                        <Badge
                          className={
                            session.teamAssigned
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {session.teamAssigned ? 'Đã gán đội' : 'Chưa gán đội'}
                        </Badge>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setRightPanel({ mode: 'team', session })
                        }
                        className="text-xs text-blue-600 underline"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="constraints">
          <div className="bg-white rounded-xl border shadow-sm p-4 text-xs text-gray-500">
            Ràng buộc giảng dạy và phân công sẽ được hiển thị ở đây (theo BR-STF,
            BR-SCH, BR-TIME...).
          </div>
        </TabsContent>

        <TabsContent value="attachments">
          <div className="bg-white rounded-xl border shadow-sm p-4 text-xs text-gray-500">
            Danh sách tệp đính kèm yêu cầu sẽ được hiển thị ở đây.
          </div>
        </TabsContent>
      </Tabs>

      {/* RIGHT SIDEBAR SLIDE-OVER FOR TEAM / EQUIPMENT */}
      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          {/* Panel */}
          <div className="w-full max-w-md h-full bg-white text-black shadow-2xl border-l rounded-l-3xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {rightPanel.mode === 'team' ? 'Đang gán đội' : 'Đặt trước thiết bị'}
                </p>
                {rightPanel.mode === 'team' ? (
                  <>
                    <h2 className="text-base font-semibold text-black">
                      Phiên {rightPanel.session.sessionNo}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {dayjs(rightPanel.session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                      {dayjs(rightPanel.session.endAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-black">
                      Chọn phiên & thiết bị
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Đặt thiết bị cho một hoặc nhiều phiên
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRightPanel(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {rightPanel.mode === 'team' && (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50 rounded-xl mx-6 mb-4 p-3">
                <div>
                  <p className="text-[11px] text-gray-400">Ngày</p>
                  <p className="font-medium text-black">
                    {dayjs(rightPanel.session.startAt).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Thời gian</p>
                  <p className="font-medium text-black">
                    {dayjs(rightPanel.session.startAt).format('HH:mm')} -{' '}
                    {dayjs(rightPanel.session.endAt).format('HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Mã yêu cầu</p>
                  <p className="font-medium text-black">{request.requestCode}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {rightPanel.mode === 'team' ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-black">
                    Gán đội phụ trách
                  </h3>
                  <p className="text-xs text-gray-500">
                    Chọn team và số lượng giáo viên / trợ giảng cho phiên này.
                  </p>
                  <div className="rounded-2xl border bg-gray-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-black">
                          Đội Giảng viên AI
                        </p>
                        <p className="text-[11px] text-gray-500">
                          8 thành viên · 2 giáo viên, 3 trợ giảng (ví dụ)
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-dashed text-blue-600 bg-white"
                  >
                    + Thêm đội
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Bước 1: Chọn phiên */}
                  <section>
                    <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                        1
                      </span>
                      Chọn phiên cần đặt thiết bị
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Có thể chọn nhiều phiên để đặt cùng một bộ thiết bị.
                    </p>
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                      {sessions.map((session) => {
                        const isSelected = selectedSessionIds.includes(session.sessionId);
                        return (
                          <button
                            key={session.sessionId}
                            type="button"
                            onClick={() => toggleSessionSelection(session.sessionId)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition rounded-none first:rounded-t-xl last:rounded-b-xl ${
                              isSelected
                                ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-black">
                                Phiên {session.sessionNo}
                              </p>
                              <p className="text-xs text-gray-500">
                                {dayjs(session.startAt).format('DD/MM HH:mm')} -{' '}
                                {dayjs(session.endAt).format('DD/MM HH:mm')}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedSessionIds.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Đã chọn {selectedSessionIds.length} phiên. Thiết bị khả dụng theo khung giờ phiên đầu tiên.
                      </p>
                    )}
                  </section>

                  {/* Bước 2: Chọn thiết bị (chỉ khi đã chọn phiên) */}
                  {referenceSession && (
                    <section>
                      <h3 className="text-sm font-semibold text-black mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                          2
                        </span>
                        Chọn thiết bị khả dụng
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Khung giờ tham chiếu: Phiên {referenceSession.sessionNo} (
                        {dayjs(referenceSession.startAt).format('DD/MM HH:mm')} -{' '}
                        {dayjs(referenceSession.endAt).format('HH:mm')})
                      </p>

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Tìm theo tên hoặc mã thiết bị"
                          value={availabilitySearch}
                          onChange={(e) => {
                            setAvailabilitySearch(e.target.value);
                            setAvailabilityPage(1);
                          }}
                          className="pl-9 text-black border-gray-200 bg-white"
                        />
                      </div>

                      {availabilityError && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">
                          {availabilityError}
                        </p>
                      )}

                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white">
                        {availabilityLoading ? (
                          <div className="py-8 text-center text-xs text-gray-500">
                            Đang tải danh sách...
                          </div>
                        ) : availabilityItems.length === 0 ? (
                          <div className="py-8 text-center text-xs text-gray-500">
                            {availabilitySearch.trim()
                              ? 'Không có thiết bị nào trùng khớp.'
                              : 'Không có thiết bị khả dụng trong khung giờ này.'}
                          </div>
                        ) : (
                          availabilityItems.map((eq) => {
                            const isSelected = selectedEquipmentIds.includes(eq.equipmentId);
                            return (
                              <button
                                key={eq.equipmentId}
                                type="button"
                                onClick={() => toggleEquipmentSelection(eq.equipmentId)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-black truncate">
                                    {eq.equipmentName}
                                  </p>
                                  <p className="text-xs text-gray-500">{eq.equipmentCode}</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {availabilityTotal > pageSize && (
                        <div className="flex justify-center gap-2 text-xs mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={availabilityPage <= 1 || availabilityLoading}
                            onClick={() => setAvailabilityPage((p) => Math.max(1, p - 1))}
                            className="text-black"
                          >
                            Trước
                          </Button>
                          <span className="flex items-center text-gray-600">
                            {availabilityPage} / {Math.ceil(availabilityTotal / pageSize)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              availabilityPage >= Math.ceil(availabilityTotal / pageSize) ||
                              availabilityLoading
                            }
                            onClick={() => setAvailabilityPage((p) => p + 1)}
                            className="text-black"
                          >
                            Sau
                          </Button>
                        </div>
                      )}

                      {selectedEquipmentIds.length > 0 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Đã chọn {selectedEquipmentIds.length} thiết bị
                        </p>
                      )}
                    </section>
                  )}

                  {reserveSubmitError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                      {reserveSubmitError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 text-black bg-white"
                onClick={() => setRightPanel(null)}
              >
                Hủy
              </Button>
              {rightPanel.mode === 'team' ? (
                <Button className="bg-blue-600 text-white">
                  Lưu thay đổi
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-blue-600 text-white disabled:opacity-50"
                  disabled={
                    selectedSessionIds.length === 0 ||
                    selectedEquipmentIds.length === 0 ||
                    reserveSubmitLoading
                  }
                  onClick={() => void handleReserveSubmit()}
                >
                  {reserveSubmitLoading ? 'Đang xử lý...' : `Đặt trước (${selectedSessionIds.length} phiên · ${selectedEquipmentIds.length} thiết bị)`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

