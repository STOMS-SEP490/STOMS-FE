import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, Trash2, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { Team } from '@/modules/team/team';
import sessionService from '../api/sessionApi';

export type SessionForTeam = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

type Props = {
  session: SessionForTeam & { sessionId: number };
  currentTeamQuantities?: Record<number, { teachersRequired: number; tasRequired: number }>;
  currentAssignedTeamIds?: number[];
  onClose: () => void;
  onAssignSession: (
    sessionId: number,
    teamIds: number[],
    teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
  onQuantitiesChange?: (
    sessionId: number,
    data: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
};

export default function RequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  onClose,
  onAssignSession,
  onQuantitiesChange,
}: Props) {
  const [suggestedTeams, setSuggestedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [addedTeamIds, setAddedTeamIds] = useState<number[]>([]);
  const [teamQuantities, setTeamQuantities] = useState<
    Record<number, { teachersRequired: number; tasRequired: number }>
  >({});
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamDetailPopup, setTeamDetailPopup] = useState<{ team: Team; left: number; top: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closePopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedTeachers = Math.max(0, Number(session.teachersRequired ?? 0) || 0);
  const requestedTas = Math.max(0, Number(session.tasRequired ?? 0) || 0);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const teams = await sessionService.suggestTeams(session.sessionId);
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

  useEffect(() => {
    const ids = currentAssignedTeamIds ?? [];
    setAddedTeamIds(ids);
    const next = ids.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.teachersRequired ?? 0) || 0),
        tasRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});
    if (ids.length > 0 && Object.values(next).every((v) => v.teachersRequired === 0 && v.tasRequired === 0)) {
      next[ids[0]] = { teachersRequired: requestedTeachers, tasRequired: requestedTas };
    }
    setTeamQuantities(next);
    setShowAddTeam(false);
  }, [session.sessionId]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return suggestedTeams;
    return suggestedTeams.filter((t) => t.teamName.toLowerCase().includes(q));
  }, [suggestedTeams, teamSearch]);

  const totals = useMemo(
    () =>
      addedTeamIds.reduce(
        (acc, teamId) => {
          acc.teachers += Math.max(0, Number(teamQuantities[teamId]?.teachersRequired ?? 0) || 0);
          acc.tas += Math.max(0, Number(teamQuantities[teamId]?.tasRequired ?? 0) || 0);
          return acc;
        },
        { teachers: 0, tas: 0 }
      ),
    [addedTeamIds, teamQuantities]
  );

  const updateTeamQuantity = useCallback(
    (teamId: number, field: 'teachersRequired' | 'tasRequired', nextValue: number) => {
      const safeValue = Math.max(0, nextValue);
      const current = teamQuantities[teamId] ?? { teachersRequired: 0, tasRequired: 0 };
      const otherTeachers = totals.teachers - current.teachersRequired;
      const otherTas = totals.tas - current.tasRequired;

      if (field === 'teachersRequired' && otherTeachers + safeValue > requestedTeachers) return;
      if (field === 'tasRequired' && otherTas + safeValue > requestedTas) return;

      setTeamQuantities((prev) => {
        const next = {
          ...prev,
          [teamId]: {
            ...current,
            [field]: safeValue,
          },
        };
        onQuantitiesChange?.(session.sessionId, next);
        return next;
      });
    },
    [onQuantitiesChange, requestedTas, requestedTeachers, session.sessionId, teamQuantities, totals]
  );

  const toggleTeamAdded = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => {
      const exists = prev.includes(teamId);
      if (exists) {
        setTeamQuantities((prevQ) => {
          const next = { ...prevQ };
          delete next[teamId];
          onQuantitiesChange?.(session.sessionId, next);
          return next;
        });
        return prev.filter((id) => id !== teamId);
      }

      setTeamQuantities((prevQ) => {
        const usedTeachers = prev.reduce(
          (sum, id) => sum + Math.max(0, Number(prevQ[id]?.teachersRequired ?? 0) || 0),
          0
        );
        const usedTas = prev.reduce((sum, id) => sum + Math.max(0, Number(prevQ[id]?.tasRequired ?? 0) || 0), 0);
        const next = {
          ...prevQ,
          [teamId]: {
            teachersRequired: Math.max(0, requestedTeachers - usedTeachers),
            tasRequired: Math.max(0, requestedTas - usedTas),
          },
        };
        onQuantitiesChange?.(session.sessionId, next);
        return next;
      });

      return [...prev, teamId];
    });
    // Sau khi chọn/bỏ chọn đội, đóng popup nếu đang mở để tránh bị kẹt
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (closePopupTimerRef.current) {
      clearTimeout(closePopupTimerRef.current);
      closePopupTimerRef.current = null;
    }
    setTeamDetailPopup(null);
  }, [onQuantitiesChange, requestedTas, requestedTeachers, session.sessionId]);

  const removeAddedTeam = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
    setTeamQuantities((prevQ) => {
      const next = { ...prevQ };
      delete next[teamId];
      onQuantitiesChange?.(session.sessionId, next);
      return next;
    });
    // Khi xóa đội, đảm bảo popup chi tiết đóng lại
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (closePopupTimerRef.current) {
      clearTimeout(closePopupTimerRef.current);
      closePopupTimerRef.current = null;
    }
    setTeamDetailPopup(null);
  }, [onQuantitiesChange, session.sessionId]);

  const POPUP_WIDTH = 288;
  const POPUP_HEIGHT = 260;
  const handleTeamCardMouseEnter = useCallback((team: Team, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const target = e.currentTarget;
    hoverTimerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const rawTop = rect.top;
      const top = Math.min(
        Math.max(8, rawTop - 16),
        Math.max(8, viewportHeight - POPUP_HEIGHT - 8)
      );
      setTeamDetailPopup({
        team,
        left: Math.max(8, rect.left - POPUP_WIDTH - 8),
        top,
      });
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

  const handleSaveCurrent = useCallback(() => {
    onAssignSession(session.sessionId, addedTeamIds, teamQuantities);
    onClose();
  }, [
    addedTeamIds,
    teamQuantities,
    onAssignSession,
    onClose,
    session.sessionId,
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-black">Đội phụ trách</h3>

      {/* Đã chọn đội: card từng đội (icon, tên, X thành viên, nút xóa) */}
      {addedTeamIds.length > 0 && (
        <div className="space-y-3">
          {addedTeamIds.map((tid) => {
            const team = suggestedTeams.find((t) => t.teamId === tid);
            const memberCount = (team as Team & { memberCount?: number })?.memberCount;
            return (
              <div
                key={tid}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-black truncate">{team?.teamName ?? `Đội #${tid}`}</p>
                      <p className="text-xs text-gray-500">
                        {memberCount != null ? `${memberCount} thành viên` : 'Đội đã gắn'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddedTeam(tid)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                    aria-label="Xóa đội"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-[11px] text-gray-500">
                    Số lượng áp dụng cho đội này
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600">Số lượng giảng viên:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamQuantity(
                            tid,
                            'teachersRequired',
                            (teamQuantities[tid]?.teachersRequired ?? 0) - 1
                          )
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                      >
                        −
                      </button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={teamQuantities[tid]?.teachersRequired ?? 0}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10) || 0;
                          updateTeamQuantity(tid, 'teachersRequired', raw);
                        }}
                        className="w-12 h-8 text-center text-sm border-gray-200 px-1 [appearance:textfield]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamQuantity(
                            tid,
                            'teachersRequired',
                            (teamQuantities[tid]?.teachersRequired ?? 0) + 1
                          )
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-600">Số lượng trợ giảng:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamQuantity(tid, 'tasRequired', (teamQuantities[tid]?.tasRequired ?? 0) - 1)
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                      >
                        −
                      </button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={teamQuantities[tid]?.tasRequired ?? 0}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10) || 0;
                          updateTeamQuantity(tid, 'tasRequired', raw);
                        }}
                        className="w-12 h-8 text-center text-sm border-gray-200 px-1 [appearance:textfield]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamQuantity(tid, 'tasRequired', (teamQuantities[tid]?.tasRequired ?? 0) + 1)
                        }
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-xs text-gray-500">
                      Tổng nhân sự:{' '}
                      <span className="font-semibold text-sky-600">
                        {(teamQuantities[tid]?.teachersRequired ?? 0) + (teamQuantities[tid]?.tasRequired ?? 0)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <span className="text-xs text-gray-500">
              Đã phân bổ: <span className="font-semibold text-sky-600">{totals.teachers} GV / {totals.tas} TG</span>
              {' · '}
              Còn lại:{' '}
              <span className="font-semibold text-amber-600">
                {Math.max(0, requestedTeachers - totals.teachers)} GV / {Math.max(0, requestedTas - totals.tas)} TG
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Thêm đội */}
      <button
        type="button"
        onClick={() => setShowAddTeam((v) => !v)}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition"
      >
        <Plus className="w-4 h-4" />
        Thêm đội
      </button>

      {/* Danh sách gợi ý (khi bấm Thêm đội hoặc chưa có đội) */}
      {(showAddTeam || addedTeamIds.length === 0) && (
        <>
          <div className="relative">
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
                    className={`rounded-xl border p-3 cursor-pointer transition ${
                  isAdded ? 'bg-green-50 border-green-400' : 'bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => toggleTeamAdded(team.teamId)}
                onMouseEnter={(e) => handleTeamCardMouseEnter(team, e)}
                onMouseLeave={handleTeamCardMouseLeave}
              >
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-sm font-medium text-black">{team.teamName}</p>
                        <p className="text-xs text-gray-500">ID đội: {team.teamId}</p>
                      </div>
                      {isAdded && <span className="text-xs text-green-600 font-medium">Đã chọn</span>}
                    </div>
              </div>
            );
          })}
        </div>
          )}
        </>
      )}

      {teamDetailPopup &&
        createPortal(
          <div
            className="fixed z-[100] w-72 rounded-2xl bg-white shadow-xl overflow-hidden"
            style={{ left: teamDetailPopup.left, top: teamDetailPopup.top }}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {teamDetailPopup.team.teamName}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">ID đội: {teamDetailPopup.team.teamId}</p>
              </div>
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
              {((teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount != null ||
                (teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount != null) && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Phù hợp phiên</p>
                  <div className="flex gap-3">
                    {(teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount != null && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        Giảng viên: {(teamDetailPopup.team as { matchingSkillTeacherCount?: number }).matchingSkillTeacherCount}
                      </span>
                    )}
                    {(teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount != null && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        Trợ giảng: {(teamDetailPopup.team as { matchingSkillTaCount?: number }).matchingSkillTaCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>
          Hủy
        </Button>
        <Button
          className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
          onClick={handleSaveCurrent}
          disabled={loading || totals.teachers > requestedTeachers || totals.tas > requestedTas}
        >
          {loading ? 'Đang tải...' : 'Áp dụng'}
        </Button>
      </div>
    </div>
  );
}
