import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import AuthContext from "../context/auth";

const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

  // 1. Wait until we finish checking LocalStorage (loading)
  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  // 2. If no user is found, FORCE redirect to Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If user exists, allow them to see the page (Outlet)
  return <Outlet />;
};

export default ProtectedRoute;
