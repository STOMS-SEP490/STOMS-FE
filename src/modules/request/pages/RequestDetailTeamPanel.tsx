import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, Trash2, Plus } from 'lucide-react';
import { message } from 'antd';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
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
  sessionsCount: number;
  allSessions: Array<{
    sessionId: number;
    teachersRequired?: number | null;
    tasRequired?: number | null;
  }>;
  suggestedTeamIdsBySessionId?: Record<number, number[]>;
  currentAssignedTeamIds?: number[];
  onClose: () => void;
  onAssignSession: (sessionId: number, teamIds: number[]) => void;
  onAssignAllUi: (args: { sessionIds: number[]; teamId: number }) => void;
  onClearAllUi: (sessionIds: number[]) => void;
  onQuantitiesChange?: (sessionId: number, data: { teachersRequired: number; tasRequired: number }) => void;
};

export default function RequestDetailTeamPanel({
  session,
  sessionsCount,
  allSessions,
  suggestedTeamIdsBySessionId,
  currentAssignedTeamIds,
  onClose,
  onAssignSession,
  onAssignAllUi,
  onClearAllUi,
  onQuantitiesChange,
}: Props) {
  const [suggestedTeams, setSuggestedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [addedTeamIds, setAddedTeamIds] = useState<number[]>([]);
  const [teachersRequired, setTeachersRequired] = useState(() =>
    Math.max(0, session.teachersRequired ?? 1)
  );
  const [tasRequired, setTasRequired] = useState(() =>
    Math.max(0, session.tasRequired ?? 1)
  );
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [assignAllEnabled, setAssignAllEnabled] = useState(false);
  const [assignAllAppliedSessionIds, setAssignAllAppliedSessionIds] = useState<number[]>([]);
  const [teamDetailPopup, setTeamDetailPopup] = useState<{ team: Team; left: number; top: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closePopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setAddedTeamIds(currentAssignedTeamIds ?? []);
    setAssignAllEnabled(false);
    setAssignAllAppliedSessionIds([]);
    setTeachersRequired(Math.max(0, session.teachersRequired ?? 1));
    setTasRequired(Math.max(0, session.tasRequired ?? 1));
    setShowAddTeam(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  useEffect(() => {
    // Nếu người dùng bỏ hết team đã chọn thì không thể "gán cho tất cả"
    if (addedTeamIds.length === 0 && assignAllEnabled) {
      setAssignAllEnabled(false);
      if (assignAllAppliedSessionIds.length > 0) onClearAllUi(assignAllAppliedSessionIds);
      setAssignAllAppliedSessionIds([]);
      onAssignAllUi({ sessionIds: [], teamId: 0 });
    }
  }, [addedTeamIds.length, assignAllAppliedSessionIds, assignAllEnabled, onAssignAllUi, onClearAllUi]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return suggestedTeams;
    return suggestedTeams.filter((t) => t.teamName.toLowerCase().includes(q));
  }, [suggestedTeams, teamSearch]);

  const toggleTeamAdded = useCallback((teamId: number) => {
    setAddedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
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
  }, []);

  const removeAddedTeam = useCallback((teamId: number) => {
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
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
  }, []);

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

  const suggestionsReady =
    allSessions.length > 0 &&
    allSessions.every((s) => Array.isArray(suggestedTeamIdsBySessionId?.[s.sessionId]));

  const canAssignAll = sessionsCount > 0 && addedTeamIds.length > 0 && !loading && suggestionsReady;
  const handleAssignAllSwitch = useCallback(
    async (checked: boolean) => {
      if (!checked) {
        setAssignAllEnabled(false);
        if (assignAllAppliedSessionIds.length > 0) {
          // Khi tắt switch: chỉ giữ lại gán team cho phiên hiện tại,
          // các phiên khác được gán bằng "gán tất cả" sẽ bị xóa.
          const toClear = assignAllAppliedSessionIds.filter((sid) => sid !== session.sessionId);
          if (toClear.length > 0) {
            onClearAllUi(toClear);
          }
        }
        // Reset danh sách phiên đã áp dụng bulk (lần sau bật lại tính lại từ đầu)
        setAssignAllAppliedSessionIds([]);
        onAssignAllUi({ sessionIds: [], teamId: 0 });
        return;
      }
      if (addedTeamIds.length === 0) return;
      if (!suggestionsReady) {
        message.info('Đang tải gợi ý đội cho các phiên, vui lòng thử lại sau vài giây.');
        return;
      }

      // Yêu cầu: gán cùng 1 team cho các phiên, nhưng chỉ những phiên có suggestion trùng.
      // Chọn team ưu tiên là team đầu tiên người dùng chọn.
      const chosenTeamId = addedTeamIds[0];

      try {
        const eligibleSessions = allSessions
          .filter((s) => {
            const ids = suggestedTeamIdsBySessionId?.[s.sessionId] ?? [];
            return ids.some((id) => Number(id) === Number(chosenTeamId));
          })
          .map((s) => s.sessionId);

        if (eligibleSessions.length === 0) {
          message.info('Không có phiên nào có team gợi ý trùng để gán.');
          setAssignAllEnabled(false);
          setAssignAllAppliedSessionIds([]);
          onAssignAllUi({ sessionIds: [], teamId: 0 });
          return;
        }

        // Chỉ gán trên UI (không gọi API)
        message.success(`Đã gán (UI) cùng 1 đội cho ${eligibleSessions.length} phiên`);
        setAssignAllEnabled(true);
        setAssignAllAppliedSessionIds(eligibleSessions);
        onAssignAllUi({ sessionIds: eligibleSessions, teamId: chosenTeamId });
      } catch (err) {
        console.error(err);
        message.error('Gán đội cho tất cả phiên thất bại');
      }
    },
    [
      addedTeamIds,
      allSessions,
      assignAllAppliedSessionIds,
      onAssignAllUi,
      onClearAllUi,
      suggestedTeamIdsBySessionId,
    ]
  );

  const maxTeachersRequired = session.teachersRequired ?? Number.POSITIVE_INFINITY;
  const maxTasRequired = session.tasRequired ?? Number.POSITIVE_INFINITY;
  const totalStaff = teachersRequired + tasRequired;

  const handleTeachersChange = useCallback(
    (delta: number) => {
      const raw = teachersRequired + delta;
      const next = Math.max(0, Math.min(raw, maxTeachersRequired));
      setTeachersRequired(next);
      onQuantitiesChange?.(session.sessionId, { teachersRequired: next, tasRequired });
    },
    [teachersRequired, tasRequired, maxTeachersRequired, session.sessionId, onQuantitiesChange]
  );
  const handleTasChange = useCallback(
    (delta: number) => {
      const raw = tasRequired + delta;
      const next = Math.max(0, Math.min(raw, maxTasRequired));
      setTasRequired(next);
      onQuantitiesChange?.(session.sessionId, { teachersRequired, tasRequired: next });
    },
    [teachersRequired, tasRequired, maxTasRequired, session.sessionId, onQuantitiesChange]
  );

  const handleSaveCurrent = useCallback(() => {
    message.success('Đã lưu gán đội (UI)');
    onAssignSession(session.sessionId, addedTeamIds);
    onQuantitiesChange?.(session.sessionId, { teachersRequired, tasRequired });
    onClose();
  }, [addedTeamIds, teachersRequired, tasRequired, onAssignSession, onClose, onQuantitiesChange, session.sessionId]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-black">Gán đội phụ trách</h3>

      {/* Đã chọn đội: card từng đội (icon, tên, X thành viên, nút xóa) */}
      {addedTeamIds.length > 0 && (
        <div className="space-y-3">
          {addedTeamIds.map((tid) => {
            const team = suggestedTeams.find((t) => t.teamId === tid);
            const memberCount = (team as Team & { memberCount?: number })?.memberCount;
            return (
              <div
                key={tid}
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm flex items-start justify-between gap-2"
              >
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
            );
          })}

          {/* Số lượng giảng viên / trợ giảng — chỉ khi chưa gắn đội (đang chỉnh) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">Số lượng giảng viên:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleTeachersChange(-1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                >
                  −
                </button>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={teachersRequired}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10) || 0;
                    const v = Math.max(0, Math.min(raw, maxTeachersRequired));
                    setTeachersRequired(v);
                    onQuantitiesChange?.(session.sessionId, { teachersRequired: v, tasRequired });
                  }}
                  className="w-12 h-8 text-center text-sm border-gray-200 px-1 [appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => handleTeachersChange(1)}
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
                  onClick={() => handleTasChange(-1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                >
                  −
                </button>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tasRequired}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10) || 0;
                    const v = Math.max(0, Math.min(raw, maxTasRequired));
                    setTasRequired(v);
                    onQuantitiesChange?.(session.sessionId, { teachersRequired, tasRequired: v });
                  }}
                  className="w-12 h-8 text-center text-sm border-gray-200 px-1 [appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => handleTasChange(1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <span className="text-xs text-gray-500">
                Tổng nhân sự: <span className="font-semibold text-sky-600">{totalStaff}</span>
              </span>
            </div>
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

      {addedTeamIds.length > 0 && (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-gray-50 p-3">
        <p className="text-xs font-medium text-black whitespace-nowrap">Gán đội đã chọn cho tất cả phiên</p>
        <Switch
          className="!rounded-[15px] shrink-0"
          checked={assignAllEnabled}
          disabled={!canAssignAll || loading}
          onCheckedChange={handleAssignAllSwitch}
        />
      </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" className="border-gray-300 text-black bg-white" onClick={onClose}>
          Hủy
        </Button>
        <Button className="bg-blue-600 text-white" onClick={handleSaveCurrent} disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  );
}
