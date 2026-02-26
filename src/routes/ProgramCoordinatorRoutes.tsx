import RequestsManagement from '@/pages/ProgramCoordinator/Request/RequestsManagement';
import PCDashboard from '../pages/ProgramCoordinator/Dashboard';
import CreateRequestPage from '@/pages/ProgramCoordinator/Request/CreateRequestPage';

const ProgramCoordinatorRoutes = [
  { path: 'dashboard', element: <PCDashboard /> },
 {
  path: 'requests',
  children: [
    { index: true, element: <RequestsManagement /> },
    { path: 'create', element: <CreateRequestPage /> },
  ],
}


];

export default ProgramCoordinatorRoutes;
