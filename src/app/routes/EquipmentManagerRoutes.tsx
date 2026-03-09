import { Navigate } from 'react-router-dom'
import EquipmentDashboard from '@/modules/equipment/pages/EquipmentDashboard'
import EquipmentsManagement from '@/modules/equipment/pages/EquipmentsManagement'
import CategoriesManagement from '@/modules/category/pages/CategoriesManagement'
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory'
import EquipmentsManagementLayout from '@/app/layouts/EquipmentsManagementLayout'

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
    path: 'equipments',
    element: <EquipmentsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsManagement /> },
      { path: 'categories', element: <CategoriesManagement /> },
      { path: 'history', element: <EquipmentsHistory /> },
    ],
  },
]

export default EquipmentManagerRoutes

