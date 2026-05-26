import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layout/AdminLayout.jsx'
import ApiDebugPage from './pages/ApiDebugPage.jsx'
import ApiSwitchPage from './pages/ApiSwitchPage.jsx'
import AiOpsPage from './pages/AiOpsPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import OperationLogPage from './pages/OperationLogPage.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import SeedDataPage from './pages/SeedDataPage.jsx'
import { isLoggedIn } from './api/auth.js'
import { RESOURCE_GROUPS } from './resourceGroups.js'

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          {Object.entries(RESOURCE_GROUPS).map(([path, config]) => (
            <Route
              key={path}
              path={path}
              element={<ResourcePage title={config.title} group={config.group} resources={config.resources} />}
            />
          ))}
          <Route path="ai-ops" element={<AiOpsPage />} />
          <Route path="api-switch" element={<ApiSwitchPage />} />
          <Route path="api-debug" element={<ApiDebugPage />} />
          <Route path="seed-data" element={<SeedDataPage />} />
          <Route path="logs" element={<OperationLogPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
