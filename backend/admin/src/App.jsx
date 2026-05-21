import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layout/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Placeholder from './pages/Placeholder.jsx'
import { isLoggedIn } from './api/auth.js'

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
          <Route path="users" element={<Placeholder title="用户与角色" group="平台基础" />} />
          <Route path="agri" element={<Placeholder title="农业生产数据" group="农业生产" />} />
          <Route path="market" element={<Placeholder title="流通销售数据" group="流通销售" />} />
          <Route path="machinery" element={<Placeholder title="农机共享数据" group="农机共享" />} />
          <Route path="disaster" element={<Placeholder title="灾害应急数据" group="气象灾害" />} />
          <Route path="policy" element={<Placeholder title="惠农政策与党建" group="政策思政" />} />
          <Route path="life" element={<Placeholder title="乡村生活服务" group="生活服务" />} />
          <Route path="data" element={<Placeholder title="数据管理中心" group="数据管理" />} />
          <Route path="ai" element={<Placeholder title="本地 AI 能力" group="AI 管理" />} />
          <Route path="api-switch" element={<Placeholder title="API 开关管理" group="系统治理" />} />
          <Route path="api-debug" element={<Placeholder title="API 在线调试" group="系统治理" />} />
          <Route path="logs" element={<Placeholder title="系统操作日志" group="系统治理" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
