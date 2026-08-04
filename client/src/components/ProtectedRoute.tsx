import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@client/src/components/ui/spinner';
import { useAuth, ROLE_SUBJECT } from '@client/src/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  /** 若未登录，是否重定向到登录页（管理台：是；普通页面可选） */
  redirectToLogin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  redirectToLogin = true,
}) => {
  const { ability, isLoading, isLoggedIn } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!isLoggedIn && redirectToLogin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasPermission = requiredRoles.some((role) =>
      ability.can(role, ROLE_SUBJECT),
    );
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
