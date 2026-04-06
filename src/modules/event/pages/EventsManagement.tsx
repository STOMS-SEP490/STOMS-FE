import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { StatCard } from '@/shared/components/common/StatCard';
import type { EventCreatePayload, EventListItem, EventUpdatePayload } from '@/modules/event/event';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  X,
  Pencil,
  Plus,
  RotateCcw,
  Power,
  PowerOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { message, Modal } from 'antd';
import eventApi from '@/modules/event/api/eventApi';
import eventSessionApi from '@/modules/event/api/eventSessionApi';
import EventDetailSidebar from './EventDetailSidebar';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import type { SkillListItem } from '@/modules/skill/skill';
import skillApi from '@/modules/skill/api/skillApi';
import type { TopicListItem } from '@/modules/topic/topic';
import topicApi from '@/modules/topic/api/topicApi';
import eventSessionSkillApi from '@/modules/event/api/eventSessionSkillApi';
import eventSessionTopicApi from '@/modules/event/api/eventSessionTopicApi';
import { Switch } from '@/shared/components/ui/switch';
import { useLocation, useSearchParams } from 'react-router-dom';

type EditableEventSession = {
  eventSessionId?: number;
  sessionNo: number;
  title: string;
  description: string;
  duration: string; // "HH:mm:ss"
  /** skills đã gán (kể cả inactive) — bật/tắt bằng Switch */
  skills: { skillId: number; skillName?: string | null; isActive?: boolean }[];
  initialSkills: { skillId: number; skillName?: string | null; isActive?: boolean }[];
  pendingSkillIdsToAdd: number[];
  showAddSkill: boolean;
  /** topics đã gán (kể cả inactive) — bật/tắt bằng Switch */
  topics: { topicId: number; topicName?: string | null; isActive?: boolean }[];
  initialTopics: { topicId: number; topicName?: string | null; isActive?: boolean }[];
  pendingTopicIdsToAdd: number[];
  showAddTopic: boolean;
};

export default function EventsManagement() {
  const location = useLocation();
  /** TL / Giảng viên / PC: chỉ đọc, API luôn isActive=true; Manager: đầy đủ CRUD + lọc trạng thái */
  const readOnly =
    location.pathname.startsWith('/tl/') ||
    location.pathname.startsWith('/teacher/') ||
    location.pathname.startsWith('/pc/');

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
  const [sessions, setSessions] = useState<EditableEventSession[]>([]);
  const [sessionsToDelete, setSessionsToDelete] = useState<number[]>([]);
  const [allSkills, setAllSkills] = useState<SkillListItem[]>([]);
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([]);

  useEffect(() => {
    if (readOnly) return;
    skillApi
      .getSkills({ pageSize: 500 })
      .then((res) => setAllSkills(res.items ?? []))
      .catch(() => setAllSkills([]));
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    topicApi
      .getTopics({ pageNumber: 1, pageSize: 500 })
      .then((res) => setAllTopics(res.items ?? []))
      .catch(() => setAllTopics([]));
  }, [readOnly]);

  const fetchEvents = async () => {
    try {
      const isActive = readOnly
        ? true
        : statusFilter === 'all'
          ? undefined
          : statusFilter === 'active';

      const res = await eventApi.getEvents({
        pageNumber,
        pageSize,
        keyword: search.trim() || undefined,
        isActive,
      });

      setEvents(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [pageNumber, search, statusFilter, readOnly]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventListItem | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const eventIdFromUrl = searchParams.get('eventId');

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);
  const lastOpenedEventIdRef = useRef<number | null>(null);

  const closeDetailFromUrl = () => {
    if (openDetailFromUrl === '1') {
      skipNextAutoOpenRef.current = true;
    }
    setDetailOpen(false);
    setDetailEvent(null);
    lastOpenedEventIdRef.current = null;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('eventId');
      return next;
    });
  };

  const openDetailById = useCallback(async (id: number) => {
    try {
      const full = await eventApi.getById(id);
      setDetailEvent(full);
      lastOpenedEventIdRef.current = id;
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin sự kiện');
    }
  }, []);

  const handleViewDetail = async (e: EventListItem) => {
    try {
      const full = await eventApi.getById(e.eventId);
      setDetailEvent(full);
      setDetailOpen(true);
      lastOpenedEventIdRef.current = e.eventId;
    } catch {
      message.error('Không tải được thông tin sự kiện');
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!eventIdFromUrl) return;

    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(eventIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    // Đã có đúng dữ liệu chi tiết cho id trong URL thì không gọi API lại (tránh lệch ref/detailOpen).
    if (detailOpen && detailEvent?.eventId === id) return;

    void openDetailById(id);
  }, [openDetailFromUrl, eventIdFromUrl, detailOpen, detailEvent?.eventId, openDetailById]);

  const openCreate = () => {
    if (readOnly) return;
    setMode('create');
    setEditingEvent(null);
    setEventCode('');
    setEventName('');
    setDescription('');
    setSessions([
      {
        eventSessionId: undefined,
        sessionNo: 1,
        title: 'Buổi 1',
        description: '',
        duration: '01:00:00',
          skills: [],
          initialSkills: [],
          pendingSkillIdsToAdd: [],
          showAddSkill: false,
          topics: [],
          initialTopics: [],
          pendingTopicIdsToAdd: [],
          showAddTopic: false,
      },
    ]);
    setSessionsToDelete([]);
    setOpenUpsert(true);
  };

  const openEdit = async (e: EventListItem) => {
    if (readOnly) return;
    setMode('edit');
    try {
      const detail = await eventApi.getById(e.eventId);
      setEditingEvent(detail);
      setEventCode(detail.eventCode ?? '');
      setEventName(detail.eventName ?? '');
      setDescription(detail.description ?? '');

      const mapped: EditableEventSession[] =
        detail.eventSessions?.map((s) => {
          const skills =
            (s.eventSessionSkills ?? []).map((x) => ({
              skillId: x.skillId,
              skillName: x.skillName ?? null,
              isActive: x.isActive ?? true,
            })) ?? [];
          const topics =
            (s.eventSessionTopics ?? []).map((x) => ({
              topicId: x.topicId,
              topicName: x.topicName ?? null,
              isActive: x.isActive ?? true,
            })) ?? [];
          return {
            eventSessionId: s.eventSessionId,
            sessionNo: Number(s.sessionNo ?? 0) || 1,
            title: s.title ?? `Buổi ${s.sessionNo ?? ''}`,
            description: (s.description ?? '') as string,
            duration: (s.duration ?? '01:00:00') as string,
            skills,
            initialSkills: skills.map((x) => ({ ...x })),
            pendingSkillIdsToAdd: [],
            showAddSkill: false,
            topics,
            initialTopics: topics.map((x) => ({ ...x })),
            pendingTopicIdsToAdd: [],
            showAddTopic: false,
          };
        }) ?? [];
      setSessions(mapped.length > 0 ? mapped : [
        { eventSessionId: undefined, sessionNo: 1, title: 'Buổi 1', description: '', duration: '01:00:00', skills: [], initialSkills: [], pendingSkillIdsToAdd: [], showAddSkill: false, topics: [], initialTopics: [], pendingTopicIdsToAdd: [], showAddTopic: false },
      ]);
      setSessionsToDelete([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không tải được chi tiết sự kiện';
      message.error(msg);
      // fallback: vẫn cho sửa theo dữ liệu list
      setEditingEvent(e);
      setEventCode(e.eventCode ?? '');
      setEventName(e.eventName ?? '');
      setDescription(e.description ?? '');
      const mapped: EditableEventSession[] =
        e.eventSessions?.map((s) => {
          const skills =
            (s.eventSessionSkills ?? []).map((x) => ({
              skillId: x.skillId,
              skillName: x.skillName ?? null,
              isActive: x.isActive ?? true,
            })) ?? [];
          const topics =
            (s.eventSessionTopics ?? []).map((x) => ({
              topicId: x.topicId,
              topicName: x.topicName ?? null,
              isActive: x.isActive ?? true,
            })) ?? [];
          return {
            eventSessionId: s.eventSessionId,
            sessionNo: Number(s.sessionNo ?? 0) || 1,
            title: s.title ?? `Buổi ${s.sessionNo ?? ''}`,
            description: (s.description ?? '') as string,
            duration: (s.duration ?? '01:00:00') as string,
            skills,
            initialSkills: skills.map((x) => ({ ...x })),
            pendingSkillIdsToAdd: [],
            showAddSkill: false,
            topics,
            initialTopics: topics.map((x) => ({ ...x })),
            pendingTopicIdsToAdd: [],
            showAddTopic: false,
          };
        }) ?? [];
      setSessions(mapped.length > 0 ? mapped : [
        { eventSessionId: undefined, sessionNo: 1, title: 'Buổi 1', description: '', duration: '01:00:00', skills: [], initialSkills: [], pendingSkillIdsToAdd: [], showAddSkill: false, topics: [], initialTopics: [], pendingTopicIdsToAdd: [], showAddTopic: false },
      ]);
      setSessionsToDelete([]);
    } finally {
      setOpenUpsert(true);
    }
  };

  const closeUpsert = () => {
    if (submitting) return;
    setOpenUpsert(false);
  };

  const handleAddSessionLocal = () => {
    const nextNo =
      sessions.length > 0 ? Math.max(...sessions.map((s) => s.sessionNo)) + 1 : 1;
    setSessions((prev) => [
      ...prev,
      {
        eventSessionId: undefined,
        sessionNo: nextNo,
        title: `Buổi ${nextNo}`,
        description: '',
        duration: '01:00:00',
        skills: [],
        initialSkills: [],
        pendingSkillIdsToAdd: [],
        showAddSkill: false,
        topics: [],
        initialTopics: [],
        pendingTopicIdsToAdd: [],
        showAddTopic: false,
      },
    ]);
  };

  const handleRemoveSessionLocal = (eventSessionId?: number, sessionNo?: number) => {
    if (!eventSessionId && !sessionNo) return;
    if (eventSessionId) {
      setSessionsToDelete((prev) =>
        prev.includes(eventSessionId) ? prev : [...prev, eventSessionId],
      );
    }
    setSessions((prev) =>
      prev.filter((s) =>
        eventSessionId ? s.eventSessionId !== eventSessionId : s.sessionNo !== sessionNo,
      ),
    );
  };

  const handleSubmit = async () => {
    if (readOnly) return;
    const base = {
      eventCode: eventCode.trim(),
      eventName: eventName.trim(),
      description: description.trim(),
    };

    if (!base.eventCode) {
      message.warning('Vui lòng nhập mã sự kiện');
      return;
    }
    if (!base.eventName) {
      message.warning('Vui lòng nhập tên sự kiện');
      return;
    }
    if (!base.description) {
      message.warning('Vui lòng nhập mô tả');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'create') {
        if (sessions.length === 0) {
          message.warning('Vui lòng thêm ít nhất 1 buổi cho sự kiện.');
          return;
        }

        const eventSessions = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .map((s) => ({
            title: s.title || `Buổi ${s.sessionNo}`,
            description: s.description ?? '',
            duration:
              typeof s.duration === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(s.duration)
                ? s.duration
                : '01:00:00',
            sessionNo: s.sessionNo,
          }));

        const payload: EventCreatePayload = {
          ...base,
          eventSessions,
        };

        await eventApi.create(payload);
        message.success('Tạo sự kiện thành công');
      } else {
        if (!editingEvent?.eventId) return;

        const payload: EventUpdatePayload = { ...base };
        await eventApi.update(editingEvent.eventId, payload);

        // 1) delete removed sessions
        for (const id of sessionsToDelete) {
          await eventSessionApi.remove(id);
        }

        // 2) update existing sessions (title/description only - BE update request chỉ có 2 field)
        const existing = sessions.filter((s) => s.eventSessionId);
        for (const s of existing) {
          await eventSessionApi.update(s.eventSessionId!, {
            title: s.title || `Buổi ${s.sessionNo}`,
            description: s.description ?? '',
          });
        }

        // 3) create new sessions
        const newOnes = sessions.filter((s) => !s.eventSessionId);
        for (const s of newOnes) {
          const durationForApi =
            typeof s.duration === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(s.duration)
              ? s.duration
              : '01:00:00';
          const created: any = await eventSessionApi.create({
            title: s.title || `Buổi ${s.sessionNo}`,
            description: s.description ?? '',
            eventId: editingEvent.eventId,
            duration: durationForApi,
            sessionNo: s.sessionNo,
          });

          const newId = Number(created?.eventSessionId ?? created?.EventSessionId);
          if (newId) {
            const toAddSkillIds = Array.from(new Set(s.pendingSkillIdsToAdd ?? []));
            const toAddTopicIds = Array.from(new Set(s.pendingTopicIdsToAdd ?? []));

            if (toAddSkillIds.length > 0) await eventSessionSkillApi.assignBulk(newId, toAddSkillIds);
            if (toAddTopicIds.length > 0) await eventSessionTopicApi.assignBulk(newId, toAddTopicIds);
          }
        }

        // 4) sync skills/topics for existing sessions
        for (const s of sessions.filter((x) => x.eventSessionId)) {
          const esId = s.eventSessionId!;
          const originalSkillMap = new Map<number, boolean>(
            (s.initialSkills ?? []).map((x) => [x.skillId, x.isActive ?? true]),
          );
          const currentSkillMap = new Map<number, boolean>(
            (s.skills ?? []).map((x) => [x.skillId, x.isActive ?? true]),
          );
          const toDeactivateSkills: number[] = [];
          const toActivateSkills: number[] = [];
          originalSkillMap.forEach((orig, id) => {
            if (!currentSkillMap.has(id)) return;
            const cur = currentSkillMap.get(id) ?? orig;
            if (orig && !cur) toDeactivateSkills.push(id);
            else if (!orig && cur) toActivateSkills.push(id);
          });
          if (toDeactivateSkills.length > 0) await eventSessionSkillApi.deactivateMany(esId, toDeactivateSkills);
          if (toActivateSkills.length > 0) await eventSessionSkillApi.activateMany(esId, toActivateSkills);

          const originalTopicMap = new Map<number, boolean>(
            (s.initialTopics ?? []).map((x) => [x.topicId, x.isActive ?? true]),
          );
          const currentTopicMap = new Map<number, boolean>(
            (s.topics ?? []).map((x) => [x.topicId, x.isActive ?? true]),
          );
          const toDeactivateTopics: number[] = [];
          const toActivateTopics: number[] = [];
          originalTopicMap.forEach((orig, id) => {
            if (!currentTopicMap.has(id)) return;
            const cur = currentTopicMap.get(id) ?? orig;
            if (orig && !cur) toDeactivateTopics.push(id);
            else if (!orig && cur) toActivateTopics.push(id);
          });
          if (toDeactivateTopics.length > 0) await eventSessionTopicApi.deactivateMany(esId, toDeactivateTopics);
          if (toActivateTopics.length > 0) await eventSessionTopicApi.activateMany(esId, toActivateTopics);

          const toAddSkillIds = Array.from(
            new Set((s.pendingSkillIdsToAdd ?? []).filter((id) => !(s.skills ?? []).some((x) => x.skillId === id))),
          );
          const toAddTopicIds = Array.from(
            new Set((s.pendingTopicIdsToAdd ?? []).filter((id) => !(s.topics ?? []).some((x) => x.topicId === id))),
          );
          if (toAddSkillIds.length > 0) await eventSessionSkillApi.assignBulk(esId, toAddSkillIds);
          if (toAddTopicIds.length > 0) await eventSessionTopicApi.assignBulk(esId, toAddTopicIds);
        }
        message.success('Cập nhật sự kiện thành công');
      }
      setOpenUpsert(false);
      setPageNumber(1);
      await fetchEvents();
    } catch (e: any) {
      message.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (e: EventListItem) => {
    if (readOnly) return;
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
          message.error(getErrorMessage(err));
        }
      },
    });
  };

  const columns: ColumnDef<EventListItem>[] = [
    {
      accessorKey: 'eventCode',
      header: 'Mã sự kiện',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900">
          {row.original.eventCode}
        </span>
      ),
    },
    {
      accessorKey: 'eventName',
      header: 'Tên sự kiện',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{row.original.eventName}</div>
          <div className="text-xs text-gray-500 truncate">
            {row.original.description?.trim() || '—'}
          </div>
        </div>
      ),
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
        if (readOnly) {
          return <TableTextAction onClick={() => void handleViewDetail(ev)} />;
        }
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
            {ev.isActive ? (
              <span title="Ngừng hoạt động">
                <PowerOff
                  size={16}
                  className="text-red-500 cursor-pointer"
                  onClick={() => handleToggleActive(ev)}
                />
              </span>
            ) : (
              <span title="Kích hoạt">
                <Power
                  size={16}
                  className="text-green-600 cursor-pointer"
                  onClick={() => handleToggleActive(ev)}
                />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {readOnly ? (
        <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 bg-slate-50 p-6 pb-8">
          <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <h2 className="text-xl font-semibold text-black">Danh sách sự kiện</h2>
            <p className="text-xs text-gray-500">Xem thông tin các sự kiện trong hệ thống</p>
          </div>

          <div className="shrink-0 px-2 py-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <HoverSearch
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPageNumber(1);
                }}
                placeholder="Tìm theo tên hoặc mã sự kiện..."
              />
              <Button
                variant="secondary"
                className="h-9 border-slate-200 bg-white"
                type="button"
                onClick={() => {
                  setSearch('');
                  setPageNumber(1);
                }}
              >
                <RotateCcw size={16} />
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <DataTable
              comfortable
              fillHeight
              tableGap="tight"
              columns={columns}
              data={events}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={(page) => setPageNumber(page)}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý sự kiện</h2>
          <p className="text-xs text-gray-500">Quản lý các sự kiện trong hệ thống</p>
        </div>

        <Button
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          onClick={openCreate}
        >
          <Plus size={16} />
          Thêm sự kiện
        </Button>
      </div>

      {/* STATS — chỉ manager */}
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
          value={events.reduce((sum, e) => sum + e.numberOfSession, 0)}
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
        </div>
      )}

      <EventDetailSidebar
        open={detailOpen}
        onClose={closeDetailFromUrl}
        event={detailEvent}
      />

      {!readOnly && openUpsert && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={closeUpsert}
          aria-hidden
        />
      )}

      {!readOnly && (
      <div
        className={`fixed top-0 right-0 h-full w-[820px] max-w-[95vw] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${openUpsert ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 bg-[#f3f4f6] border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {mode === 'create' ? 'Thêm sự kiện' : 'Cập nhật sự kiện'}
                </h2>
                <p className="text-sm text-gray-500">Nhập thông tin sự kiện.</p>
              </div>
              <button
                onClick={closeUpsert}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
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
            {/* BE không cho update numberOfSession/duration trực tiếp.
                Số buổi được quản lý bằng danh sách EventSessions bên dưới. */}
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Mô tả ngắn về sự kiện"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Các buổi trong sự kiện</Label>
                <Button type="button" variant="outline" onClick={handleAddSessionLocal}>
                  Thêm buổi
                </Button>
              </div>
              <div className="stoms-scrollbar max-h-[55vh] overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2 space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có buổi nào. Nhấn "Thêm buổi" để tạo.
                  </p>
                ) : (
                  sessions
                    .slice()
                    .sort((a, b) => a.sessionNo - b.sessionNo)
                    .map((s) => (
                      <div
                        key={s.eventSessionId ?? `new-${s.sessionNo}`}
                        className="flex items-start justify-between gap-3 border rounded-md px-3 py-2"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-gray-500">Buổi thứ</Label>
                              <Input
                                value={String(s.sessionNo)}
                                disabled={Boolean(s.eventSessionId)}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  setSessions((prev) =>
                                    prev.map((it) =>
                                      it === s ? { ...it, sessionNo: Number.isFinite(value) ? value : it.sessionNo } : it,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Thời lượng (HH:mm:ss)</Label>
                              <Input
                                value={s.duration}
                                disabled={Boolean(s.eventSessionId)}
                                onChange={(e) =>
                                  setSessions((prev) =>
                                    prev.map((it) =>
                                      it === s ? { ...it, duration: e.target.value } : it,
                                    ),
                                  )
                                }
                                placeholder="01:00:00"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">Tiêu đề</Label>
                            <Input
                              value={s.title}
                              onChange={(e) =>
                                setSessions((prev) =>
                                  prev.map((it) =>
                                    it === s ? { ...it, title: e.target.value } : it,
                                  ),
                                )
                              }
                              placeholder={`Buổi ${s.sessionNo}`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md border p-2">
                              <div className="text-xs text-gray-500 mb-1">Kỹ năng</div>
                              {s.skills.length === 0 ? (
                                <div className="text-xs text-gray-500">Chưa gán skill.</div>
                              ) : (
                                <div className="space-y-1">
                                  {s.skills.map((item) => {
                                    const isActive = item.isActive ?? true;
                                    const name =
                                      item.skillName ??
                                      allSkills.find((x) => x.skillId === item.skillId)?.skillName ??
                                      `Skill #${item.skillId}`;
                                    return (
                                      <div key={item.skillId} className="flex items-center justify-between gap-2">
                                        <span className="text-xs truncate">{name}</span>
                                        <Switch
                                          checked={isActive}
                                          onCheckedChange={(checked) => {
                                            setSessions((prev) =>
                                              prev.map((it) =>
                                                it === s
                                                  ? {
                                                      ...it,
                                                      skills: it.skills.map((x) =>
                                                        x.skillId === item.skillId ? { ...x, isActive: checked } : x,
                                                      ),
                                                    }
                                                  : it,
                                              ),
                                            );
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="mt-2 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSessions((prev) =>
                                      prev.map((it) => (it === s ? { ...it, showAddSkill: !it.showAddSkill } : it)),
                                    )
                                  }
                                  disabled={allSkills.length === 0}
                                >
                                  Thêm
                                </Button>
                              </div>

                              {s.showAddSkill && (
                                <div className="mt-2 max-h-32 overflow-y-auto stoms-scrollbar space-y-1 pr-1">
                                  {allSkills
                                    .filter((sk) => !s.skills.some((x) => x.skillId === sk.skillId))
                                    .map((sk) => {
                                      const checked = s.pendingSkillIdsToAdd.includes(sk.skillId);
                                      return (
                                        <label key={sk.skillId} className="flex items-center gap-2 text-xs">
                                          <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-gray-300"
                                            checked={checked}
                                            onChange={(e) => {
                                              setSessions((prev) =>
                                                prev.map((it) =>
                                                  it === s
                                                    ? {
                                                        ...it,
                                                        pendingSkillIdsToAdd: e.target.checked
                                                          ? [...it.pendingSkillIdsToAdd, sk.skillId]
                                                          : it.pendingSkillIdsToAdd.filter((id) => id !== sk.skillId),
                                                      }
                                                    : it,
                                                ),
                                              );
                                            }}
                                          />
                                          <span className="truncate">{sk.skillName}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>

                            <div className="rounded-md border p-2">
                              <div className="text-xs text-gray-500 mb-1">Chủ đề</div>
                              {s.topics.length === 0 ? (
                                <div className="text-xs text-gray-500">Chưa gán topic.</div>
                              ) : (
                                <div className="space-y-1">
                                  {s.topics.map((item) => {
                                    const isActive = item.isActive ?? true;
                                    const name =
                                      item.topicName ??
                                      allTopics.find((x) => x.topicId === item.topicId)?.topicName ??
                                      `Topic #${item.topicId}`;
                                    return (
                                      <div key={item.topicId} className="flex items-center justify-between gap-2">
                                        <span className="text-xs truncate">{name}</span>
                                        <Switch
                                          checked={isActive}
                                          onCheckedChange={(checked) => {
                                            setSessions((prev) =>
                                              prev.map((it) =>
                                                it === s
                                                  ? {
                                                      ...it,
                                                      topics: it.topics.map((x) =>
                                                        x.topicId === item.topicId ? { ...x, isActive: checked } : x,
                                                      ),
                                                    }
                                                  : it,
                                              ),
                                            );
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="mt-2 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSessions((prev) =>
                                      prev.map((it) => (it === s ? { ...it, showAddTopic: !it.showAddTopic } : it)),
                                    )
                                  }
                                  disabled={allTopics.length === 0}
                                >
                                  Thêm
                                </Button>
                              </div>

                              {s.showAddTopic && (
                                <div className="mt-2 max-h-32 overflow-y-auto stoms-scrollbar space-y-1 pr-1">
                                  {allTopics
                                    .filter((tp) => !s.topics.some((x) => x.topicId === tp.topicId))
                                    .map((tp) => {
                                      const checked = s.pendingTopicIdsToAdd.includes(tp.topicId);
                                      return (
                                        <label key={tp.topicId} className="flex items-center gap-2 text-xs">
                                          <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-gray-300"
                                            checked={checked}
                                            onChange={(e) => {
                                              setSessions((prev) =>
                                                prev.map((it) =>
                                                  it === s
                                                    ? {
                                                        ...it,
                                                        pendingTopicIdsToAdd: e.target.checked
                                                          ? [...it.pendingTopicIdsToAdd, tp.topicId]
                                                          : it.pendingTopicIdsToAdd.filter((id) => id !== tp.topicId),
                                                      }
                                                    : it,
                                                ),
                                              );
                                            }}
                                          />
                                          <span className="truncate">{tp.topicName}</span>
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-gray-500">Mô tả</Label>
                            <textarea
                              value={s.description}
                              onChange={(e) =>
                                setSessions((prev) =>
                                  prev.map((it) =>
                                    it === s ? { ...it, description: e.target.value } : it,
                                  ),
                                )
                              }
                              className="w-full min-h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              placeholder="Mô tả buổi"
                            />
                          </div>

                          {s.eventSessionId && (
                            <div className="text-xs text-gray-500">
                              Lưu ý: buổi đã tồn tại chỉ cập nhật được <b>tiêu đề</b> và <b>mô tả</b>.
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemoveSessionLocal(s.eventSessionId, s.sessionNo)}
                        >
                          Xóa
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto border-t bg-white p-4">
            <div className="flex justify-end gap-2">
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
          </div>
        </div>
      </div>
      )}
    </>
  );
}