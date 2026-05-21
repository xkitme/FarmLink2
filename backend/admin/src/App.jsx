import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layout/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Placeholder from './pages/Placeholder.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
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
          <Route path="api-switch" element={<Placeholder title="API 开关管理" group="系统治理" />} />
          <Route path="api-debug" element={<Placeholder title="API 在线调试" group="系统治理" />} />
          <Route path="logs" element={<Placeholder title="系统操作日志" group="系统治理" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
