import { Navigate } from 'react-router-dom'
import EquipmentDashboard from '@/modules/equipment/pages/EquipmentDashboard'
import EquipmentsManagement from '@/modules/equipment/pages/EquipmentsManagement'
import CategoriesManagement from '@/modules/category/pages/CategoriesManagement'
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory'
import ReservationsManagement from '@/modules/reservation/pages/ReservationsManagement'
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage'

const EquipmentManagerRoutes = [
  {
    index: true,
    element: <Navigate to="dashboard" replace />,
  },
  {
    path: 'dashboard',
    element: <EquipmentDashboard />,
  },
  {
    path: 'categories',
    element: <CategoriesManagement />,
  },
  {
    path: 'equipments/history',
    element: <Navigate to="/em/borrowings" replace />,
  },
  {
    path: 'equipments/reservations',
    element: <Navigate to="/em/reservations" replace />,
  },
  {
    path: 'equipments/history/reservations',
    element: <Navigate to="/em/reservations" replace />,
  },
  {
    path: 'equipments',
    element: <EquipmentsManagement />,
  },
  { path: 'reservations', element: <ReservationsManagement /> },
  { path: 'borrowings', element: <EquipmentsHistory /> },
  {
    path: 'fund-contributions',
    element: <TeacherContributionHistoryPage />,
  },
]

export default EquipmentManagerRoutes

