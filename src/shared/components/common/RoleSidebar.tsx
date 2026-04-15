import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, LayoutGrid, LogOut, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import { logout } from '@/modules/auth/pages/Logout';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

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
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
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
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!sidebarRef.current?.contains(target)) {
        setCollapsed(true);
      }
      if (accountOpen && !accountMenuRef.current?.contains(target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [accountOpen]);

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

  const userInitial = useMemo(() => {
    const source = (memberName || userEmail || '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }, [memberName, userEmail]);

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'relative z-20 h-screen shrink-0 transition-[width,background-color] duration-300',
        collapsed ? 'w-[32px] overflow-visible app-page-bg px-0 py-0' : 'w-[280px] bg-white px-2 py-3'
      )}
    >
      {collapsed ? (
        <div className="absolute inset-y-3 left-2 flex flex-col items-center justify-between pl-0.5">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCollapsed(false)}
              className="h-8 w-8 rounded-none border-0 bg-transparent p-0 text-slate-700 shadow-none hover:bg-transparent"
              aria-label="Mở rộng menu"
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 rounded-none border-0 bg-transparent p-0 text-slate-700 shadow-none hover:bg-transparent"
              aria-label="Thông báo"
              title="Thông báo"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="h-8 w-8 rounded-none border-0 bg-transparent p-0 text-red-600 shadow-none hover:bg-transparent hover:text-red-700"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </div>
      ) : (
        <div className="flex h-full flex-col text-slate-700 shadow-none ring-0">
          <div className="mb-2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCollapsed(true);
                setAccountOpen(false);
              }}
              className="h-10 w-10 rounded-xl p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Thu gọn menu"
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">STOMS</p>
            </div>
          </div>

          <div className="relative overflow-visible">
            <div className="max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-visible no-scrollbar">
              <div className="flex flex-col gap-1">
                {menus.map((m) => {
                  const Icon = m.icon;
                  const matchPrefixPath = m.matchPrefixPath ?? m.path;

                  return (
                    <NavLink key={m.path} to={m.path} end={!m.matchPrefixPath}>
                      {({ isActive }) => {
                        const active =
                          isActive ||
                          location.pathname === matchPrefixPath ||
                          location.pathname.startsWith(`${matchPrefixPath}/`);

                        return (
                          <div className="group relative">
                            <div
                              className={cn(
                                'w-full rounded-xl transition-colors duration-200',
                                'flex items-center gap-3 px-3 py-2.5',
                                active
                                  ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'h-[18px] w-[18px] shrink-0',
                                  active ? 'text-white' : 'text-slate-600'
                                )}
                              />
                              <span className="text-sm font-medium leading-5">{m.label}</span>
                            </div>
                          </div>
                        );
                      }}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-200 pt-3">
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full justify-start gap-2.5 rounded-xl px-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setAccountOpen((prev) => !prev)}
            >
              <Avatar className="h-7 w-7 rounded-full">
                <AvatarImage
                  src={sidebarAvatarSrc}
                  alt="avatar"
                  className="object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.src = '/img/ava.png';
                  }}
                />
                <AvatarFallback className="text-[10px] font-semibold text-slate-800">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium text-slate-900">{memberName || 'Tài khoản'}</p>
                <p className="truncate text-xs text-slate-500">
                  {userEmail || 'Chưa cập nhật email'}
                </p>
              </div>
            </Button>

            {accountOpen && (
              <div
                ref={accountMenuRef}
                className="absolute bottom-3 left-full z-50 ml-2 w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl"
              >
                <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={sidebarAvatarSrc} alt="avatar" />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{memberName || 'Tài khoản'}</p>
                    <p className="truncate text-xs text-slate-500">
                      {userEmail || 'Chưa cập nhật email'}
                    </p>
                  </div>
                </div>

                <div className="my-1 h-px bg-slate-200" />

                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Bell className="h-4 w-4" />
                  Thông báo
                </button>

                <div className="my-1 h-px bg-slate-200" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

