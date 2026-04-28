import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bookmark, Users, X } from 'lucide-react';
import type { Team, TeamMemberItem } from '../team';
import { cn } from '@/shared/lib/utils';
import memberApi from '@/modules/member/api/memberApi';
import { useNavigate } from 'react-router-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  team: Team | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function isTopicActive(isActive?: boolean) {
  return isActive !== false;
}

function getDisplayTopics(team: Team) {
  if (team.topics && team.topics.length > 0) {
    return team.topics
      .filter((t) => isTopicActive(t.isActive))
      .map((t) => ({ topicId: t.topicId, topicName: t.topicName, createdAt: t.createdAt }));
  }
  return (team.teamTopics ?? [])
    .filter((tt) => isTopicActive(tt.isActive))
    .map((tt) => ({
      topicId: tt.topicId,
      topicName: tt.topicName ?? `Chủ đề #${tt.topicId}`,
      createdAt: tt.createdAt,
    }));
}

function roleLabel(roleId: number | null | undefined) {
  switch (roleId) {
    case 6: return 'Giám sát thiết bị';
    case 5: return 'Sinh viên';
    case 4: return 'Giảng viên';
    case 3: return 'Điều phối chương trình';
    case 2: return 'Trưởng nhóm';
    case 1: return 'Quản lý';
    default: return '—';
  }
}

export default function TeamDetailSidebar({ open, onClose, team }: Props) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!open || !team) { setMembers([]); return; }
    if (team.members && team.members.length > 0) {
      setMembers(team.members);
      setLoadingMembers(false);
      return;
    }
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await memberApi.getMembers({ TeamId: team.teamId, pageSize: 100 });
        setMembers(
          (res.items ?? []).map((m) => ({
            memberId: m.memberId,
            userId: m.userId,
            roleId: m.roleId ?? null,
            teamId: m.teamId,
            avatarUrl: m.avatarUrl,
            fullName: m.fullName,
            phone: m.phone,
            address: m.address,
            cin: m.cin,
            bankCode: m.bankCode,
            bankName: m.bankName,
            taxNumber: m.taxNumber,
            email: m.email ?? '',
          }))
        );
      } catch {
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };
    void fetchMembers();
  }, [open, team]);

  if (!open || !team) return null;

  const displayTopics = getDisplayTopics(team);

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          {/* ── HEADER ── */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="truncate text-base font-semibold text-black">{team.teamName}</h2>
                {team.leaderMemberName && (
                  <p className="text-sm text-[#2197C0]">Trưởng nhóm: {team.leaderMemberName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-full flex-col divide-y divide-slate-200 border-t border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số thành viên</p>
                <p className="mt-0.5 text-sm font-medium text-black">
                  {members.length > 0 ? members.length : (team.totalMembers ?? '—')}
                </p>
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                <p className="mt-0.5 text-sm font-medium text-black">{formatDateTime(team.createdAt)}</p>
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Cập nhật lần cuối</p>
                <p className="mt-0.5 break-words text-sm font-medium text-black">{formatDateTime(team.updatedAt)}</p>
              </div>
            </div>
          </header>

          {/* ── BODY ── */}
          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            <div className="space-y-4">

              {/* Thành viên */}
              <Section icon={Users} title="Thành viên trong nhóm">
                {loadingMembers ? (
                  <div className="pl-4 py-2">
                    <p className="text-sm text-slate-500">Đang tải thành viên...</p>
                  </div>
                ) : members.length > 0 ? (
                  <div className="pl-4 divide-y divide-slate-200">
                    {members.map((m) => (
                      <button
                        key={m.memberId}
                        type="button"
                        className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          onClose();
                          navigate(`/manager/members?openDetail=1&memberId=${m.memberId}`);
                        }}
                        title="Xem chi tiết thành viên"
                      >
                        <img
                          src={m.avatarUrl || '/img/ava.png'}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-black">{m.fullName}</p>
                          <p className="truncate text-xs text-[#2197C0]">{m.email}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">{roleLabel(m.roleId)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pl-4 py-2">
                    <p className="text-sm text-slate-500">Chưa có thành viên nào trong nhóm.</p>
                  </div>
                )}
              </Section>

              {/* Chủ đề */}
              <Section icon={Bookmark} title="Chủ đề">
                {displayTopics.length > 0 ? (
                  <div className="pl-4 divide-y divide-slate-200">
                    {displayTopics.map((row) => (
                      <div key={row.topicId} className="py-1.5">
                        <p className="text-sm font-medium text-black">{row.topicName}</p>
                        {row.createdAt && (
                          <p className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pl-4 py-2">
                    <p className="text-sm text-slate-500">Chưa có chủ đề nào.</p>
                  </div>
                )}
              </Section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}
