import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { Search, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import type { Team } from '@/modules/team/team';
import { sessionApi } from '../api/sessionApi';

export type SessionForTeam = {
  sessionNo: number;
  startAt: string;
  endAt: string;
};

type Props = {
  session: SessionForTeam & { sessionId: number };
  requestCode: string;
  sessionsCount: number;
  onClose: () => void;
  onAssignToAll: (teamIds: number[]) => void;
};

export default function RequestDetailTeamPanel({
  session,
  requestCode,
  sessionsCount,
  onClose,
  onAssignToAll,
}: Props) {
  const [suggestedTeams, setSuggestedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [addedTeamIds, setAddedTeamIds] = useState<number[]>([]);
  const [teamDetailPopup, setTeamDetailPopup] = useState<{ team: Team; left: number; top: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closePopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      setAddedTeamIds([]);
      try {
        const teams = await sessionApi.suggestTeams(session.sessionId);
        setSuggestedTeams(teams);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách đội gợi ý.';
        setError(msg);
        setSuggestedTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [session.sessionId]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return suggestedTeams;
    return suggestedTeams.filter((t) => t.teamName.toLowerCase().includes(q));
  }, [suggestedTeams, teamSearch]);

  const toggleTeamAdded = useCallback((teamId: number) => {
    setAddedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }, []);

  const removeAddedTeam = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
  }, []);

  const POPUP_WIDTH = 288;
  const handleTeamCardMouseEnter = useCallback((team: Team, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const target = e.currentTarget;
    hoverTimerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setTeamDetailPopup({ team, left: Math.max(8, rect.left - POPUP_WIDTH - 8), top: rect.top });
    }, 1200);
  }, []);

  const handleTeamCardMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (closePopupTimerRef.current) clearTimeout(closePopupTimerRef.current);
    closePopupTimerRef.current = setTimeout(() => setTeamDetailPopup(null), 150);
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    if (closePopupTimerRef.current) {
      clearTimeout(closePopupTimerRef.current);
      closePopupTimerRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => setTeamDetailPopup(null), []);

  const assignAllChecked = sessionsCount > 0 && addedTeamIds.length > 0;
  const handleAssignAllSwitch = useCallback(
    (checked: boolean) => {
      onAssignToAll(checked && addedTeamIds.length > 0 ? addedTeamIds : []);
    },
    [addedTeamIds, onAssignToAll]
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-black">Gán đội phụ trách</h3>
      <p className="text-xs text-gray-500">
        Danh sách đội được hệ thống gợi ý dựa trên ràng buộc và lịch dạy.
      </p>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tìm theo tên đội"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          className="pl-9 text-xs text-black border-gray-200 bg-white"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Đang tải danh sách đội gợi ý...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="text-xs text-gray-500">Không có đội gợi ý phù hợp cho phiên này.</p>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map((team) => {
            const isAdded = addedTeamIds.includes(team.teamId);
            return (
              <div
                key={team.teamId}
                role="button"
                tabIndex={0}
                className={`rounded-2xl border p-3 space-y-1 cursor-pointer transition relative ${
                  isAdded ? 'bg-green-50 border-green-400' : 'bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => toggleTeamAdded(team.teamId)}
                onMouseEnter={(e) => handleTeamCardMouseEnter(team, e)}
                onMouseLeave={handleTeamCardMouseLeave}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-black">{team.teamName}</p>
                    <p className="text-[11px] text-gray-500">ID đội: {team.teamId}</p>
                  </div>
                  {isAdded && (
                    <span className="text-[10px] text-green-600 font-medium">Đã chọn</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {teamDetailPopup &&
        createPortal(
          <div
            className="fixed z-[100] w-72 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
            style={{ left: teamDetailPopup.left, top: teamDetailPopup.top }}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            <div className="bg-gradient-to-br from-[#208aae]/10 to-[#2197C0]/5 px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{teamDetailPopup.team.teamName}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">ID: {teamDetailPopup.team.teamId}</p>
            </div>
            <div className="p-4 space-y-3">
              {(teamDetailPopup.team as { leader?: { fullName?: string } }).leader && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-gray-400 shrink-0 w-20">Trưởng nhóm</span>
                  <span className="text-xs text-gray-800">
                    {(teamDetailPopup.team as { leader?: { fullName?: string } }).leader?.fullName ?? '—'}
                  </span>
                </div>
              )}
              {(teamDetailPopup.team as { members?: unknown[] }).members != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 shrink-0 w-20">Thành viên</span>
                  <span className="text-xs text-gray-800">
                    {(teamDetailPopup.team as { members?: unknown[] }).members?.length ?? 0} người
                  </span>
                </div>
              )}
              {teamDetailPopup.team.createdAt && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 shrink-0 w-20">Tạo lúc</span>
                  <span className="text-xs text-gray-600">
                    {dayjs(teamDetailPopup.team.createdAt).format('DD/MM/YYYY')}
                  </span>
                </div>
              )}
              {((teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount != null ||
                (teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount != null) && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Phù hợp phiên</p>
                  <div className="flex gap-3">
                    {(teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount != null && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        GV: {(teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount}
                      </span>
                    )}
                    {(teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount != null && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        TA: {(teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {addedTeamIds.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 space-y-2">
          <p className="text-xs font-medium text-black">Đã chọn ({addedTeamIds.length} đội)</p>
          <ul className="space-y-1.5">
            {addedTeamIds.map((tid) => {
              const t = suggestedTeams.find((x) => x.teamId === tid);
              return (
                <li key={tid} className="flex items-center justify-between text-xs">
                  <span className="text-black">{t?.teamName ?? `ID ${tid}`}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAddedTeam(tid);
                    }}
                    className="p-1 rounded text-gray-500 hover:bg-red-100 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gray-50 p-3">
        <p className="text-xs font-medium text-black whitespace-nowrap">Gán đội đã chọn cho tất cả phiên</p>
        <Switch
          className="!rounded-[15px] shrink-0"
          checked={assignAllChecked}
          disabled={addedTeamIds.length === 0 || sessionsCount === 0}
          onCheckedChange={handleAssignAllSwitch}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>
          Hủy
        </Button>
        <Button className="bg-blue-600 text-white">Lưu thay đổi</Button>
      </div>
    </div>
  );
}
