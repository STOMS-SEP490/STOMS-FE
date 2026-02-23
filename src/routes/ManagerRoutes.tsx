import CurriculumManagement from "../pages/Manager/CurriculumManagement"
import ManagerDashboard from "../pages/Manager/Dashboard"

const ManagerRoutes = [
  { path: 'dashboard', element: <ManagerDashboard /> },
  { path: 'curriculum', element: <CurriculumManagement /> },
]

export default ManagerRoutes