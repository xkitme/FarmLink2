import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contents from './pages/Contents'
import Users from './pages/Users'
import AI from './pages/AI'
import ApiManager from './pages/ApiManager'
import Challenges from './pages/Challenges'
import Community from './pages/Community'
import Achievements from './pages/Achievements'
import Monitor from './pages/Monitor'
import Settings from './pages/Settings'

const isLoggedIn = () => !!localStorage.getItem('admin_token')

function PrivateRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contents" element={<Contents />} />
          <Route path="users" element={<Users />} />
          <Route path="ai" element={<AI />} />
          <Route path="api-manager" element={<ApiManager />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="community" element={<Community />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
