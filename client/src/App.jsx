import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Landing from './screens/Landing.jsx';
import SignIn from './screens/SignIn.jsx';
import Operations from './screens/Operations.jsx';
import TaskQueue from './screens/TaskQueue.jsx';
import PartsCatalog from './screens/PartsCatalog.jsx';
import PartDetail from './screens/PartDetail.jsx';
import Approvals from './screens/Approvals.jsx';
import History from './screens/History.jsx';
import { loadSession } from './workspaces.js';

function RequireSession({ session, children }) {
  const location = useLocation();
  if (!session) return <Navigate to="/signin" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn onSignIn={setSession} />} />

        <Route
          path="/app"
          element={
            <RequireSession session={session}>
              <AppShell session={session} onSignOut={() => setSession(null)} />
            </RequireSession>
          }
        >
          <Route index element={<Operations />} />
          <Route path="queue" element={<TaskQueue />} />
          <Route path="parts" element={<PartsCatalog />} />
          <Route path="parts/:id" element={<PartDetail />} />
          <Route path="approvals" element={<Approvals />} />
          {/* Approval review reached from a completed run. */}
          <Route path="approve/:runId" element={<Approvals />} />
          <Route path="history" element={<History />} />
          <Route path="history/:runId" element={<History />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
