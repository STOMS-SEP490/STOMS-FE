import { useMemo, useState } from 'react';
import {
  BarChart3,
  FileText,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Laptop,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  Bookmark,
  Tag,
  PieChart,
  Menu,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function PCSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menus = useMemo(
    () => [
      { label: 'Thống kê', icon: BarChart3, path: '/manager/dashboard' },
      { label: 'Người dùng', icon: Users, path: '/manager/users' },
      { label: 'Nhóm', icon: Users, path: '/manager/teams' },
      { label: 'Sự kiện', icon: CalendarDays, path: '/manager/events' },
      { label: 'Giáo trình', icon: BookOpen, path: '/manager/courses' },
      { label: 'Chủ đề', icon: Bookmark, path: '/manager/topics' },
      { label: 'Thiết bị', icon: Laptop, path: '/manager/equipments' },
      { label: 'Hợp đồng', icon: FileText, path: '/manager/contracts' },
      { label: 'Nhật ký', icon: ClipboardList, path: '/manager/logs' },
      { label: 'Quỹ / Thu chi', icon: Wallet, path: '/manager/transactions' },
      { label: 'Thời khóa biểu', icon: Clock, path: '/manager/timetable' },
      { label: 'Trung tâm duyệt', icon: CheckCircle, path: '/manager/requests' },
      { label: 'Quản lý công việc', icon: Tag, path: '/manager/tasks' },
      { label: 'Quản lý kỹ năng', icon: PieChart, path: '/manager/skills' },
    ],
    []
  );

  return (
    <aside
      className={`
        h-screen bg-[#F6F8FB] border-r
        transition-all duration-300
        ${collapsed ? 'w-20 px-2' : 'w-80 px-6'}
        py-6 flex flex-col
      `}
    >
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

      {/* Top */}

      {/* Avatar */}
      {!collapsed && (
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg ring-4 ring-white">
            <img
              src="/img/avatar.png"
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
          <div className="mt-4 text-center">
            <div className="font-medium text-slate-700">Xin chào Phương</div>
            <div className="text-sm text-slate-400">phuonglhk@fpt.edu.vn</div>
          </div>
        </div>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md hover:bg-gray-200 transition"
        >
          <Menu size={20} color="black" />
        </button>
      )}
      {/* Scrollable Grid */}
      <div className=" overflow-y-auto no-scrollbar relative ">
        <div
          className={`
            grid border border-gray-200 rounded-xl 
            ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}
          `}
        >
          {menus.map((m) => {
            const Icon = m.icon;

            return (
              <NavLink key={m.path} to={m.path}>
                {({ isActive }) => (
                  <div className={`relative group  ${collapsed ? 'h-15' : 'h-20'}`}>
                    {/* Default */}
                    <div
                      className={` 
                        h-full rounded-xl 
                        flex flex-col items-center justify-center
                        transition-all
                        ${isActive ? 'opacity-0' : 'group-hover:opacity-0'}
                      `}
                    >
                      <Icon size={20} className="text-gray-400" />
                      {!collapsed && (
                        <div className="text-xs mt-2 text-center text-gray-400">{m.label}</div>
                      )}
                    </div>

                    {/* Floating active/hover */}
                    <div
                      className={`
                        absolute inset-0 rounded-xl
                        flex flex-col items-center justify-center
                         transition-all duration-300
                        ${
                          isActive
                            ? 'bg-[#0F6A9E] text-white scale-100'
                            : 'bg-[#0F6A9E] text-white opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
                        }
                      `}
                    >
                      <Icon size={22} />
                      {!collapsed && (
                        <div className="text-xs mt-2 font-medium text-center px-1 ">{m.label}</div>
                      )}
                    </div>

                    {/* Tooltip khi collapsed */}
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
    </aside>
  );
}
