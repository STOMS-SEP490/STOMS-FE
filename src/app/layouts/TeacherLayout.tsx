import TeacherSidebar from '@/shared/components/common/TeacherSidebar';
import { Outlet } from 'react-router-dom';

export default function TeacherLayout() {
  return (
    <div className="flex h-screen">
      <TeacherSidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

