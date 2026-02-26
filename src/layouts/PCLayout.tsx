import { Outlet } from 'react-router-dom';
import PCSidebar from '@/components/common/PCSideBar';

export default function PCLayout() {
  return (
    <div className="flex h-screen">
      <PCSidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}
