import PCSidebar from '@/shared/components/common/PCSideBar';
import MainContent from '@/app/layouts/MainContent';
import { Outlet } from 'react-router-dom';

export default function PCLayout() {
  return (
    <div className="flex h-screen">
      <PCSidebar />
      <main className="flex-1 app-page-bg overflow-y-auto no-scrollbar">
        <MainContent>
          <Outlet />
        </MainContent>
      </main>
    </div>
  );
}
