import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { LoginPage } from './pages/LoginPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { IgnoredPRsPage } from './pages/IgnoredPRsPage';
import { RootLayout } from './components/RootLayout';
import { githubClient } from './lib/github';
import { useAuthStore } from './stores/authStore';

function PrivateRoute() {
  const { token } = useAuthStore();
  return token ? <Outlet /> : <Navigate to='/login' />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: '/',
        element: <PrivateRoute />,
        children: [
          {
            index: true,
            element: <PullRequestsPage />,
          },
          {
            path: 'ignored',
            element: <IgnoredPRsPage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <ApolloProvider client={githubClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  );
}

export default App;
