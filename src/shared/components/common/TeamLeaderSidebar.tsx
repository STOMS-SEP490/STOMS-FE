import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Star,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Timer,
  FileText,
  LogOut,
  Menu,
  Package,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import { logout } from '@/modules/auth/pages/Logout';
import NotificationBell from '@/shared/components/common/NotificationBell';
export default function TeamLeaderSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [sidebarAvatarSrc, setSidebarAvatarSrc] = useState(() => {
    const avatarUrl = localStorage.getItem('memberAvatarUrl') || '';
    return avatarUrl.trim() ? avatarUrl : '/img/ava.png';
  });
  const [memberName, setMemberName] = useState(() => localStorage.getItem('memberFullName') || '');

  const userEmail = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('user') || '{}') as { email?: string })?.email || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { memberId?: number };
      if (!parsed.memberId) return;

      memberApi
        .getMemberById(parsed.memberId)
        .then((m) => {
          if (m?.fullName) {
            setMemberName(m.fullName);
            localStorage.setItem('memberFullName', m.fullName);
          }
          const avatarUrl = m?.avatarUrl ?? '';
          if (avatarUrl && String(avatarUrl).trim()) {
            setSidebarAvatarSrc(String(avatarUrl));
            localStorage.setItem('memberAvatarUrl', String(avatarUrl));
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (collapsed) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (sidebarRef.current?.contains(target)) return;
      setCollapsed(true);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [collapsed]);

  const menus = useMemo(
    () => [
      { label: 'Thống kê', icon: BarChart3, path: '/tl/dashboard' },
      { label: 'Hồ sơ', icon: UserCircle, path: '/tl/profile' },
      { label: 'Nhóm', icon: Users, path: '/tl/teams' },
      { label: 'Sự kiện', icon: Star, path: '/tl/events' },
      { label: 'Giáo trình', icon: BookOpen, path: '/tl/courses' },
      {
        label: 'Thời khóa biểu',
        icon: CalendarDays,
        path: '/tl/timetable',
        matchPrefixPath: '/tl/timetable',
      },
      { label: 'Danh sách phiên đã dạy', icon: Timer, path: '/tl/teaching-history' },
      { label: 'Điểm danh', icon: CheckCircle2, path: '/tl/attendance' },
      { label: 'Báo cáo công việc', icon: ClipboardList, path: '/tl/tasks' },
      { label: 'Hợp đồng', icon: FileText, path: '/tl/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/tl/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/tl/equipments' },
      { label: 'Phân công', icon: ClipboardCheck, path: '/tl/assignments' },
    ],
    []
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      ref={sidebarRef}
      className={`
        h-screen
        transition-all duration-300
        ${collapsed ? 'w-[76px] px-2 py-3' : 'w-[300px] px-3 py-4'}
      `}
    >
      <div className="h-full rounded-2xl bg-[#f4f5f7] px-3 py-4 flex flex-col">
      {!collapsed && (
        <div className="w-full flex items-center justify-between mb-4 gap-2 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <img src="/img/logo.png" alt="logo" className="w-13 h-10 shrink-0" />
            <span className="text-sm font-bold text-slate-700 truncate">STOMS</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-md hover:bg-gray-200 transition p-1"
              aria-label="Thu gọn menu"
            >
              <Menu size={20} color="black" />
            </button>
          </div>
        </div>
      )}

      {!collapsed && (
        <button
          type="button"
          onClick={() => navigate('/tl/profile')}
          className="flex flex-col items-center mb-8 w-full focus:outline-none"
          title="Xem hồ sơ"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg ring-4 ring-white">
            <img
              src={sidebarAvatarSrc}
              alt="avatar"
              className="w-14 h-14 rounded-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                img.onerror = null;
                img.src = '/img/ava.png';
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <div className="font-medium text-slate-700">
              Xin chào{memberName ? ` ${memberName}` : ''}
            </div>
            {userEmail ? (
              <div className="text-sm text-slate-400">{userEmail}</div>
            ) : null}
          </div>
        </button>
      )}

      {collapsed && (
        <div className="flex flex-col items-center gap-1.5 mb-4 w-full">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md hover:bg-gray-200 transition p-1"
            aria-label="Mở rộng menu"
          >
            <Menu size={20} color="black" />
          </button>
          <NotificationBell variant="sidebarCollapsed" />
        </div>
      )}

      <div className="overflow-y-auto no-scrollbar relative">
        <div className={`flex flex-col ${collapsed ? 'gap-1.5' : 'gap-2.5'}`}>
          {menus.map((m) => {
            const Icon = m.icon;
            const isTimetable = 'matchPrefixPath' in m && m.matchPrefixPath === '/tl/timetable';

            return (
              <NavLink key={m.path} to={m.path} end={!isTimetable}>
                {({ isActive }) => {
                  const active =
                    isActive ||
                    (isTimetable && typeof window !== 'undefined' && window.location.pathname.startsWith('/tl/timetable'));
                  return (
                    <div className={`relative group ${collapsed ? 'h-[46px]' : ''}`}>
                      <div
                        className={`
                        w-full rounded-xl transition-all duration-200
                        ${collapsed ? 'h-[46px] flex items-center justify-center' : 'px-3 py-2.5 flex items-center gap-3'}
                        ${
                          active
                            ? 'bg-white text-slate-900'
                            : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                        }
                      `}
                      >
                        <Icon size={18} className={active ? 'text-slate-900' : 'text-slate-400'} />
                        {!collapsed && <div className="text-sm font-medium leading-5">{m.label}</div>}
                      </div>
                      {collapsed && (
                        <div
                          className="
                          absolute left-full ml-3
                          top-1/2 -translate-y-1/2
                          bg-gray-900 text-white text-xs
                          px-3 py-1.5 rounded-md
                          opacity-0 group-hover:opacity-100
                          transition-all duration-200
                          whitespace-nowrap
                          shadow-lg z-50
                        "
                        >
                          {m.label}
                        </div>
                      )}
                    </div>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 
                     py-3 rounded-xl text-red-600 
                     hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
      </div>
    </aside>
  );
}
