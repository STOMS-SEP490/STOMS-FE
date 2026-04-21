import { DataTable } from '@/shared/components/common/DataTable'; 
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
  CalendarDays,
  CheckCircle,
  Clock,
  Eye,
  X,
  Pencil,
  Plus,
  RotateCcw,
  Power,
  PowerOff,
  Sparkles,
  Tags,
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
import { dashboardApi, type DashboardEventSummary } from '@/modules/dashboard/api/dashboardApi';

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
  const [eventSummary, setEventSummary] = useState<DashboardEventSummary | null>(null);

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

  const fetchEventSummary = useCallback(async () => {
    if (readOnly) return;
    try {
      const summary = await dashboardApi.getEventSummary();
      setEventSummary(summary);
    } catch {
      setEventSummary(null);
    }
  }, [readOnly]);

  useEffect(() => {
    void fetchEventSummary();
  }, [fetchEventSummary]);

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

        // Các trường buổi là bắt buộc (để đồng bộ UX và tránh tạo buổi "rỗng").
        const missingSessionTitle = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => !String(s.title ?? '').trim());
        if (missingSessionTitle) {
          message.warning(`Vui lòng nhập tiêu đề cho Buổi ${missingSessionTitle.sessionNo}.`);
          return;
        }

        const missingSessionDesc = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => !String(s.description ?? '').trim());
        if (missingSessionDesc) {
          message.warning(`Vui lòng nhập mô tả cho Buổi ${missingSessionDesc.sessionNo}.`);
          return;
        }

        const missingOrInvalidDuration = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => {
            const d = String(s.duration ?? '').trim();
            if (!d) return true;
            return !/^\d{1,2}:\d{2}:\d{2}$/.test(d);
          });
        if (missingOrInvalidDuration) {
          message.warning(
            `Vui lòng nhập thời lượng hợp lệ (HH:mm:ss) cho Buổi ${missingOrInvalidDuration.sessionNo}.`,
          );
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

        const created = await eventApi.create(payload);

        // Sau khi tạo, cần có eventSessionId để gắn skill/topic.
        const createdEventId = Number((created as any)?.eventId ?? (created as any)?.EventId ?? 0);
        const detail =
          createdEventId > 0
            ? await eventApi.getById(createdEventId).catch(() => created)
            : created;

        const detailSessions = ((detail as any)?.eventSessions ?? (detail as any)?.EventSessions ?? []) as any[];
        const sessionIdByNo = new Map<number, number>();
        detailSessions.forEach((es) => {
          const no = Number(es?.sessionNo ?? es?.SessionNo ?? 0);
          const id = Number(es?.eventSessionId ?? es?.EventSessionId ?? 0);
          if (no > 0 && id > 0) sessionIdByNo.set(no, id);
        });

        let anyAttachFailed = false;
        for (const s of sessions) {
          const esId = sessionIdByNo.get(Number(s.sessionNo ?? 0)) ?? 0;
          if (!esId) {
            anyAttachFailed = true;
            continue;
          }
          const toAddSkillIds = Array.from(new Set(s.pendingSkillIdsToAdd ?? [])).filter((x) => Number(x) > 0);
          const toAddTopicIds = Array.from(new Set(s.pendingTopicIdsToAdd ?? [])).filter((x) => Number(x) > 0);
          try {
            if (toAddSkillIds.length > 0) await eventSessionSkillApi.assignBulk(esId, toAddSkillIds);
            if (toAddTopicIds.length > 0) await eventSessionTopicApi.assignBulk(esId, toAddTopicIds);
          } catch {
            anyAttachFailed = true;
          }
        }

        if (anyAttachFailed) {
          message.warning('Tạo sự kiện thành công, nhưng gán kỹ năng/chủ đề cho một số buổi chưa thành công.');
        } else {
          message.success('Tạo sự kiện thành công');
        }
      } else {
        if (!editingEvent?.eventId) return;

        if (sessions.length === 0) {
          message.warning('Vui lòng thêm ít nhất 1 buổi cho sự kiện.');
          return;
        }

        const missingSessionTitle = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => !String(s.title ?? '').trim());
        if (missingSessionTitle) {
          message.warning(`Vui lòng nhập tiêu đề cho Buổi ${missingSessionTitle.sessionNo}.`);
          return;
        }

        const missingSessionDesc = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => !String(s.description ?? '').trim());
        if (missingSessionDesc) {
          message.warning(`Vui lòng nhập mô tả cho Buổi ${missingSessionDesc.sessionNo}.`);
          return;
        }

        const missingOrInvalidDuration = sessions
          .slice()
          .sort((a, b) => a.sessionNo - b.sessionNo)
          .find((s) => {
            const d = String(s.duration ?? '').trim();
            if (!d) return true;
            return !/^\d{1,2}:\d{2}:\d{2}$/.test(d);
          });
        if (missingOrInvalidDuration) {
          message.warning(
            `Vui lòng nhập thời lượng hợp lệ (HH:mm:ss) cho Buổi ${missingOrInvalidDuration.sessionNo}.`,
          );
          return;
        }

        const payload: EventUpdatePayload = { ...base };
        await eventApi.update(editingEvent.eventId, payload);

        // 1) delete removed sessions
        for (const id of sessionsToDelete) {
          await eventSessionApi.remove(id);
        }

        // 2) update existing sessions
        const existing = sessions.filter((s) => s.eventSessionId);
        for (const s of existing) {
          const durationForApi =
            typeof s.duration === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(s.duration)
              ? s.duration
              : '01:00:00';
          await eventSessionApi.update(s.eventSessionId!, {
            title: s.title || `Buổi ${s.sessionNo}`,
            description: s.description ?? '',
            duration: durationForApi,
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
      await fetchEventSummary();
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
          await fetchEventSummary();
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
        <span className="font-semibold text-[#1a7a99]">
          {row.original.eventCode}
        </span>
      ),
    },
    {
      accessorKey: 'eventName',
      header: 'Tên sự kiện',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 ">{row.original.eventName}</div>
          <div className="text-xs text-gray-500 ">
            {row.original.description?.trim() || '—'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: () => <span className="block w-full text-center">Thời lượng</span>,
      cell: ({ row }) => {
        const d = String(row.original.duration ?? '').trim();
        return (
          <div className="text-center">
            <span className="tabular-nums text-gray-800">{d || '—'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'numberOfSession',
      header: () => <span className="block w-full text-center">Số buổi</span>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-medium">{row.original.numberOfSession} buổi</span>
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: () => <span className="block w-full text-center">Cập nhật</span>,
      cell: ({ row }) => (
        <div className="text-center tabular-nums text-gray-800">
          {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString('vi-VN') : '—'}
        </div>
      ),
    },
    {
      id: 'status',
      header: () => <span className="block w-full text-center">Trạng thái</span>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="bg-gray-200 text-gray-600">Ngừng hoạt động</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="block w-full text-center">Thao tác</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const ev = row.original;
        return (
          <div className="flex items-center justify-center gap-2">
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
  const visibleColumns = readOnly
    ? columns.filter((column) => column.id !== 'status' && column.id !== 'actions')
    : columns;

  return (
    <>
      {readOnly ? (
        <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 app-page-bg p-6 pl-8 pb-8">
          <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách sự kiện</h2>
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
              columns={visibleColumns}
              data={events}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={(page) => setPageNumber(page)}
              onRowClick={(row) => {
                void handleViewDetail(row);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 pl-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý sự kiện</h2>
          <p className="text-xs text-slate-500">Quản lý các sự kiện trong hệ thống</p>
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
          value={eventSummary?.totalEvents ?? 0}
          sub="sự kiện trong hệ thống"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={eventSummary?.activeEvents ?? 0}
          sub="sự kiện đang hoạt động"
          variant="green"
        />
        <StatCard
          icon={<Clock />}
          label="Tổng buổi"
          value={eventSummary?.totalSessions ?? 0}
          sub="tổng số buổi"
          variant="violet"
        />
        <StatCard
          icon={<CalendarDays />}
          label="Sắp diễn ra"
          value={eventSummary?.upcomingEvents ?? 0}
          sub="sự kiện sắp diễn ra"
          variant="amber"
        />
      </div>

      <div className="flex justify-end gap-3 mb-2 flex-wrap">
        <HoverSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPageNumber(1);
          }}
          placeholder="Tìm theo tên hoặc mã sự kiện..."
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap shrink-0">Trạng thái</span>
            <Select
              value={statusFilter}
              onValueChange={(v: 'all' | 'active' | 'inactive') => {
                setStatusFilter(v);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setPageNumber(1);
            }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={visibleColumns}
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
          className="fixed inset-0 z-40 h-full bg-black/40 backdrop-blur-[1px]"
          onClick={closeUpsert}
          aria-hidden
        />
      )}

      {!readOnly && (
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[760px] max-w-[94vw] bg-slate-50 shadow-2xl
        transition-transform duration-300
        ${openUpsert ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-[#1a7a99]">
                  {mode === 'create' ? 'Thêm sự kiện' : 'Cập nhật sự kiện'}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">Thiết lập thông tin chung và các buổi của sự kiện.</p>
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

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="space-y-2">
                <Label>
                  Mã sự kiện <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  placeholder="VD: EV-001"
                  className="border-0 bg-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Tên sự kiện <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="VD: Triển lãm mùa xuân"
                  className="border-0 bg-slate-100"
                />
              </div>
            </div>
            {/* Số buổi được quản lý bằng danh sách EventSessions bên dưới. */}
            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
              <Label>
                Mô tả <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-24 rounded-xl border-0 bg-slate-100 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Mô tả ngắn về sự kiện"
              />
            </div>

            <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#1a7a99]">Các buổi trong sự kiện</p>
                  <p className="text-xs text-slate-500">Thiết kế nội dung từng buổi, kỹ năng và chủ đề liên quan.</p>
                </div>
                <Button
                  type="button"
                  className="border-slate-200 bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-800 hover:from-sky-100 hover:to-cyan-100"
                  onClick={handleAddSessionLocal}
                >
                  Thêm buổi
                </Button>
              </div>
              <div className="stoms-scrollbar max-h-[55vh] overflow-y-auto rounded-xl bg-slate-50/80 p-3 pr-2 space-y-3">
                {sessions.length === 0 ? (
                  <p className="rounded-lg bg-white/70 px-3 py-2 text-sm italic text-muted-foreground">
                    Chưa có buổi nào. Nhấn "Thêm buổi" để tạo.
                  </p>
                ) : (
                  sessions
                    .slice()
                    .sort((a, b) => a.sessionNo - b.sessionNo)
                    .map((s) => (
                      <li key={s.eventSessionId ?? `new-${s.sessionNo}`} className="relative flex gap-3">
                        <div className="relative flex w-9 shrink-0 flex-col items-center self-stretch">
                          <div
                            className="pointer-events-none absolute left-1/2 top-9 bottom-[-1rem] w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-300/70 via-slate-200/60 to-slate-200/30"
                            aria-hidden
                          />
                          <div
                            className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/95 bg-white text-[11px] font-semibold tabular-nums tracking-tight text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-[3px] ring-slate-50"
                            aria-hidden
                          >
                            {s.sessionNo}
                          </div>
                        </div>

                        <details className="group min-w-0 flex-1 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60" open>
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-[#1a7a99] truncate">
                                    {s.title?.trim() ? s.title : `Buổi ${s.sessionNo}`}
                                  </h4>
                                  {s.description?.trim() ? (
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                                      {s.description.trim()}
                                    </p>
                                  ) : null}
                                </div>
                                {s.duration ? (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    <Clock className="h-3 w-3" aria-hidden />
                                    {s.duration}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                    <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                                    Kỹ năng
                                  </div>
                                  {(() => {
                                    const activeSkills = (s.skills ?? []).filter((x) => x.isActive !== false);
                                    const pendingSkillIds = Array.from(new Set(s.pendingSkillIdsToAdd ?? [])).filter(
                                      (id) => Number(id) > 0,
                                    );
                                    const activeIds = new Set(activeSkills.map((x) => x.skillId));
                                    const pendingSkills = pendingSkillIds
                                      .filter((id) => !activeIds.has(id))
                                      .map((id) => ({
                                        skillId: id,
                                        skillName:
                                          allSkills.find((sk) => sk.skillId === id)?.skillName ?? `#${id}`,
                                      }));
                                    const display = [...activeSkills, ...pendingSkills];
                                    return display.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {display.slice(0, 4).map((x) => (
                                          <span
                                            key={x.skillId}
                                            className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900"
                                          >
                                            {x.skillName ??
                                              allSkills.find((sk) => sk.skillId === x.skillId)?.skillName ??
                                              `#${x.skillId}`}
                                          </span>
                                        ))}
                                      {display.length > 4 ? (
                                        <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900">
                                          +{display.length - 4}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">Chưa gán kỹ năng</span>
                                  );
                                  })()}
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                    <Tags className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                                    Chủ đề
                                  </div>
                                  {(() => {
                                    const activeTopics = (s.topics ?? []).filter((x) => x.isActive !== false);
                                    const pendingTopicIds = Array.from(new Set(s.pendingTopicIdsToAdd ?? [])).filter(
                                      (id) => Number(id) > 0,
                                    );
                                    const activeIds = new Set(activeTopics.map((x) => x.topicId));
                                    const pendingTopics = pendingTopicIds
                                      .filter((id) => !activeIds.has(id))
                                      .map((id) => ({
                                        topicId: id,
                                        topicName:
                                          allTopics.find((tp) => tp.topicId === id)?.topicName ?? `#${id}`,
                                      }));
                                    const display = [...activeTopics, ...pendingTopics];
                                    return display.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {display.slice(0, 4).map((x) => (
                                          <span
                                            key={x.topicId}
                                            className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                                          >
                                            {x.topicName ??
                                              allTopics.find((tp) => tp.topicId === x.topicId)?.topicName ??
                                              `#${x.topicId}`}
                                          </span>
                                        ))}
                                      {display.length > 4 ? (
                                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                                          +{display.length - 4}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">Chưa gán chủ đề</span>
                                  );
                                  })()}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 border-0 bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveSessionLocal(s.eventSessionId, s.sessionNo);
                              }}
                            >
                              Xóa
                            </Button>
                          </summary>

                          <div className="border-t border-slate-200/70 bg-slate-50/40 px-4 py-4">
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    Thời lượng (HH:mm:ss) <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    value={s.duration}
                                    disabled={submitting}
                                    onChange={(e) =>
                                      setSessions((prev) =>
                                        prev.map((it) => (it === s ? { ...it, duration: e.target.value } : it)),
                                      )
                                    }
                                    placeholder="01:00:00"
                                    className="border-0 bg-white shadow-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-500">
                                    Tiêu đề <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    value={s.title}
                                    onChange={(e) =>
                                      setSessions((prev) =>
                                        prev.map((it) => (it === s ? { ...it, title: e.target.value } : it)),
                                      )
                                    }
                                    placeholder={`Buổi ${s.sessionNo}`}
                                    className="border-0 bg-white shadow-sm"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs text-gray-500">
                                  Mô tả <span className="text-red-500">*</span>
                                </Label>
                                <textarea
                                  value={s.description}
                                  onChange={(e) =>
                                    setSessions((prev) =>
                                      prev.map((it) => (it === s ? { ...it, description: e.target.value } : it)),
                                    )
                                  }
                                  className="w-full min-h-20 rounded-xl border-0 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  placeholder="Mô tả buổi"
                                />
                              </div>

                              <div className="rounded-xl bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-[#1a7a99]">Kỹ năng</p>
                                    <p className="text-[11px] text-slate-500">Chọn các kỹ năng cần có cho buổi này.</p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="border-0 bg-violet-100 text-violet-800 hover:bg-violet-200"
                                    onClick={() =>
                                      setSessions((prev) =>
                                        prev.map((it) =>
                                          it === s ? { ...it, showAddSkill: !it.showAddSkill } : it,
                                        ),
                                      )
                                    }
                                    disabled={allSkills.length === 0}
                                  >
                                    Thêm
                                  </Button>
                                </div>

                                {s.skills.length === 0 ? (
                                  <p className="mt-2 text-xs text-slate-500 italic">Chưa gán kỹ năng.</p>
                                ) : (
                                  <div className="mt-2 space-y-1">
                                    {s.skills.map((item) => {
                                      const isActive = item.isActive ?? true;
                                      const name =
                                        item.skillName ??
                                        allSkills.find((x) => x.skillId === item.skillId)?.skillName ??
                                        `Kỹ năng #${item.skillId}`;
                                      return (
                                        <div
                                          key={item.skillId}
                                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                                        >
                                          <span className="text-xs text-slate-700 truncate">{name}</span>
                                          <Switch
                                            checked={isActive}
                                            onCheckedChange={(checked) => {
                                              setSessions((prev) =>
                                                prev.map((it) =>
                                                  it === s
                                                    ? {
                                                        ...it,
                                                        skills: it.skills.map((x) =>
                                                          x.skillId === item.skillId
                                                            ? { ...x, isActive: checked }
                                                            : x,
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

                                {s.showAddSkill && (
                                  <div className="mt-3 max-h-40 overflow-y-auto stoms-scrollbar space-y-1 pr-1">
                                    {allSkills
                                      .filter((sk) => !s.skills.some((x) => x.skillId === sk.skillId))
                                      .map((sk) => {
                                        const checked = s.pendingSkillIdsToAdd.includes(sk.skillId);
                                        return (
                                          <label
                                            key={sk.skillId}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                          >
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
                                                            : it.pendingSkillIdsToAdd.filter(
                                                                (id) => id !== sk.skillId,
                                                              ),
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

                              <div className="rounded-xl bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-[#1a7a99]">Chủ đề</p>
                                    <p className="text-[11px] text-slate-500">Chọn chủ đề liên quan cho buổi này.</p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="border-0 bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    onClick={() =>
                                      setSessions((prev) =>
                                        prev.map((it) =>
                                          it === s ? { ...it, showAddTopic: !it.showAddTopic } : it,
                                        ),
                                      )
                                    }
                                    disabled={allTopics.length === 0}
                                  >
                                    Thêm
                                  </Button>
                                </div>

                                {s.topics.length === 0 ? (
                                  <p className="mt-2 text-xs text-slate-500 italic">Chưa gán chủ đề.</p>
                                ) : (
                                  <div className="mt-2 space-y-1">
                                    {s.topics.map((item) => {
                                      const isActive = item.isActive ?? true;
                                      const name =
                                        item.topicName ??
                                        allTopics.find((x) => x.topicId === item.topicId)?.topicName ??
                                        `Chủ đề #${item.topicId}`;
                                      return (
                                        <div
                                          key={item.topicId}
                                          className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                                        >
                                          <span className="text-xs text-slate-700 truncate">{name}</span>
                                          <Switch
                                            checked={isActive}
                                            onCheckedChange={(checked) => {
                                              setSessions((prev) =>
                                                prev.map((it) =>
                                                  it === s
                                                    ? {
                                                        ...it,
                                                        topics: it.topics.map((x) =>
                                                          x.topicId === item.topicId
                                                            ? { ...x, isActive: checked }
                                                            : x,
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

                                {s.showAddTopic && (
                                  <div className="mt-3 max-h-40 overflow-y-auto stoms-scrollbar space-y-1 pr-1">
                                    {allTopics
                                      .filter((tp) => !s.topics.some((x) => x.topicId === tp.topicId))
                                      .map((tp) => {
                                        const checked = s.pendingTopicIdsToAdd.includes(tp.topicId);
                                        return (
                                          <label
                                            key={tp.topicId}
                                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                                          >
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
                                                            : it.pendingTopicIdsToAdd.filter(
                                                                (id) => id !== tp.topicId,
                                                              ),
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

                              {s.eventSessionId && (
                                <div className="text-xs text-gray-500">
                                  Lưu ý: buổi đã tồn tại chỉ cập nhật được <b>tiêu đề</b> và <b>mô tả</b>.
                                </div>
                              )}
                            </div>
                          </div>
                        </details>
                      </li>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-200/80 bg-white/95 p-4 backdrop-blur">
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-200 bg-white" onClick={closeUpsert} disabled={submitting}>
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