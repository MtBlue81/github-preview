import { Outlet, ScrollRestoration } from 'react-router-dom';
import { ToastContainer } from './ToastContainer';

export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <ToastContainer />
    </>
  );
}
