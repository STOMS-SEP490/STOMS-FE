import ForgotPassword from '../pages/ForgotPassword';
import Login from '../pages/Login';

const AuthPageRoutes = [
  { path: 'login', element: <Login /> },
  { path: 'forgot-password', element: <ForgotPassword /> },
];

export default AuthPageRoutes;
