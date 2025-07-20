import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, ScrollRestoration } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { LoginPage } from './pages/LoginPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { PullRequestDetailPage } from './pages/PullRequestDetailPage';
import { githubClient } from './lib/github';
import { useAuthStore } from './stores/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ApolloProvider client={githubClient}>
      <Router>
        <ScrollRestoration />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <PullRequestsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/pr/:owner/:repo/:number"
            element={
              <PrivateRoute>
                <PullRequestDetailPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ApolloProvider>
  );
}

export default App;