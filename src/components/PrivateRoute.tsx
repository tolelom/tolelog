import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

interface PrivateRouteProps {
    children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const { token, ready } = useContext(AuthContext);
    const location = useLocation();
    if (!ready) return null;
    return token ? <>{children}</> : <Navigate to="/login" state={{ from: location }} replace />;
}
