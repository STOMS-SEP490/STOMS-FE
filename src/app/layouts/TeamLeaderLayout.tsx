 
import TeamLeaderSidebar from '@/shared/components/common/TeamLeaderSidebar';
import { Outlet } from 'react-router-dom';

export default function TeamLeaderLayout() {
  return (
    <div className="flex h-screen">
      <TeamLeaderSidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}

