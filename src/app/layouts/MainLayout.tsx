import Sidebar from '@/shared/components/common/Sidebar';
import MainContent from '@/app/layouts/MainContent';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <MainContent>
          <Outlet />
        </MainContent>
      </main>
    </div>
  );
}
