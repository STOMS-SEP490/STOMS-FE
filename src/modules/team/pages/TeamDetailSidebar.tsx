import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Team } from '../team';
import { Badge } from '@/shared/components/ui/badge';
import type { Member } from '@/modules/member/member';
import memberApi from '@/modules/member/api/memberApi';

type Props = {
  open: boolean;
  onClose: () => void;
  team: Team | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export default function TeamDetailSidebar({ open, onClose, team }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!open || !team) {
        setMembers([]);
        return;
      }
      try {
        setLoadingMembers(true);
        const res = await memberApi.getMembers({ TeamId: team.teamId, pageSize: 100 });
        setMembers(res.items ?? []);
      } catch {
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [open, team]);

  if (!team) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 bg-[#f3f4f6]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-black">{team.teamName}</h2>
                <p className="text-sm text-gray-500">Team #{team.teamId}</p>
                {team.leaderMemberName && (
                  <Badge className="mt-2 bg-[#2197C0]/10 text-[#2197C0]">
                    Trưởng nhóm: {team.leaderMemberName}
                  </Badge>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold">ID NHÓM</p>
                <p>{team.teamId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">TRƯỞNG NHÓM (ID)</p>
                <p>{team.leaderMemberId ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">NGÀY TẠO</p>
                <p>{formatDateTime(team.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">CẬP NHẬT LẦN CUỐI</p>
                <p>{formatDateTime(team.updatedAt)}</p>
              </div>
            </div>
          </div>

          <Section title="Thành viên trong nhóm">
            {loadingMembers ? (
              <p className="text-sm text-gray-500">Đang tải thành viên...</p>
            ) : members.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {members.map((m) => (
                  <li key={m.memberId} className="flex justify-between items-center bg-white rounded-md px-3 py-2 border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{m.fullName}</p>
                      <p className="text-xs text-gray-500">{m.user?.email}</p>
                    </div>
                    <span className="text-xs text-gray-400">#{m.memberId}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Chưa có thành viên nào trong nhóm.</p>
            )}
          </Section>

          <Section title="Chủ đề">
            {team.teamTopics && team.teamTopics.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {team.teamTopics.map((tt, i) => (
                  <li key={i} className="bg-gray-50 rounded-md px-3 py-2">
                    <span className="font-medium">
                      {tt.topicName ?? `Topic #${tt.topicId}`}
                    </span>
                    {tt.createdAt && (
                      <span className="text-gray-500 text-xs ml-2">
                        ({formatDateTime(tt.createdAt)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Chưa có topic nào</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm mx-6 mb-4 space-y-4">
      <h3 className="font-semibold text-black">{title}</h3>
      {children}
    </div>
  );
}
