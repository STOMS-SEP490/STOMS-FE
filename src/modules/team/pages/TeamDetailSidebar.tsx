import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Team, TeamMemberItem } from '../team';
import { Badge } from '@/shared/components/ui/badge';
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

/** Chỉ hiển thị topic đang active (isActive === false → ẩn; thiếu field → coi như active, giống MyTeamPage). */
function isTopicActive(isActive?: boolean) {
  return isActive !== false;
}

/** Topic để hiển thị: ưu tiên topics từ GET /teams/:id, không thì teamTopics; cả hai đều lọc active. */
function getDisplayTopics(team: Team): Array<{
  topicId: number;
  topicName: string;
  createdAt?: string | null;
}> {
  if (team.topics && team.topics.length > 0) {
    return team.topics
      .filter((t) => isTopicActive(t.isActive))
      .map((t) => ({
        topicId: t.topicId,
        topicName: t.topicName,
        createdAt: t.createdAt,
      }));
  }
  return (team.teamTopics ?? [])
    .filter((tt) => isTopicActive(tt.isActive))
    .map((tt) => ({
      topicId: tt.topicId,
      topicName: tt.topicName ?? `Chủ đề #${tt.topicId}`,
      createdAt: tt.createdAt,
    }));
}

function roleLabel(roleId: number) {
  switch (roleId) {
    case 6:
      return 'Quản lý thiết bị';
    case 5:
      return 'Trợ giảng';
    case 4:
      return 'Giáo viên';
    case 3:
      return 'Điều phối chương trình';
    case 2:
      return 'Trưởng nhóm';
    case 1:
      return 'Quản lý';
    default:
      return '—';
  }
}

export default function TeamDetailSidebar({ open, onClose, team }: Props) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!open || !team) {
      setMembers([]);
      return;
    }
    if (team.members && team.members.length > 0) {
      setMembers(team.members);
      setLoadingMembers(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await memberApi.getMembers({ TeamId: team.teamId, pageSize: 100 });
        const items = res.items ?? [];
        setMembers(
          items.map((m) => ({
            memberId: m.memberId,
            userId: m.userId,
            roleId: m.roleId,
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

  if (!team) return null;

  const displayTopics = getDisplayTopics(team);

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
        className={`fixed top-0 right-0 h-full w-[480px] app-page-bg z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 app-page-bg">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-black">{team.teamName}</h2>
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
                  <li
                    key={m.memberId}
                    className="flex justify-between items-center bg-white rounded-md px-3 py-2 border border-gray-100 hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      className="flex flex-1 min-w-0 items-center gap-3 text-left"
                      onClick={() => {
                        onClose();
                        navigate(`/manager/members?openDetail=1&memberId=${m.memberId}`);
                      }}
                      title="Xem chi tiết thành viên"
                    >
                      <img
                        src={m.avatarUrl || '/img/ava.png'}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover border border-gray-200 bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{m.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                      </div>
                    </button>
                    <span className="text-xs text-gray-500 shrink-0 pl-3">{roleLabel(m.roleId)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Chưa có thành viên nào trong nhóm.</p>
            )}
          </Section>

          <Section title="Chủ đề">
            {displayTopics.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {displayTopics.map((row) => (
                  <li key={row.topicId} className="bg-gray-50 rounded-md px-3 py-2">
                    <span className="font-medium">{row.topicName}</span>
                    {row.createdAt ? (
                      <span className="text-gray-500 text-xs ml-2">
                        ({formatDateTime(row.createdAt)})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Chưa có chủ đề nào</p>
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
