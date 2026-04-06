import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  FileText,
  GraduationCap,
  CalendarDays,
  ClipboardList,
  Package,
  Wallet,
  Users,
  UserCircle,
  Clock,
  CheckCircle,
  Bookmark,
  Tag,
  PieChart,
  Menu,
  LogOut,
  Key,
  ClipboardCheck,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';
import { logout } from '@/modules/auth/pages/Logout';

import { NavLink, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import NotificationBell from '@/shared/components/common/NotificationBell';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const [sidebarAvatarSrc, setSidebarAvatarSrc] = useState(() => {
    const avatarUrl = localStorage.getItem('memberAvatarUrl') || '';
    return avatarUrl.trim() ? avatarUrl : '/img/avatar.png';
  });
  const [memberName, setMemberName] = useState(() => localStorage.getItem('memberFullName') || '');

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
      // ignore parse errors
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
      { label: 'Thống kê', icon: BarChart3, path: '/manager/dashboard' },
      { label: 'Quản lý tài khoản', icon: UserCircle, path: '/manager/users' },
      { label: 'Quản lý thành viên', icon: Users, path: '/manager/members' },
      { label: 'Vai trò', icon: Key, path: '/manager/roles' },
      { label: 'Nhóm', icon: ListChecks, path: '/manager/teams' },
      { label: 'Sự kiện', icon: CalendarDays, path: '/manager/events' },
      { label: 'Giáo trình', icon: GraduationCap, path: '/manager/courses' },
      { label: 'Chủ đề', icon: Bookmark, path: '/manager/topics' },
      { label: 'Thiết bị', icon: Package, path: '/manager/equipments' },
      { label: 'Phiếu mượn', icon: ClipboardCheck, path: '/manager/borrowings' },
      { label: 'Hợp đồng', icon: FileText, path: '/manager/contracts' },
      { label: 'Nhật ký', icon: ClipboardList, path: '/manager/logs' },
      { label: 'Quỹ', icon: Wallet, path: '/manager/transactions' },
      { label: 'Thời khóa biểu', icon: Clock, path: '/manager/timetable' },
      { label: 'Tất cả yêu cầu', icon: CheckCircle, path: '/manager/requests-all' },
      { label: 'Trung tâm duyệt', icon: CheckCircle2, path: '/manager/requests' },
      { label: 'Quản lý công việc', icon: Tag, path: '/manager/tasks' },
      { label: 'Quản lý kỹ năng', icon: PieChart, path: '/manager/skills' },
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
        h-screen bg-[#F6F8FB]
        transition-all duration-300
        ${collapsed ? 'w-[72px] px-1.5' : 'w-72 px-5'}
        py-5 flex flex-col
      `}
    >
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
          onClick={() => navigate('/manager/profile')}
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
                img.src = '/img/avatar.png';
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <div className="font-medium text-slate-700">
              Xin chào {memberName || JSON.parse(localStorage.getItem('user') || '{}')?.email || ''}
            </div>
            <div className="text-sm text-slate-400">
              {JSON.parse(localStorage.getItem('user') || '{}')?.email || ''}
            </div>
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
        <div
          className={`
            grid gap-px bg-gray-200
            ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}
          `}
        >
          {menus.map((m) => {
            const Icon = m.icon;

            return (
              <NavLink key={m.path} to={m.path}>
                {({ isActive }) => (
                  <div className={`relative group ${collapsed ? 'h-[54px]' : 'aspect-square min-h-[64px]'}`}>
                    <div
                      className={` 
                        h-full
                        flex flex-col items-center justify-center
                        transition-all
                        bg-[#F6F8FB]
                        ${isActive ? 'opacity-0' : 'group-hover:opacity-0'}
                      `}
                    >
                      <Icon size={18} className="text-gray-400" />
                      {!collapsed && (
                        <div className="text-xs mt-1 text-center text-gray-400">
                          {m.label}
                        </div>
                      )}
                    </div>

                    <div
                      className={`
                        absolute inset-0
                        flex flex-col items-center justify-center
                        transition-all duration-300
                        ${
                          isActive
                            ? 'bg-white text-[#208aae] scale-100 shadow-md z-10'
                            : 'bg-white text-[#208aae] opacity-0 scale-100 group-hover:opacity-100'
                        }
                      `}
                    >
                      <Icon size={20} />
                      {!collapsed && (
                        <div className="text-xs mt-1 font-medium text-center px-1">
                          {m.label}
                        </div>
                      )}
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
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Logout */}
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
    </aside>
  );
}