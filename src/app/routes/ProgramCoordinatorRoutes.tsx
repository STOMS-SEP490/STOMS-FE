import CreateRequestPage from '@/modules/request/pages/CreateRequestPage';
import RequestsManagement from '@/modules/request/pages/RequestsManagement';

const ProgramCoordinatorRoutes = [
  // { path: 'dashboard', element: <PCDashboard /> },
 {
  path: 'requests',
  children: [
    { index: true, element: <RequestsManagement /> },
    { path: 'create', element: <CreateRequestPage /> },
  ],
}


];

export default ProgramCoordinatorRoutes;
