import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ProLayout } from '@ant-design/pro-components'
import { Avatar, Dropdown, Space, Tag } from 'antd'
import {
  DashboardOutlined, FileTextOutlined, UserOutlined, RobotOutlined,
  ApiOutlined, TrophyOutlined, TeamOutlined, SettingOutlined,
  MonitorOutlined, CalendarOutlined, LogoutOutlined, UserSwitchOutlined,
} from '@ant-design/icons'

const menuData = [
  { path: '/dashboard',    name: '数据总览',   icon: <DashboardOutlined /> },
  { path: '/contents',     name: '内容管理',   icon: <FileTextOutlined /> },
  { path: '/users',        name: '用户管理',   icon: <UserOutlined /> },
  { path: '/ai',           name: 'AI 管理',    icon: <RobotOutlined /> },
  { path: '/api-manager',  name: 'API 管理',   icon: <ApiOutlined /> },
  { path: '/challenges',   name: '每日挑战',   icon: <CalendarOutlined /> },
  { path: '/community',    name: '社区管理',   icon: <TeamOutlined /> },
  { path: '/achievements', name: '成就管理',   icon: <TrophyOutlined /> },
  { path: '/monitor',      name: '系统监控',   icon: <MonitorOutlined /> },
  { path: '/settings',     name: '系统设置',   icon: <SettingOutlined /> },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const username = localStorage.getItem('admin_username') || 'admin'

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    navigate('/login')
  }

  return (
    <ProLayout
      title="墨脉 · 管理后台"
      logo={<span style={{ fontSize: 22 }}>🖌</span>}
      layout="mix"
      navTheme="realDark"
      colorPrimary="#8B4513"
      fixSiderbar
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <div onClick={() => navigate(item.path)}>{dom}</div>
      )}
      location={{ pathname: location.pathname }}
      avatarProps={{
        src: null,
        icon: <UserSwitchOutlined />,
        title: username,
        size: 'small',
        render: (props, dom) => (
          <Dropdown
            menu={{
              items: [
                { key: 'user', label: <span style={{ color: '#666' }}>{username}</span>, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: logout },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              {dom}
              <Tag color="volcano" style={{ margin: 0 }}>管理员</Tag>
            </Space>
          </Dropdown>
        ),
      }}
      actionsRender={() => []}
    >
      <Outlet />
    </ProLayout>
  )
}
