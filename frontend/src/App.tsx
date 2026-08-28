import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrderFeed from "./pages/OrderFeed";
import PartDetail from "./pages/PartDetail";
import OrderBuilder from "./pages/OrderBuilder";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      {/* Back-compat: earlier builds linked to /sign-in */}
      <Route path="/sign-in" element={<Navigate to="/login" replace />} />

      {/* Authenticated (no real auth gate in this mock frontend — every
          route below renders inside <AppShell>, which is where a real
          deployment would hang a route guard / redirect-to-login check). */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/orders" element={<OrderFeed />} />
      <Route path="/parts/:sku" element={<PartDetail />} />
      <Route path="/orders/new" element={<OrderBuilder />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
