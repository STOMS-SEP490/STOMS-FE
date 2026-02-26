import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import routes from './routes/index';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

type RouterFutureFlags = {
  v7_startTransition?: boolean;
  v7_relativeSplatPath?: boolean;
};

const _futureFlags: RouterFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const router = createBrowserRouter(routes, { future: _futureFlags });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>  
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
