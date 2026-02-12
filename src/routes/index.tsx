
import AuthLayout from '../layouts/AuthLayout'
import AuthPageRoutes from './AuthPageRoutes'

const routes = [
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      ...AuthPageRoutes,
    ],
  },
]

export default routes
