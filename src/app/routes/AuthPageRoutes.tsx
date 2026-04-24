import ForgotPassword from '../../modules/auth/pages/ForgotPassword';
import Login from '../../modules/auth/pages/Login';
import ChooseRole from '../../modules/auth/pages/ChooseRole';

const AuthPageRoutes = [
  { index: true, element: <Login /> },
  { path: 'login', element: <Login /> },
  { path: 'choose-role', element: <ChooseRole /> },
  { path: 'forgot-password', element: <ForgotPassword /> },
];

export default AuthPageRoutes;
