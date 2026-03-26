import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import type { RequestSessionSummary } from '../request';

type SessionWithOptional = RequestSessionSummary & {
  teamAssigned?: boolean;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

type Props = {
  session: SessionWithOptional;
  assignedTeamIds: number[];
};

export default function RequestDetailTeamSummary({ session, assignedTeamIds }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignedTeamIds.length) {
      setTeams([]);
      return;
    }
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await Promise.all(
          assignedTeamIds.map((id) =>
            teamApi.getById(id).catch(() => null)
          )
        );
        setTeams(list.filter((t): t is Team => t != null));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thông tin đội.';
        setError(msg);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [assignedTeamIds]);

  const totalStaff =
    (session.teachersRequired ?? 1) + (session.tasRequired ?? 1);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Đội phụ trách</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-500">Đang tải thông tin đội...</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : teams.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có thông tin đội.</p>
        ) : (
          <>
            {teams.map((team) => (
              <div
                key={team.teamId}
                className="flex items-center justify-between gap-3 text-sm text-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-black">{team.teamName}</p>
                    <p className="text-xs text-gray-500">
                      Đội đã gắn
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>
                    Giảng viên:{' '}
                    <span className="font-semibold text-black">
                      {session.teachersRequired ?? '—'}
                    </span>
                  </p>
                  <p>
                    Trợ giảng:{' '}
                    <span className="font-semibold text-black">
                      {session.tasRequired ?? '—'}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Tổng nhân sự:{' '}
                    <span className="font-semibold text-sky-600">
                      {totalStaff}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
