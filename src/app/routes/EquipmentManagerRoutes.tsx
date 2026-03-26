import { Navigate } from 'react-router-dom'
import EquipmentDashboard from '@/modules/equipment/pages/EquipmentDashboard'
import EquipmentsManagement from '@/modules/equipment/pages/EquipmentsManagement'
import CategoriesManagement from '@/modules/category/pages/CategoriesManagement'
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory'
import EquipmentsManagementLayout from '@/app/layouts/EquipmentsManagementLayout'
import ReservationsManagement from '@/modules/reservation/pages/ReservationsManagement';

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
    path: 'borrowings',
    element: <Navigate to="/em/equipments/history" replace />,
  },
  {
    path: 'equipments/history',
    element: <EquipmentsHistory standalone />,
  },
  {
    path: 'equipments',
    element: <EquipmentsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsManagement /> },
      { path: 'categories', element: <CategoriesManagement /> },
      { path: 'history', element: <EquipmentsHistory /> },
      { path: 'reservations', element: <ReservationsManagement /> },
    ],
  },
]

export default EquipmentManagerRoutes

