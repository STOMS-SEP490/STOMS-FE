import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import routes from './app/routes'
import { AppProviders } from './app/providers/AppProviders'

type RouterFutureFlags = {
  v7_startTransition?: boolean
  v7_relativeSplatPath?: boolean
}

const futureFlags: RouterFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

const router = createBrowserRouter(routes, { future: futureFlags })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
)