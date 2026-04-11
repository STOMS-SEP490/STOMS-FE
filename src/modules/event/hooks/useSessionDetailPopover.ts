import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { SessionDetail } from '@/modules/request/type';
import requestService from '@/modules/request/api/requestApi';
import memberApi from '@/modules/member/api/memberApi';
import type { MemberDetail } from '@/modules/member/member';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import type { AssignmentDetail } from '@/modules/request/type';

export type PopoverStaffItem = {
  assignmentId: number;
  staffMemberId: number;
  role: string;
  name: string;
  email: string;
  avatarUrl: string;
};

function isApprovedAssignmentStatus(status?: string | null) {
  return String(status ?? '').trim().toLowerCase() === 'approved';
}

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
  }, [open, session?.SessionId]);

  useEffect(() => {
    if (!open || !session?.RequestId) return;
    let cancelled = false;
    requestService
      .getById(session.RequestId)
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
  }, [open, session?.RequestId]);

  useEffect(() => {
    if (!open || !session?.Assignments?.length) return;

    const sessionAssignments = (session.Assignments ?? []).filter((a) =>
      isApprovedAssignmentStatus(a?.Status),
    );
    // 如果 session.Assignments 本身就带了成员信息（尤其 FullName），
    // 就没必要再逐个调用 `/api/assignments/{id}` 和 `/api/members/{id}`。
    const hasEmbeddedStaffFullNameForAssignmentId = (assignmentId: number) => {
      const a = sessionAssignments.find((x) => x?.AssignmentId === assignmentId);
      const fullName = a?.StaffMember?.FullName;
      return typeof fullName === 'string' && fullName.trim().length > 0;
    };

    const hasEmbeddedMemberFullNameForStaffMemberId = (staffMemberId: number) => {
      const a = sessionAssignments.find((x) => x?.StaffMemberId === staffMemberId);
      const fullName = a?.StaffMember?.FullName;
      return typeof fullName === 'string' && fullName.trim().length > 0;
    };

    const assignmentIds = Array.from(
      new Set(
        sessionAssignments
          .map((a) => a?.AssignmentId)
          .filter((x): x is number => typeof x === 'number' && x > 0)
      )
    );
    const missingAssignments = assignmentIds.filter(
      (id) => !assignmentById[id] && !hasEmbeddedStaffFullNameForAssignmentId(id)
    );

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
        sessionAssignments
          .map((a) => a?.StaffMemberId)
          .filter((x): x is number => typeof x === 'number' && x > 0)
      )
    );
    const missingMembers = memberIds.filter(
      (id) => !membersById[id] && !hasEmbeddedMemberFullNameForStaffMemberId(id)
    );

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
  }, [open, session?.Assignments, assignmentById, membersById]);

  const staff: PopoverStaffItem[] = useMemo(() => {
    const items = (session?.Assignments ?? []).filter((a) => isApprovedAssignmentStatus(a?.Status));
    return items
      .filter(Boolean)
      .map((a) => ({
        assignmentId: a!.AssignmentId,
        staffMemberId: a!.StaffMemberId,
        role: (a!.StaffRole || '').toUpperCase(),
        name:
          membersById[a!.StaffMemberId]?.fullName ??
          assignmentById[a!.AssignmentId]?.staffMember?.fullName ??
          a!.StaffMember?.FullName ??
          '—',
        email:
          membersById[a!.StaffMemberId]?.email ??
          assignmentById[a!.AssignmentId]?.staffMember?.userEmail ??
          a!.StaffMember?.Email ??
          a!.StaffMember?.User?.Email ??
          '',
        avatarUrl:
          membersById[a!.StaffMemberId]?.avatarUrl ??
          assignmentById[a!.AssignmentId]?.staffMember?.avatarUrl ??
          a!.StaffMember?.AvatarUrl ??
          '',
      }));
  }, [session?.Assignments, membersById, assignmentById]);

  return { requestCode, requestName, staff };
}

