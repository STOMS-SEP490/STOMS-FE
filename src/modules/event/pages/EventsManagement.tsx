import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { StatCard } from '@/shared/components/common/StatCard';
import type { EventListItem, EventUpsertPayload } from '@/modules/event/event';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  PowerOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { message, Modal, TimePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import eventApi from '@/modules/event/api/eventApi';
import EventDetailSidebar from './EventDetailSidebar';

export default function EventsManagement() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [openUpsert, setOpenUpsert] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventListItem | null>(null);

  const [eventCode, setEventCode] = useState('');
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [durationTime, setDurationTime] = useState<Dayjs | null>(null);
  const [numberOfSession, setNumberOfSession] = useState<number | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await eventApi.getEvents({
        pageNumber,
        pageSize,
        keyword: search.trim() || undefined,
        isActive:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active'
              ? true
              : false,
      });

      setEvents(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [pageNumber, search, statusFilter]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventListItem | null>(null);

  const handleViewDetail = async (e: EventListItem) => {
    try {
      const full = await eventApi.getById(e.eventId);
      setDetailEvent(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin sự kiện');
    }
  };

  const openCreate = () => {
    setMode('create');
    setEditingEvent(null);
    setEventCode('');
    setEventName('');
    setDescription('');
    setDurationTime(null);
    setNumberOfSession(null);
    setOpenUpsert(true);
  };

  /** Parse duration từ BE (vd "01:30:00") sang Dayjs cho TimePicker */
  const parseDurationToDayjs = (d: string | undefined): Dayjs | null => {
    if (!d?.trim()) return null;
    const match = String(d).trim().match(/^(\d+):(\d{2})(?::\d{2})?/);
    if (!match) return null;
    return dayjs().hour(Number(match[1])).minute(Number(match[2])).second(0).millisecond(0);
  };

  const openEdit = (e: EventListItem) => {
    setMode('edit');
    setEditingEvent(e);
    setEventCode(e.eventCode ?? '');
    setEventName(e.eventName ?? '');
    setDescription(e.description ?? '');
    setDurationTime(parseDurationToDayjs(e.duration));
    setNumberOfSession(e.numberOfSession ?? null);
    setOpenUpsert(true);
  };

  const closeUpsert = () => {
    if (submitting) return;
    setOpenUpsert(false);
  };

  const handleSubmit = async () => {
    const durationForApi = durationTime ? durationTime.format('HH:mm:ss') : undefined;
    const payload: EventUpsertPayload = {
      eventCode: eventCode.trim(),
      eventName: eventName.trim(),
      description: description.trim() || undefined,
      duration: durationForApi,
      numberOfSession: numberOfSession ?? undefined,
    };

    if (!payload.eventCode) {
      message.warning('Vui lòng nhập mã sự kiện');
      return;
    }
    if (!payload.eventName) {
      message.warning('Vui lòng nhập tên sự kiện');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'create') {
        await eventApi.create(payload);
        message.success('Tạo sự kiện thành công');
      } else {
        if (!editingEvent?.eventId) return;
        await eventApi.update(editingEvent.eventId, payload);
        message.success('Cập nhật sự kiện thành công');
      }
      setOpenUpsert(false);
      setPageNumber(1);
      await fetchEvents();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (e: EventListItem) => {
    Modal.confirm({
      title: e.isActive ? 'Ngừng hoạt động sự kiện?' : 'Kích hoạt sự kiện?',
      content: e.isActive
        ? 'Sự kiện sẽ bị ngừng hoạt động.'
        : 'Sự kiện sẽ được kích hoạt lại.',
      okText: e.isActive ? 'Ngừng hoạt động' : 'Kích hoạt',
      cancelText: 'Hủy',
      okButtonProps: { danger: e.isActive },
      onOk: async () => {
        try {
          if (e.isActive) await eventApi.deactivate(e.eventId);
          else await eventApi.activate(e.eventId);
          message.success('Cập nhật trạng thái thành công');
          await fetchEvents();
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra';
          message.error(msg);
        }
      },
    });
  };

  const columns: ColumnDef<EventListItem>[] = [
    {
      accessorKey: 'eventCode',
      header: 'Mã sự kiện',
    },
    {
      accessorKey: 'eventName',
      header: 'Tên sự kiện',
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-700">
            Hoạt động
          </Badge>
        ) : (
          <Badge className="bg-gray-200 text-gray-600">
            Ngừng hoạt động
          </Badge>
        ),
    },
    {
      accessorKey: 'duration',
      header: 'Thời lượng',
    },
    {
      accessorKey: 'numberOfSession',
      header: 'Số buổi',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.numberOfSession} buổi
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <div className="flex items-center gap-2">
            <Eye
              size={16}
              className="text-gray-800 cursor-pointer"
              onClick={() => handleViewDetail(ev)}
            />
            <Pencil
              size={16}
              className="text-blue-600 cursor-pointer"
              onClick={() => openEdit(ev)}
            />
            <PowerOff
              size={16}
              className="text-red-500 cursor-pointer"
              onClick={() => handleToggleActive(ev)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Quản lý sự kiện
          </h2>
          <p className="text-xs text-gray-500">
            Quản lý các sự kiện trong hệ thống
          </p>
        </div>

        <Button
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          onClick={openCreate}
        >
          <Plus size={16} />
          Thêm sự kiện
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<BookOpen />}
          label="Tổng sự kiện"
          value={totalItems}
          sub="sự kiện trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={events.filter((e) => e.isActive).length}
          sub="sự kiện active"
          variant="green"
        />
        <StatCard
          icon={<Clock />}
          label="Tổng buổi"
          value={events.reduce(
            (sum, e) => sum + e.numberOfSession,
            0
          )}
          sub="tổng số buổi"
        />
        <StatCard
          icon={<BookOpen />}
          label="Ngừng hoạt động"
          value={events.filter((e) => !e.isActive).length}
          sub="sự kiện inactive"
        />
      </div>

      {/* FILTER BAR */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch value={search} onChange={setSearch} />
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v: 'all' | 'active' | 'inactive') => {
              setStatusFilter(v);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-sm bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            className="bg-white"
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPageNumber(1);
            }}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={events}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>

      <EventDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailEvent(null);
        }}
        event={detailEvent}
      />

      <Dialog
        open={openUpsert}
        onClose={closeUpsert}
        title={mode === 'create' ? 'Thêm sự kiện' : 'Cập nhật sự kiện'}
        description="Nhập thông tin sự kiện."
        className="max-w-[520px]"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Mã sự kiện *</Label>
              <Input
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                placeholder="VD: EV-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Tên sự kiện *</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="VD: Triển lãm mùa xuân"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label className="block">Thời lượng</Label>
              <TimePicker
                value={durationTime}
                onChange={setDurationTime}
                format="HH:mm"
                needConfirm={false}
                className="w-full event-time-picker"
                placeholder="Chọn giờ : phút"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="block">Số buổi</Label>
              <div className="block w-full">
                <InputNumber
                  min={1}
                  max={999}
                  value={numberOfSession}
                  onChange={(v) => setNumberOfSession(v ?? null)}
                  placeholder="1"
                  className="w-full event-number-input"
                />
              </div>
            </div>
          </div>
          <style>{`
            .event-number-input,
            .event-time-picker {
              border: 1px solid var(--input) !important;
              box-shadow: none !important;
            }
            .event-number-input:focus-within,
            .event-time-picker:focus-within {
              border-color: var(--ring) !important;
              box-shadow: 0 0 0 1px var(--ring) !important;
            }
          `}</style>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mô tả ngắn về sự kiện"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={closeUpsert} disabled={submitting}>
            Hủy
          </Button>
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}