import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, LogOut, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import { logout } from '@/modules/auth/pages/Logout';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import NotificationBell from '@/shared/components/common/NotificationBell';
import { useAuth } from '@/app/providers/AuthProvider';
import { getStoredAuthUser, setActiveRoleIdInStorage } from '@/modules/auth/authStorage';
import { getHomePathByRole } from '@/modules/auth/roleAccess';
import { getRoleLabel } from '@/constants/role';
import authService from '@/modules/auth/api/authApi';
import { message } from 'antd';

export type RoleSidebarMenuLink = {
  kind?: 'link';
  label: string;
  icon: LucideIcon;
  path: string;
  matchPrefixPath?: string;
  end?: boolean;
};

export type RoleSidebarMenuGroup = {
  kind: 'group';
  label: string;
  icon: LucideIcon;
  children: RoleSidebarMenuLink[];
};

export type RoleSidebarMenuItem = RoleSidebarMenuLink | RoleSidebarMenuGroup;

type RoleSidebarProps = {
  profilePath: string;
  menus: RoleSidebarMenuItem[];
};

export default function RoleSidebar({ menus, profilePath }: RoleSidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setCurrentUser } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [switchingRoleId, setSwitchingRoleId] = useState<number | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const groups: Record<string, boolean> = {};
    for (const menu of menus) {
      if (menu.kind === 'group') {
        groups[menu.label] = true;
      }
    }
    return groups;
  });
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
      // Removed auto-collapse when clicking outside sidebar
      // if (!sidebarRef.current?.contains(target)) {
      //   setCollapsed(true);
      // }
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

  const roleOptions = useMemo<Array<{ source: string; roleId: number }>>(() => {
    const stored = getStoredAuthUser();
    const userRoleId = stored?.userRoleId ?? null;
    const memberRoleId = stored?.memberRoleId ?? null;
    const activeRoleId = stored?.activeRoleId ?? null;
    
    if (userRoleId == null) return [];
    
    const options: Array<{ source: string; roleId: number }> = [];
    
    if (userRoleId !== activeRoleId) {
      options.push({ source: 'user', roleId: userRoleId });
    }
    
    if (memberRoleId != null && memberRoleId !== activeRoleId && memberRoleId !== userRoleId) {
      options.push({ source: 'member', roleId: memberRoleId });
    }
    
    return options;
  }, []);

  const handleSwitchRole = async (roleId: number) => {
    const stored = getStoredAuthUser();
    if (!stored?.userId || !stored.email || !stored.deviceUid) {
      setAccountOpen(false);
      navigate('/login');
      return;
    }

    setSwitchingRoleId(roleId);
    try {
      const res = await authService.switchRole({
        targetRoleId: roleId,
        deviceUid: stored.deviceUid,
      });

      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('accessTokenExpiresAt', res.accessTokenExpiresAt);
      setActiveRoleIdInStorage(res.activeRoleId);

      setCurrentUser({
        id: stored.userId,
        email: stored.email,
        fullName: stored.email,
        role: String(res.activeRoleId),
        token: res.accessToken,
      });
      message.success(`Đã chuyển sang: ${getRoleLabel(res.activeRoleId)}`);
      setAccountOpen(false);
      navigate(getHomePathByRole(res.activeRoleId));
    } catch {
      message.error('Chuyển tư cách thất bại. Vui lòng thử lại.');
    } finally {
      setSwitchingRoleId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = useMemo(() => {
    const source = (memberName || userEmail || '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }, [memberName, userEmail]);

  const TOP_ROW = 'grid w-full grid-cols-[18px_1fr] items-center gap-3 px-3 py-2.5';
  const TOP_ROW_WITH_CHEVRON = 'grid w-full grid-cols-[18px_1fr_18px] items-center gap-3 px-3 py-2.5';
  const SUB_ROW = 'grid w-full grid-cols-[18px_1fr] items-center gap-3 py-2 pl-1 pr-2';
  const ICON_SLOT = 'flex size-[18px] shrink-0 items-center justify-center';
  const SUBTREE_WRAPPER =
    'mt-0.5 ml-[calc(0.75rem+9px)] flex flex-col gap-0.5 border-l border-slate-200 pl-3';

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
            <NotificationBell variant="sidebarCollapsed" />
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
              <p className="truncate text-sm font-semibold text-[#1a7a99]">STOMS</p>
            </div>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </div>

          <div className="relative overflow-visible">
            <div className="max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-visible no-scrollbar">
              <div className="flex flex-col gap-1">
                {menus.map((m) => {
                  if (m.kind === 'group') {
                    const GroupIcon = m.icon;
                    const groupOpen = openGroups[m.label] ?? true;

                    return (
                      <div key={m.label} className="rounded-xl">
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={groupOpen}
                          onClick={() =>
                            setOpenGroups((prev) => ({
                              ...prev,
                              [m.label]: !(prev[m.label] ?? true),
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setOpenGroups((prev) => ({
                                ...prev,
                                [m.label]: !(prev[m.label] ?? true),
                              }));
                            }
                          }}
                          className={cn(
                            TOP_ROW_WITH_CHEVRON,
                            'group cursor-pointer rounded-xl text-left text-slate-500 transition-colors duration-200',
                            'hover:bg-slate-100 hover:text-slate-900',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2'
                          )}
                        >
                          <span className={ICON_SLOT}>
                            <GroupIcon className="size-[18px] text-slate-600 group-hover:text-slate-700" />
                          </span>
                          <span className="min-w-0 truncate text-sm font-medium leading-5">{m.label}</span>
                          <span className={ICON_SLOT}>
                            <ChevronDown
                              className={cn(
                                'size-4 text-slate-500 transition-transform duration-200',
                                groupOpen ? 'rotate-0' : '-rotate-90'
                              )}
                            />
                          </span>
                        </div>

                        {groupOpen ? (
                          <div className={SUBTREE_WRAPPER}>
                            {m.children.map((child) => {
                              const ChildIcon = child.icon;
                              const matchPrefixPath = child.matchPrefixPath ?? child.path;
                              return (
                                <NavLink key={child.path} to={child.path} end={child.end ?? !child.matchPrefixPath}>
                                  {({ isActive }) => {
                                    const active =
                                      isActive ||
                                      location.pathname === matchPrefixPath ||
                                      location.pathname.startsWith(`${matchPrefixPath}/`);

                                    return (
                                      <div
                                        className={cn(
                                          SUB_ROW,
                                          'group rounded-lg transition-colors duration-200',
                                          active
                                            ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        )}
                                      >
                                        <span className={ICON_SLOT}>
                                          <ChildIcon
                                            className={cn(
                                              'size-4',
                                              active ? 'text-white' : 'text-slate-600 group-hover:text-slate-700'
                                            )}
                                          />
                                        </span>
                                        <span className="min-w-0 truncate text-left text-sm font-medium leading-5">
                                          {child.label}
                                        </span>
                                      </div>
                                    );
                                  }}
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  const Icon = m.icon;
                  const matchPrefixPath = m.matchPrefixPath ?? m.path;

                  return (
                    <NavLink key={m.path} to={m.path} end={m.end ?? !m.matchPrefixPath}>
                      {({ isActive }) => {
                        const active =
                          isActive ||
                          location.pathname === matchPrefixPath ||
                          location.pathname.startsWith(`${matchPrefixPath}/`);

                        return (
                          <div className="relative">
                            <div
                              className={cn(
                                TOP_ROW,
                                'group rounded-xl transition-colors duration-200',
                                active
                                  ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                              )}
                            >
                              <span className={ICON_SLOT}>
                                <Icon
                                  className={cn(
                                    'size-[18px]',
                                    active ? 'text-white' : 'text-slate-600 group-hover:text-slate-700'
                                  )}
                                />
                              </span>
                              <span className="min-w-0 truncate text-left text-sm font-medium leading-5">
                                {m.label}
                              </span>
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
                <p className="truncate text-sm font-medium text-[#1a7a99]">{memberName || 'Tài khoản'}</p>
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
                  onClick={() => { setAccountOpen(false); navigate(profilePath); }}
                  className="flex w-full items-center rounded-md px-2 py-2 text-sm font-normal text-slate-700 hover:bg-slate-100"
                >
                  Thông tin cá nhân
                </button>


                {roleOptions.length > 0 ? (
                  <div className="px-2 py-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Chuyển tư cách
                    </div>
                    <div className="mt-2 space-y-1">
                      {roleOptions.map((opt) => (
                        <button
                          key={`${opt.source}-${opt.roleId}`}
                          type="button"
                          onClick={() => handleSwitchRole(opt.roleId)}
                          disabled={switchingRoleId != null}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <span className="truncate">
                            {getRoleLabel(opt.roleId)}
                          </span>
                          {switchingRoleId === opt.roleId
                            ? <span className="text-xs text-slate-400">...</span>
                            : <ChevronDown className="h-4 w-4 rotate-[-90deg] text-slate-400" />
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}


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

