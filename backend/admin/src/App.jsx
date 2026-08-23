import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import AdminLayout from './layout/AdminLayout.jsx'
import ApiDebugPage from './pages/ApiDebugPage.jsx'
import ApiSwitchPage from './pages/ApiSwitchPage.jsx'
import AiOpsPage from './pages/AiOpsPage.jsx'
import AiAssistantPage from './pages/AiAssistantPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import OperationLogPage from './pages/OperationLogPage.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import SecurityPage from './pages/SecurityPage.jsx'
import SeedDataPage from './pages/SeedDataPage.jsx'
import SiteImagePage from './pages/SiteImagePage.jsx'
import { bootstrapSession } from './api/auth.js'
import { RESOURCE_GROUPS } from './resourceGroups.js'

/**
 * 116g-B：只有「未认证」跳转登录；网络/服务端/限流等失败进入
 * 「服务暂时不可用」重试态，绝不误清会话、绝不误登出。
 */
function RequireAuth({ children }) {
  const [state, setState] = useState('loading') // 'loading' | 'ok' | 'expired' | 'unavailable'
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState('loading')
    bootstrapSession().then(({ decision }) => {
      if (active) setState(decision)
    })
    return () => {
      active = false
    }
  }, [attempt])

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }
  if (state === 'expired') {
    return <Navigate to="/login?reason=expired" replace />
  }
  if (state === 'unavailable') {
    return (
      <Result
        status="warning"
        title="服务暂时不可用"
        subTitle="无法确认登录状态，请检查网络或稍后重试。"
        extra={
          <Button type="primary" onClick={() => setAttempt((value) => value + 1)}>
            重试
          </Button>
        }
      />
    )
  }
  return children
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
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="api-switch" element={<ApiSwitchPage />} />
          <Route path="api-debug" element={<ApiDebugPage />} />
          <Route path="seed-data" element={<SeedDataPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="site-images" element={<SiteImagePage />} />
          <Route path="logs" element={<OperationLogPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
