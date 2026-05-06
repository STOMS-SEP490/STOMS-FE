import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Bookmark,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutGrid,
  LayoutTemplate,
  Layers,
  LogOut,
  Package,
  PieChart,
  Star,
  Tag,
  UserCircle,
  Users,
  Wallet,
  ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logout } from '@/modules/auth/pages/Logout';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
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

const TOP_ROW = 'grid w-full grid-cols-[18px_1fr] items-center gap-3 px-3 py-2.5';
const TOP_ROW_WITH_CHEVRON = 'grid w-full grid-cols-[18px_1fr_18px] items-center gap-3 px-3 py-2.5';
const SUB_ROW ='grid w-full grid-cols-[18px_1fr] items-center gap-3 py-2 pl-1 pr-2';
const ICON_SLOT = 'flex size-[18px] shrink-0 items-center justify-center';
const SUBTREE_WRAPPER = 'mt-0.5 ml-[calc(0.75rem+9px)] flex flex-col gap-0.5 border-l border-slate-200 pl-3';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setCurrentUser } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [switchingRoleId, setSwitchingRoleId] = useState<number | null>(null);
  const [sidebarAvatarSrc, setSidebarAvatarSrc] = useState(() => {
    const avatarUrl = localStorage.getItem('memberAvatarUrl') || '';
    return avatarUrl.trim() ? avatarUrl : '/img/ava.png';
  });
  const [memberName, setMemberName] = useState(() => localStorage.getItem('memberFullName') || '');
  const userMeta = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('user') || '{}') as {
        email?: string;
      };
      return {
        email: parsed.email || '',
      };
    } catch {
      return {
        email: '',
      };
    }
  }, []);

  const roleOptions = useMemo(() => {
    const stored = getStoredAuthUser();
    const userRoleId = stored?.userRoleId ?? null;
    const memberRoleId = stored?.memberRoleId ?? null;
    if (userRoleId == null || memberRoleId == null) return [];
    if (userRoleId === memberRoleId) return [];
    const activeRoleId = stored?.activeRoleId ?? null;
    return [
      { roleId: userRoleId, source: 'user' as const },
      { roleId: memberRoleId, source: 'member' as const },
    ].filter((x) => activeRoleId == null || x.roleId !== activeRoleId);
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

      // Cập nhật access token mới vào storage
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

  const templateChildPaths = useMemo(
    () => ['/manager/events', '/manager/courses', '/manager/subjects'],
    []
  );
  const isOnTemplateChild = templateChildPaths.some((p) => location.pathname === p);

  const isOnEquipmentSection = useMemo(() => {
    const p = location.pathname;
    return (
      p === '/manager/equipments' ||
      p.startsWith('/manager/equipments/categories') ||
      p.startsWith('/manager/borrowings')
    );
  }, [location.pathname]);

  const GROUP_TEMPLATE = 'Quản lý mẫu';
  const GROUP_EQUIPMENT = 'Thiết bị và Phiếu mượn';

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    [GROUP_TEMPLATE]: true,
    [GROUP_EQUIPMENT]: true,
  });

  useEffect(() => {
    if (isOnTemplateChild) {
      setOpenGroups((prev) => ({ ...prev, [GROUP_TEMPLATE]: true }));
    }
  }, [isOnTemplateChild]);

  useEffect(() => {
    if (isOnEquipmentSection) {
      setOpenGroups((prev) => ({ ...prev, [GROUP_EQUIPMENT]: true }));
    }
  }, [isOnEquipmentSection]);

  type MenuLink = { kind: 'link'; label: string; icon: LucideIcon; path: string; end?: boolean };
  type MenuGroup = {
    kind: 'group';
    label: string;
    icon: LucideIcon;
    children: { label: string; icon: LucideIcon; path: string; end?: boolean }[];
  };

  const menus = useMemo((): (MenuLink | MenuGroup)[] => {
    return [
      { kind: 'link', label: 'Thống kê', icon: BarChart3, path: '/manager/dashboard' },
      { kind: 'link', label: 'Quản lý tài khoản', icon: UserCircle, path: '/manager/users' },
      { kind: 'link', label: 'Quản lý thành viên', icon: Users, path: '/manager/members' },
      { kind: 'link', label: 'Nhóm', icon: ListChecks, path: '/manager/teams' },
            { kind: 'link', label: 'Trung tâm duyệt', icon: CheckCircle2, path: '/manager/requests' },
      { kind: 'link', label: 'Chủ đề', icon: Bookmark, path: '/manager/topics' },

      {
        kind: 'group',
        label: GROUP_TEMPLATE,
        icon: LayoutTemplate,
        children: [
          { label: 'Mẫu sự kiện', icon: Star, path: '/manager/events' },
          { label: 'Chương trình học', icon: GraduationCap, path: '/manager/courses' },
          { label: 'Môn học', icon: Layers, path: '/manager/subjects' },
        ],
      },
      {
        kind: 'group',
        label: GROUP_EQUIPMENT,
        icon: Package,
        children: [
          { label: 'Thiết bị', icon: Package, path: '/manager/equipments', end: true },
          { label: 'Danh mục', icon: Layers, path: '/manager/equipments/categories', end: true },
          { label: 'Phiếu mượn', icon: ClipboardCheck, path: '/manager/borrowings', end: true },
          { label: 'Đơn yêu cầu thiết bị', icon: CalendarClock, path: '/manager/reservations', end: true },
        ],
      },
            { kind: 'link', label: 'Thời khóa biểu', icon: CalendarDays, path: '/manager/timetable' },

      { kind: 'link', label: 'Hợp đồng', icon: FileText, path: '/manager/contracts' },
     
      { kind: 'link', label: 'Quản lý công việc', icon: Tag, path: '/manager/tasks' },
      { kind: 'link', label: 'Quản lý kỹ năng', icon: PieChart, path: '/manager/skills' },
      { kind: 'link', label: 'Giao dịch', icon: ArrowLeftRight, path: '/manager/transactions' },
      { kind: 'link', label: 'Quỹ', icon: Wallet, path: '/manager/wallets' },
             { kind: 'link', label: 'Nhật ký', icon: ClipboardList, path: '/manager/logs' },

    ];
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitial = useMemo(() => {
    const source = (memberName || userMeta.email || '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }, [memberName, userMeta.email]);

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
              if (m.kind === 'link') {
                const Icon = m.icon;
                return (
                  <NavLink key={m.path} to={m.path} end={m.end}>
                    {({ isActive }) => (
                      <div className="relative">
                        <div
                          className={cn(
                            TOP_ROW,
                            'group rounded-xl transition-colors duration-200',
                            isActive
                              ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <span className={ICON_SLOT}>
                            <Icon
                              className={cn(
                                'size-[18px]',
                                isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-700'
                              )}
                            />
                          </span>
                          <span className="min-w-0 truncate text-left text-sm font-medium leading-5">
                            {m.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </NavLink>
                );
              }

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
                      {m.children.map((c) => {
                        const ChildIcon = c.icon;
                        return (
                          <NavLink key={c.path} to={c.path} end={c.end ?? false}>
                            {({ isActive }) => (
                              <div
                                className={cn(
                                  SUB_ROW,
                                  'group rounded-lg transition-colors duration-200',
                                  isActive
                                    ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                )}
                              >
                                <span className={ICON_SLOT}>
                                  <ChildIcon
                                    className={cn(
                                      'size-4',
                                      isActive
                                        ? 'text-white'
                                        : 'text-slate-600 group-hover:text-slate-700'
                                    )}
                                  />
                                </span>
                                <span className="min-w-0 truncate text-left text-sm font-medium leading-5">
                                  {c.label}
                                </span>
                              </div>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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
              <AvatarFallback className="text-[10px] font-semibold text-[#1a7a99]">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-[#1a7a99]">{memberName || 'Tài khoản'}</p>
              <p className="truncate text-xs text-slate-500">
                {userMeta.email || 'Chưa cập nhật email'}
              </p>
            </div>
          </Button>

          {accountOpen && (
            <div
              ref={accountMenuRef}
              className={cn(
                'absolute z-50 w-[220px] rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl',
                'bottom-3 left-full ml-2'
              )}
            >
              <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={sidebarAvatarSrc} alt="avatar" />
                  <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{memberName || 'Tài khoản'}</p>
                  <p className="truncate text-xs text-slate-500">
                    {userMeta.email || 'Chưa cập nhật email'}
                  </p>
                </div>
              </div>

              <div className="my-1 h-px bg-slate-200" />

              <button
                type="button"
                onClick={() => { setAccountOpen(false); navigate('/manager/profile'); }}
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