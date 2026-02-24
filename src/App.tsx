import './App.css';
import { Outlet } from 'react-router-dom';

function App() {
  // App kept minimal; routing is defined in `main.tsx` using RouterProvider.
  return <Outlet />;
}

export default App;
