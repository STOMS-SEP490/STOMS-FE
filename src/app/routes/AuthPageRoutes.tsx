import ForgotPassword from '../../modules/auth/pages/ForgotPassword';
import Login from '../../modules/auth/pages/Login';

const AuthPageRoutes = [
  { path: 'login', element: <Login /> },
  { path: 'forgot-password', element: <ForgotPassword /> },
];

export default AuthPageRoutes;
