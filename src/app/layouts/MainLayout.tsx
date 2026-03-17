import Sidebar from '@/shared/components/common/Sidebar';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
