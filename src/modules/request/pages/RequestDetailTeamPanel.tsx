import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, Trash2, Plus, CircleHelp } from 'lucide-react';
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

function readTeamNumeric(team: Team | undefined, keys: readonly string[]): number | undefined {
  if (!team) return undefined;
  const record = team as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (!Number.isNaN(n) && n >= 0) return Math.floor(n);
    }
  }
  return undefined;
}

/** Trần GV có thể gán cho một nhóm (theo API team-suggestions). Ưu tiên tổng pool; không có dữ liệu → không giới hạn phía FE. */
function getTeamTeacherAssignCap(team: Team | undefined): number | undefined {
  const total = readTeamNumeric(team, [
    'totalTeacherCount',
    'TotalTeacherCount',
    'teachersCount',
    'TeachersCount',
    'teacherCount',
    'TeacherCount',
  ]);
  const avail = readTeamNumeric(team, [
    'availableTeacherCount',
    'availableTeachersCount',
    'AvailableTeacherCount',
    'AvailableTeachersCount',
  ]);
  if (total != null) return total;
  if (avail != null) return avail;
  return undefined;
}

function getTeamTaAssignCap(team: Team | undefined): number | undefined {
  const total = readTeamNumeric(team, ['totalTaCount', 'TotalTaCount', 'tasCount', 'TasCount', 'taCount', 'TaCount']);
  const avail = readTeamNumeric(team, [
    'availableTaCount',
    'AvailableTACount',
    'AvailableTaCount',
    'availableTACount',
  ]);
  if (total != null) return total;
  if (avail != null) return avail;
  return undefined;
}

function cappedAllocForTeam(
  team: Team | undefined,
  needTeachers: number,
  needTas: number,
): { teachersRequired: number; tasRequired: number } {
  const capT = getTeamTeacherAssignCap(team);
  const capTa = getTeamTaAssignCap(team);
  const nt = Math.max(0, needTeachers);
  const na = Math.max(0, needTas);
  return {
    teachersRequired: capT != null ? Math.min(nt, capT) : nt,
    tasRequired: capTa != null ? Math.min(na, capTa) : na,
  };
}

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
};

export default function RequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  onClose,
  onAssignSession,
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
  const popupRef = useRef<HTMLDivElement | null>(null);
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
            : 'Không tải được danh sách nhóm gợi ý.';
        setError(msg);
        setSuggestedTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [session.sessionId]);

  const assignedIdsKey = useMemo(
    () => (currentAssignedTeamIds ?? []).slice().sort((a, b) => a - b).join(','),
    [currentAssignedTeamIds],
  );

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
      const firstTeam = suggestedTeams.find((t) => t.teamId === ids[0]);
      next[ids[0]] = cappedAllocForTeam(firstTeam, requestedTeachers, requestedTas);
    }
    setTeamQuantities(next);
    setShowAddTeam(false);
    // Chỉ đồng bộ khi đổi buổi hoặc tập id nhóm từ parent (vd. bỏ nhóm 0 GV/0 TG); không gắn currentTeamQuantities để tránh đóng panel "Thêm nhóm" khi gõ số.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId, assignedIdsKey, requestedTeachers, requestedTas, suggestedTeams]);

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
      const teamRow = suggestedTeams.find((t) => t.teamId === teamId);
      const capTeachers = getTeamTeacherAssignCap(teamRow);
      const capTas = getTeamTaAssignCap(teamRow);
      const roomTeachers = Math.max(0, requestedTeachers - otherTeachers);
      const roomTas = Math.max(0, requestedTas - otherTas);
      const maxTeachersThisTeam =
        capTeachers != null ? Math.min(roomTeachers, capTeachers) : roomTeachers;
      const maxTasThisTeam = capTas != null ? Math.min(roomTas, capTas) : roomTas;

      if (field === 'teachersRequired' && safeValue > maxTeachersThisTeam) return;
      if (field === 'tasRequired' && safeValue > maxTasThisTeam) return;

      setTeamQuantities((prev) => {
        const next = {
          ...prev,
          [teamId]: {
            ...current,
            [field]: safeValue,
          },
        };
        return next;
      });
    },
    [requestedTas, requestedTeachers, session.sessionId, suggestedTeams, teamQuantities, totals]
  );

  const toggleTeamAdded = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => {
      const exists = prev.includes(teamId);
      if (exists) {
        setTeamQuantities((prevQ) => {
          const next = { ...prevQ };
          delete next[teamId];
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
        const needT = Math.max(0, requestedTeachers - usedTeachers);
        const needTa = Math.max(0, requestedTas - usedTas);
        const picked = suggestedTeams.find((t) => t.teamId === teamId);
        const capped = cappedAllocForTeam(picked, needT, needTa);
        const next = {
          ...prevQ,
          [teamId]: capped,
        };
        return next;
      });

      return [...prev, teamId];
    });
    // Sau khi chọn/bỏ chọn nhóm, đóng popup nếu đang mở để tránh bị kẹt
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (closePopupTimerRef.current) {
      clearTimeout(closePopupTimerRef.current);
      closePopupTimerRef.current = null;
    }
    setTeamDetailPopup(null);
  }, [requestedTas, requestedTeachers, session.sessionId, suggestedTeams]);

  const removeAddedTeam = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
    setTeamQuantities((prevQ) => {
      const next = { ...prevQ };
      delete next[teamId];
      return next;
    });
    // Khi xóa nhóm, đảm bảo popup chi tiết đóng lại
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (closePopupTimerRef.current) {
      clearTimeout(closePopupTimerRef.current);
      closePopupTimerRef.current = null;
    }
    setTeamDetailPopup(null);
  }, [session.sessionId]);

  // Popup sizing/positioning:
  // - Make it wider & shorter for readability.
  // - Keep fully inside viewport by clamping + choosing left/right side.
  const POPUP_WIDTH = 440;
  const POPUP_HEIGHT = 260;
  const POPUP_MARGIN = 8;
  const getTeamMetric = useCallback((team: Team, keys: string[]) => {
    const record = team as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
    }
    return undefined;
  }, []);
  const handleTeamCardMouseEnter = useCallback((team: Team, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const target = e.currentTarget;
    hoverTimerRef.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      const rawTop = rect.top + rect.height / 2 - POPUP_HEIGHT / 2;
      const top = Math.min(
        Math.max(POPUP_MARGIN, rawTop),
        Math.max(POPUP_MARGIN, viewportHeight - POPUP_HEIGHT - POPUP_MARGIN)
      );

      // Prefer showing on the left of the hovered card; if not enough room, show on the right.
      const leftPreferred = rect.left - POPUP_WIDTH - POPUP_MARGIN;
      const rightCandidate = rect.right + POPUP_MARGIN;
      let left = leftPreferred;
      if (leftPreferred < POPUP_MARGIN) left = rightCandidate;
      // Clamp in viewport to avoid going out of screen on either side.
      left = Math.min(
        Math.max(POPUP_MARGIN, left),
        Math.max(POPUP_MARGIN, viewportWidth - POPUP_WIDTH - POPUP_MARGIN)
      );
      setTeamDetailPopup({
        team,
        left,
        top,
      });
    }, 1200);
  }, []);

  const clampPopupIntoViewport = useCallback(() => {
    const el = popupRef.current;
    if (!el) return;
    setTeamDetailPopup((prev) => {
      if (!prev) return prev;
      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      const maxLeft = Math.max(POPUP_MARGIN, viewportWidth - rect.width - POPUP_MARGIN);
      const maxTop = Math.max(POPUP_MARGIN, viewportHeight - rect.height - POPUP_MARGIN);
      const nextLeft = Math.min(Math.max(POPUP_MARGIN, prev.left), maxLeft);
      const nextTop = Math.min(Math.max(POPUP_MARGIN, prev.top), maxTop);

      if (nextLeft === prev.left && nextTop === prev.top) return prev;
      return { ...prev, left: nextLeft, top: nextTop };
    });
  }, []);

  useLayoutEffect(() => {
    if (!teamDetailPopup) return;
    clampPopupIntoViewport();
  }, [teamDetailPopup?.team.teamId, teamDetailPopup?.left, teamDetailPopup?.top, clampPopupIntoViewport]);

  useEffect(() => {
    if (!teamDetailPopup) return;
    const onResize = () => clampPopupIntoViewport();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [teamDetailPopup, clampPopupIntoViewport]);

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
      <h3 className="text-sm font-semibold text-black">nhóm phụ trách</h3>

      {/* Đã chọn nhóm: card từng nhóm (icon, tên, X thành viên, nút xóa) */}
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
                      <p className="font-semibold text-black truncate">{team?.teamName ?? `nhóm #${tid}`}</p>
                      <p className="text-xs text-gray-500">
                        {memberCount != null ? `${memberCount} thành viên` : 'nhóm đã gắn'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddedTeam(tid)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                    aria-label="Xóa nhóm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <p className="text-[11px] text-gray-500">
                    Số lượng áp dụng cho nhóm này
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
                    <span className="text-sm text-gray-600">Số lượng sinh viên:</span>
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

      {/* Chỉ hiện sau khi đã có ít nhất 1 nhóm — lần đầu dùng danh sách gợi ý bên dưới để chọn */}
      {addedTeamIds.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddTeam((v) => !v)}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Thêm nhóm
        </button>
      )}

      {/* Danh sách gợi ý: luôn khi chưa có nhóm; khi đã có nhóm thì chỉ khi bấm Thêm nhóm */}
      {(showAddTeam || addedTeamIds.length === 0) && (
        <>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <CircleHelp className="w-3.5 h-3.5" />
            Di chuột vào từng nhóm để xem chi tiết năng lực và khả dụng nhân sự.
          </div>
          <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tìm theo tên nhóm"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          className="pl-9 text-xs text-black border-gray-200 bg-white"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
      )}
      {loading ? (
        <p className="text-xs text-gray-500">Đang tải danh sách nhóm gợi ý...</p>
      ) : filteredTeams.length === 0 ? (
        <p className="text-xs text-gray-500">Không có nhóm gợi ý phù hợp cho buổi này.</p>
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
                        <p className="text-xs text-gray-500">ID nhóm: {team.teamId}</p>
                      </div>
                      {isAdded ? (
                        <span className="text-xs text-green-600 font-medium">Đã chọn</span>
                      ) : (
                        <span
                          className="text-[11px] text-sky-600 font-medium"
                          title="Di chuột vào thẻ nhóm để xem thông tin chi tiết"
                        >
                          Hover xem chi tiết
                        </span>
                      )}
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
            ref={popupRef}
            className="fixed z-[2147483647] w-[440px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[calc(100vh-16px)] overflow-y-auto"
            style={{ left: teamDetailPopup.left, top: teamDetailPopup.top }}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {teamDetailPopup.team.teamName}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">ID nhóm: {teamDetailPopup.team.teamId}</p>
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
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                  Đánh giá theo buổi
                </p>
                {(() => {
                  const matchedTeacher = getTeamMetric(teamDetailPopup.team, ['matchingSkillTeacherCount']);
                  const matchedTa = getTeamMetric(teamDetailPopup.team, ['matchingSkillTaCount']);
                  const availableTeacher = getTeamMetric(teamDetailPopup.team, ['availableTeacherCount', 'availableTeachersCount']);
                  const availableTa = getTeamMetric(teamDetailPopup.team, ['availableTaCount', 'availableTACount']);
                  const totalTeacher = getTeamMetric(teamDetailPopup.team, ['totalTeacherCount', 'teachersCount']);
                  const totalTa = getTeamMetric(teamDetailPopup.team, ['totalTaCount', 'totalTACount', 'tasCount']);

                  const topics =
                    (teamDetailPopup.team as Team & { topics?: { topicId: number; topicName?: string | null }[] })
                      .topics ?? [];

                  return (
                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-900">Giảng viên</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-700">
                            <span className="truncate">
                              Khả dụng:{' '}
                              <span className="font-semibold text-slate-900">
                                {availableTeacher ?? '—'}/{totalTeacher ?? '—'}
                              </span>
                            </span>
                            <span className="truncate">
                              Phù hợp kĩ năng: <span className="font-semibold text-sky-700">{matchedTeacher ?? '—'}</span>
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-900">Sinh viên</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-700">
                            <span className="truncate">
                              Khả dụng:{' '}
                              <span className="font-semibold text-slate-900">
                                {availableTa ?? '—'}/{totalTa ?? '—'}
                              </span>
                            </span>
                            <span className="truncate">
                              Phù hợp kĩ năng: <span className="font-semibold text-sky-700">{matchedTa ?? '—'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      {topics.length > 0 && (
                        <div className="pt-1 border-t border-slate-100 mt-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 font-semibold">
                            Chủ đề nhóm
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {topics.map((t) => (
                              <span
                                key={t.topicId}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {t.topicName || `Chủ đề #${t.topicId}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
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
