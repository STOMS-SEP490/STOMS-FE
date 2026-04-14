import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import { logout } from '@/modules/auth/pages/Logout';

export type RoleSidebarMenuItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  matchPrefixPath?: string;
};

type RoleSidebarProps = {
  profilePath: string;
  menus: RoleSidebarMenuItem[];
};

export default function RoleSidebar({ profilePath, menus }: RoleSidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const [sidebarAvatarSrc, setSidebarAvatarSrc] = useState(() => {
    const avatarUrl = localStorage.getItem('memberAvatarUrl') || '';
    return avatarUrl.trim() ? avatarUrl : '/img/ava.png';
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

  const userEmail = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('user') || '{}') as { email?: string })?.email || '';
    } catch {
      return '';
    }
  }, []);

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
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <img src="/img/logo.png" alt="logo" className="w-13 h-10" />
            <span className="text-sm font-bold text-slate-700">STOMS</span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md hover:bg-gray-200 transition"
          >
            <Menu size={20} color="black" />
          </button>
        </div>
      )}

      {!collapsed && (
        <button
          type="button"
          onClick={() => navigate(profilePath)}
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
              Xin chào {memberName || userEmail}
            </div>
            <div className="text-sm text-slate-400">{userEmail}</div>
          </div>
        </button>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md hover:bg-gray-200 transition mb-4"
        >
          <Menu size={20} color="black" />
        </button>
      )}

      <div className="overflow-y-auto no-scrollbar relative">
        <div className={`flex flex-col ${collapsed ? 'gap-1.5' : 'gap-2.5'}`}>
          {menus.map((m) => {
            const Icon = m.icon;
            const matchPrefixPath = m.matchPrefixPath ?? m.path;
            const end = m.matchPrefixPath ? false : true;

            return (
              <NavLink key={m.path} to={m.path} end={end}>
                {({ isActive }) => {
                  const active = isActive || window.location.pathname.startsWith(`${matchPrefixPath}/`);
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
      </div>
    </aside>
  );
}

