import { Navigate } from 'react-router-dom'
import EquipmentDashboard from '@/modules/equipment/pages/EquipmentDashboard'
import EquipmentsManagement from '@/modules/equipment/pages/EquipmentsManagement'
import CategoriesManagement from '@/modules/category/pages/CategoriesManagement'
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory'
import EquipmentsManagementLayout from '@/app/layouts/EquipmentsManagementLayout'
import BorrowingsManagementLayout from '@/app/layouts/BorrowingsManagementLayout'
import ReservationsManagement from '@/modules/reservation/pages/ReservationsManagement'

const EquipmentManagerRoutes = [
  {
    index: true,
    element: <Navigate to="equipments" replace />,
  },
  {
    path: 'dashboard',
    element: <EquipmentDashboard />,
  },
  {
    path: 'categories',
    element: <Navigate to="/em/equipments/categories" replace />,
  },
  {
    path: 'equipments/history',
    element: <Navigate to="/em/borrowings" replace />,
  },
  {
    path: 'equipments/reservations',
    element: <Navigate to="/em/borrowings/reservations" replace />,
  },
  {
    path: 'equipments/history/reservations',
    element: <Navigate to="/em/borrowings/reservations" replace />,
  },
  {
    path: 'equipments',
    element: <EquipmentsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsManagement /> },
      { path: 'categories', element: <CategoriesManagement /> },
    ],
  },
  {
    path: 'borrowings',
    element: <BorrowingsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsHistory /> },
      { path: 'reservations', element: <ReservationsManagement /> },
    ],
  },
]

export default EquipmentManagerRoutes

