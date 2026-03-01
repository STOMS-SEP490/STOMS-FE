import RequestsManagement from '@/modules/request/pages/RequestsManagement';
// import CreateRequestPage from '@/modules/request/pages/CreateRequestPage';

const ProgramCoordinatorRoutes = [
  // { path: 'dashboard', element: <PCDashboard /> },
 {
  path: 'requests',
  children: [
    { index: true, element: <RequestsManagement /> },
    // { path: 'create', element: <CreateRequestPage /> },
  ],
}


];

export default ProgramCoordinatorRoutes;
