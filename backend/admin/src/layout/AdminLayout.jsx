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
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Menu, Space, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser } from '../api/auth.js'
import { API_BASE, api, rawRequest } from '../api/request.js'

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
      { key: '/ai-assistant', icon: <ControlOutlined />, label: '语音助手配置' },
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
      { key: '/security', icon: <SafetyCertificateOutlined />, label: '账号安全' },
      { key: '/logs', icon: <SearchOutlined />, label: '操作日志' },
    ],
  },
]

function selectedKeys(pathname) {
  return [pathname === '/' ? '/dashboard' : pathname]
}

function resolveUrl(imageUrl) {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const apiOrigin = new URL(API_BASE, window.location.origin).origin
  const path = String(imageUrl).startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${apiOrigin}${path}`
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()
  const [collapsed, setCollapsed] = useState(false)
  const [brandLogo, setBrandLogo] = useState('')

  useEffect(() => {
    api.get('/site/images')
      .then((data) => {
        const url = resolveUrl(data?.images?.['farmlink-mark'])
        if (url) setBrandLogo(`${url}?t=${Date.now()}`)
      })
      .catch(() => {})
  }, [])

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: async () => {
        try {
          const response = await rawRequest('/auth/logout', { method: 'POST' })
          if (response.ok && response.data?.code === 200) {
            clearSession()
            navigate('/login?reason=logout', { replace: true })
            return
          }
          message.error(response.data?.msg || '退出未完成，请重试')
        } catch {
          message.error('退出未完成，请重试')
        }
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
          <div className="brand-icon">
            {brandLogo ? <img src={brandLogo} alt="田园通品牌标识" /> : <span>田</span>}
          </div>
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
      <Layout className="admin-main">
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
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" trigger={['click']}>
              <Space className="user-menu" role="button" tabIndex={0}>
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
