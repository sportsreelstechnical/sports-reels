import { Navigate } from "react-router-dom";

export default function NotFound() {
  // Redirect to dashboard home
  return <Navigate to="/dashboard" replace />;
}
