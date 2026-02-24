import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';

export default function MainLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#f6f8fb] overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}
