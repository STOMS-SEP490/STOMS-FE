// layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main  className="flex-1 bg-gray-100 overflow-y-auto no-scrollbar"> 
        <Outlet />
      </main>
    </div>
  );
}
