import TeamLeaderSidebar from '@/shared/components/common/TeamLeaderSidebar';
import MainContent from '@/app/layouts/MainContent';
import { Outlet } from 'react-router-dom';

export default function TeamLeaderLayout() {
  return (
    <div className="flex h-screen">
      <TeamLeaderSidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <MainContent>
          <Outlet />
        </MainContent>
      </main>
    </div>
  );
}

