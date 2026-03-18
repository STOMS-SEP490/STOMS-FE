import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { SessionDetail } from '@/modules/request/api/type';
import requestService from '@/modules/request/api/requestApi';
import memberApi from '@/modules/member/api/memberApi';
import type { MemberDetail } from '@/modules/member/member';
import assignmentApi from '@/modules/request/api/assignmentApi';
import type { AssignmentDetail } from '@/modules/request/api/type';

export type PopoverStaffItem = {
  assignmentId: number;
  staffMemberId: number;
  role: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export function useSessionDetailPopover(open: boolean, session: SessionDetail | null) {
  const [requestCode, setRequestCode] = useState('');
  const [requestName, setRequestName] = useState('');
  const [membersById, setMembersById] = useState<Record<number, MemberDetail>>({});
  const [assignmentById, setAssignmentById] = useState<Record<number, AssignmentDetail>>({});

  useEffect(() => {
    if (!open) return;
    // reset request info when opening a new session
    setRequestCode('');
    setRequestName('');
  }, [open, session?.sessionId]);

  useEffect(() => {
    if (!open || !session?.requestId) return;
    let cancelled = false;
    requestService
      .getById(session.requestId)
      .then((r) => {
        if (cancelled) return;
        setRequestCode(r.requestCode ?? '');
        setRequestName(r.requestName ?? '');
      })
      .catch(() => {
        message.error('Không tải được thông tin request');
      });
    return () => {
      cancelled = true;
    };
  }, [open, session?.requestId]);

  useEffect(() => {
    if (!open || !session?.assignments?.length) return;

    const assignmentIds = Array.from(
      new Set(
        (session.assignments ?? [])
          .map((a) => a?.assignmentId)
          .filter((x): x is number => typeof x === 'number' && x > 0)
      )
    );
    const missingAssignments = assignmentIds.filter((id) => !assignmentById[id]);

    let cancelled = false;

    if (missingAssignments.length) {
      Promise.all(
        missingAssignments.map(async (id) => {
          try {
            const a = await assignmentApi.getById(id);
            return [id, a] as const;
          } catch {
            return null;
          }
        })
      ).then((pairs) => {
        if (cancelled) return;
        const next: Record<number, AssignmentDetail> = {};
        pairs.forEach((p) => {
          if (!p) return;
          next[p[0]] = p[1];
        });
        if (Object.keys(next).length) {
          setAssignmentById((prev) => ({ ...prev, ...next }));
        }
      });
    }

    const memberIds = Array.from(
      new Set(
        (session.assignments ?? [])
          .map((a) => a?.staffMemberId)
          .filter((x): x is number => typeof x === 'number' && x > 0)
      )
    );
    const missingMembers = memberIds.filter((id) => !membersById[id]);

    if (missingMembers.length) {
      Promise.all(
        missingMembers.map(async (id) => {
          try {
            const m = await memberApi.getMemberById(id);
            return [id, m] as const;
          } catch {
            return null;
          }
        })
      ).then((pairs) => {
        if (cancelled) return;
        const next: Record<number, MemberDetail> = {};
        pairs.forEach((p) => {
          if (!p) return;
          next[p[0]] = p[1];
        });
        if (Object.keys(next).length) {
          setMembersById((prev) => ({ ...prev, ...next }));
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [open, session?.assignments, assignmentById, membersById]);

  const staff: PopoverStaffItem[] = useMemo(() => {
    const items = session?.assignments ?? [];
    return items
      .filter(Boolean)
      .map((a) => ({
        assignmentId: a!.assignmentId,
        staffMemberId: a!.staffMemberId,
        role: (a!.staffRole || '').toUpperCase(),
        name:
          membersById[a!.staffMemberId]?.fullName ??
          assignmentById[a!.assignmentId]?.staffMember?.fullName ??
          a!.staffMember?.fullName ??
          '—',
        email:
          membersById[a!.staffMemberId]?.user?.email ??
          assignmentById[a!.assignmentId]?.staffMember?.userEmail ??
          a!.staffMember?.userEmail ??
          '',
        avatarUrl:
          membersById[a!.staffMemberId]?.avatarUrl ??
          assignmentById[a!.assignmentId]?.staffMember?.avatarUrl ??
          a!.staffMember?.avatarUrl ??
          '',
      }));
  }, [session?.assignments, membersById, assignmentById]);

  return { requestCode, requestName, staff };
}

