import TeacherSidebar from '@/shared/components/common/TeacherSidebar';
import MainContent from '@/app/layouts/MainContent';
import { Outlet } from 'react-router-dom';

export default function TeacherLayout() {
  return (
    <div className="flex h-screen">
      <TeacherSidebar />
      <main className="flex-1 app-page-bg overflow-y-auto no-scrollbar">
        <MainContent>
          <Outlet />
        </MainContent>
      </main>
    </div>
  );
}

