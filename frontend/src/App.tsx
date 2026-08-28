import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import OrderFeed from "./pages/OrderFeed";
import PartDetail from "./pages/PartDetail";
import OrderBuilder from "./pages/OrderBuilder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sign-in" replace />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/orders" element={<OrderFeed />} />
      <Route path="/parts/:sku" element={<PartDetail />} />
      <Route path="/orders/new" element={<OrderBuilder />} />
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
}
