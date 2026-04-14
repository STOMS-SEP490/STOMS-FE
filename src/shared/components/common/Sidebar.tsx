import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutGrid,
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
import { logout } from '@/modules/auth/pages/Logout';
import { NavLink, useNavigate } from 'react-router-dom';
import memberApi from '@/modules/member/api/memberApi';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
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

  const menus = useMemo(
    () => [
      { label: 'Thống kê', icon: BarChart3, path: '/manager/dashboard' },
      { label: 'Quản lý tài khoản', icon: UserCircle, path: '/manager/users' },
      { label: 'Quản lý thành viên', icon: Users, path: '/manager/members' },
      { label: 'Nhóm', icon: ListChecks, path: '/manager/teams' },
      { label: 'Sự kiện', icon: Star, path: '/manager/events' },
      { label: 'Giáo trình', icon: GraduationCap, path: '/manager/courses' },
      { label: 'Chủ đề', icon: Bookmark, path: '/manager/topics' },
      { label: 'Thiết bị', icon: Package, path: '/manager/equipments' },
      { label: 'Phiếu mượn', icon: ClipboardCheck, path: '/manager/borrowings' },
      { label: 'Hợp đồng', icon: FileText, path: '/manager/contracts' },
      { label: 'Nhật ký', icon: ClipboardList, path: '/manager/logs' },
      { label: 'Quỹ', icon: Wallet, path: '/manager/transactions' },
      { label: 'Thời khóa biểu', icon: CalendarDays, path: '/manager/timetable' },
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

  const userInitial = useMemo(() => {
    const source = (memberName || userMeta.email || '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
  }, [memberName, userMeta.email]);

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'relative z-20 h-screen shrink-0 transition-all duration-300',
        collapsed ? 'w-[32px] overflow-visible bg-slate-100 px-0 py-0' : 'w-[280px] bg-background px-2 py-3'
      )}
    >
      {collapsed ? (
        <div className="absolute left-2 top-3 flex flex-col items-center gap-2 pl-0.5">
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

              return (
                <NavLink key={m.path} to={m.path}>
                  {({ isActive }) => (
                    <div className="group relative">
                      <div
                        className={cn(
                          'w-full rounded-xl transition-colors duration-200',
                          'flex items-center gap-3 px-3 py-2.5',
                          isActive
                            ? 'bg-[#208aae] text-white hover:bg-[#208aae]'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0',
                            isActive ? 'text-white' : 'text-slate-600'
                          )}
                        />
                        <span className="text-sm font-medium leading-5">{m.label}</span>
                      </div>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
          </div>
        </div>

        <div className="mt-auto pt-2">
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
              <AvatarFallback className="text-[10px] font-semibold text-slate-800">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-medium text-slate-900">{memberName || 'Tài khoản'}</p>
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