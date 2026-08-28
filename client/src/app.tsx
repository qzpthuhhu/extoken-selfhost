import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import ExtokenGuidePage from './pages/ExtokenGuidePage/ExtokenGuidePage';
import PackageMechanismPage from './pages/PackageMechanismPage/PackageMechanismPage';
import ExchangeRecordPage from './pages/ExchangeRecordPage/ExchangeRecordPage';
import AdminConsolePage from './pages/AdminConsolePage/AdminConsolePage';
import FeedbackHubPage from './pages/FeedbackHubPage/FeedbackHubPage';
import UseCasesPage from './pages/UseCasesPage/UseCasesPage';
import LoginPage from './pages/LoginPage/LoginPage';
import { ExtokenAccountProvider } from './hooks/useExtokenAccount';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

const RoutesComponent = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ExtokenAccountProvider>
          <Routes>
            {/* 登录页单独走全屏布局，不包 Layout */}
            <Route path="/login" element={<LoginPage />} />

            <Route element={<Layout />}>
              <Route index element={<ExtokenGuidePage />} />
              <Route path="package" element={<PackageMechanismPage />} />
              <Route path="use-cases" element={<UseCasesPage />} />
              <Route
                path="records"
                element={
                  <ProtectedRoute redirectToLogin requiredRoles={['user']}>
                    <ExchangeRecordPage />
                  </ProtectedRoute>
                }
              />
              <Route path="feedback" element={<FeedbackHubPage />} />
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AdminConsolePage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ExtokenAccountProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default RoutesComponent;
