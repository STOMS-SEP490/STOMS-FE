import { useEffect, useState } from 'react';
import { message } from 'antd';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem } from '@/modules/request/request';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport } from '../taskReport';

type TaskItem = {
  TaskId?: number;
  Title?: string | null;
  Description?: string | null;
  Status?: string | null;
};

type RequestWithTasks = RequestListItem & {
  Tasks?: TaskItem[];
};

export function useManagerTaskSession(sessionId: number, selectedMemberId: number | null) {
  // ── Session & Request data ──
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [request, setRequest] = useState<RequestWithTasks | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Task reports ──
  const [requestReports, setRequestReports] = useState<TaskReport[]>([]);
  const [sessionReports, setSessionReports] = useState<TaskReport[]>([]);
  const [requestReportsLoading, setRequestReportsLoading] = useState(false);
  const [sessionReportsLoading, setSessionReportsLoading] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // ── Load session & request ──
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const run = async () => {
      setSessionLoading(true);
      try {
        const s = await sessionApi.getById(sessionId);
        if (cancelled) return;
        setSession(s);
        
        if (s.RequestId) {
          try {
            const req = await requestApi.getById(s.RequestId);
            if (!cancelled) setRequest(req);
          } catch {
            if (!cancelled) message.error('Không tải được thông tin yêu cầu.');
          }
        }
      } catch {
        if (cancelled) return;
        message.error('Không tải được thông tin buổi.');
      } finally {
        if (cancelled) return;
        setSessionLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Load request reports ──
  useEffect(() => {
    if (!session?.RequestId || !selectedMemberId) return;
    let cancelled = false;
    const run = async () => {
      setRequestReportsLoading(true);
      setRequestReports([]);
      try {
        const res = await taskReportApi.getAll({
          requestId: session.RequestId,
          MemberId: selectedMemberId,
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        // Filter to only get reports that have requestId but no sessionId
        const filteredReports = (res.items ?? []).filter(r => r.requestId && !r.sessionId);
        setRequestReports(filteredReports);
      } catch {
        if (cancelled) return;
        message.error('Không tải được báo cáo cho yêu cầu.');
      } finally {
        if (cancelled) return;
        setRequestReportsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [session?.RequestId, selectedMemberId, refetchTrigger]);

  // ── Load session reports ──
  useEffect(() => {
    if (!sessionId || !selectedMemberId) return;
    let cancelled = false;
    const run = async () => {
      setSessionReportsLoading(true);
      setSessionReports([]);
      try {
        const res = await taskReportApi.getAll({
          sessionId,
          MemberId: selectedMemberId,
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        setSessionReports(res.items ?? []);
      } catch {
        if (cancelled) return;
        message.error('Không tải được báo cáo cho buổi.');
      } finally {
        if (cancelled) return;
        setSessionReportsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [sessionId, selectedMemberId, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    // Data
    session,
    request,
    requestReports,
    sessionReports,
    sessionLoading,
    requestReportsLoading,
    sessionReportsLoading,
    searchTitle,
    setSearchTitle,
    refetch,
  };
}