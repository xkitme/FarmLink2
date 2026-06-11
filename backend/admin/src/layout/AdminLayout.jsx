import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  BugOutlined,
  CloudOutlined,
  ControlOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  HomeOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Menu, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser } from '../api/auth.js'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '驾驶舱' },
  {
    key: 'business',
    icon: <AppstoreOutlined />,
    label: '业务数据',
    children: [
      { key: '/users', icon: <TeamOutlined />, label: '用户与角色' },
      { key: '/agri', icon: <BugOutlined />, label: '农业生产' },
      { key: '/market', icon: <ShoppingOutlined />, label: '流通销售' },
      { key: '/machinery', icon: <TruckOutlined />, label: '农机共享' },
      { key: '/disaster', icon: <CloudOutlined />, label: '灾害应急' },
      { key: '/policy', icon: <AuditOutlined />, label: '政策党建' },
      { key: '/life', icon: <MedicineBoxOutlined />, label: '生活服务' },
      { key: '/data', icon: <DatabaseOutlined />, label: '数据管理' },
    ],
  },
  {
    key: 'ai',
    icon: <RobotOutlined />,
    label: 'AI 能力',
    children: [
      { key: '/ai-ops', icon: <RobotOutlined />, label: 'AI 运维中心' },
      { key: '/ai', icon: <ExperimentOutlined />, label: 'AI 记录' },
      { key: '/api-debug', icon: <ApiOutlined />, label: 'API 在线调试' },
    ],
  },
  {
    key: 'system',
    icon: <SettingOutlined />,
    label: '系统治理',
    children: [
      { key: '/api-switch', icon: <ControlOutlined />, label: 'API 开关' },
      { key: '/site-images', icon: <PictureOutlined />, label: '站点配图' },
      { key: '/seed-data', icon: <DatabaseOutlined />, label: '初始化数据' },
      { key: '/logs', icon: <SearchOutlined />, label: '操作日志' },
    ],
  },
]

function selectedKeys(pathname) {
  return [pathname === '/' ? '/dashboard' : pathname]
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()
  const [collapsed, setCollapsed] = useState(false)

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        clearSession()
        navigate('/login', { replace: true })
      },
    },
  ]

  return (
    <Layout className="admin-shell">
      <Sider
        width={256}
        breakpoint="lg"
        collapsedWidth={72}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="admin-sider"
      >
        <div className="brand">
          <div className="brand-icon"><HomeOutlined /></div>
          {!collapsed && (
            <div className="brand-text">
              <strong>田园通</strong>
              <span>管理台</span>
            </div>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={selectedKeys(location.pathname)}
          defaultOpenKeys={['business', 'ai', 'system']}
          items={menuItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) navigate(key)
          }}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space size={12}>
            <Button
              className="nav-button"
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={collapsed ? '展开菜单' : '折叠菜单'}
              onClick={() => setCollapsed((value) => !value)}
            />
            <Typography.Text className="page-title">数字乡村助农后台</Typography.Text>
            <Tag color="green">平台数据服务</Tag>
          </Space>
          <Space size={16}>
            <Button type="text" icon={<BellOutlined />} aria-label="通知" />
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
              <Space className="user-menu">
                <Avatar style={{ background: '#167d5b' }}>{(user.nickname || user.username || 'A').slice(0, 1).toUpperCase()}</Avatar>
                <span>{user.nickname || user.username || '管理员'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
