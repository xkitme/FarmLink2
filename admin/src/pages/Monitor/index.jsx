import React, { useEffect, useState } from 'react'
import { ProCard } from '@ant-design/pro-components'
import { Badge, Button, Col, Descriptions, Progress, Row, Space, Statistic, Tag, Typography, message } from 'antd'
import { ReloadOutlined, DatabaseOutlined, CloudServerOutlined, RobotOutlined, ApiOutlined } from '@ant-design/icons'
import { getSystemHealth } from '../../services/adminApi'

const { Text, Title } = Typography

export default function Monitor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await getSystemHealth()
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const services = data?.services
  const system = data?.system
  const db = data?.db

  const memPercent = system
    ? Math.round(((system.totalMemMB - system.freeMemMB) / system.totalMemMB) * 100)
    : 0

  const statusColor = (s) => s === 'ok' ? 'success' : 'error'
  const statusText = (s) => s === 'ok' ? '正常' : '离线'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>系统监控</Title>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetch}>刷新</Button>
      </div>

      {/* 服务状态 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { name: '后端服务', icon: <CloudServerOutlined />, key: 'backend',
            extra: services?.backend?.uptime != null ? `运行 ${Math.floor(services.backend.uptime / 3600)}h ${Math.floor((services.backend.uptime % 3600) / 60)}m` : '' },
          { name: 'SQLite 数据库', icon: <DatabaseOutlined />, key: 'database',
            extra: services?.database?.size || '' },
          { name: 'Ollama AI', icon: <RobotOutlined />, key: 'ollama', extra: '' },
        ].map((s) => (
          <Col span={8} key={s.key}>
            <ProCard bodyStyle={{ padding: '16px 20px' }}
              style={{ borderTop: `3px solid ${services?.[s.key]?.status === 'ok' ? '#52c41a' : '#ff4d4f'}`, borderRadius: 8 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space>
                  <span style={{ fontSize: 18, color: services?.[s.key]?.status === 'ok' ? '#52c41a' : '#ff4d4f' }}>{s.icon}</span>
                  <Text strong>{s.name}</Text>
                </Space>
                <Space>
                  <Badge status={statusColor(services?.[s.key]?.status)} text={statusText(services?.[s.key]?.status)} />
                  {s.extra && <Text type="secondary" style={{ fontSize: 12 }}>{s.extra}</Text>}
                </Space>
              </Space>
            </ProCard>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        {/* 系统资源 */}
        <Col span={12}>
          <ProCard title="系统资源" style={{ borderRadius: 8, marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Node.js">{system?.nodeVersion || '—'}</Descriptions.Item>
              <Descriptions.Item label="平台">{system?.platform || '—'}</Descriptions.Item>
              <Descriptions.Item label="CPU 核数">{system?.cpus || '—'}</Descriptions.Item>
              <Descriptions.Item label="主机名">{system?.hostname || '—'}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 13 }}>内存使用</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {system ? `${system.totalMemMB - system.freeMemMB} / ${system.totalMemMB} MB` : '—'}
                </Text>
              </div>
              <Progress percent={memPercent} strokeColor="#8B4513" size="small" />
            </div>
          </ProCard>
        </Col>

        {/* 数据库统计 */}
        <Col span={12}>
          <ProCard title="数据库概览" style={{ borderRadius: 8, marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}><Statistic title="用户" value={db?.userCount ?? 0} /></Col>
              <Col span={8}><Statistic title="内容" value={db?.contentCount ?? 0} /></Col>
              <Col span={8}><Statistic title="作品" value={db?.workCount ?? 0} /></Col>
            </Row>
            <div style={{ marginTop: 16, background: '#fafafa', borderRadius: 6, padding: '8px 12px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>数据库文件大小：</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>{services?.database?.size || '—'}</Tag>
            </div>
          </ProCard>
        </Col>
      </Row>

      {/* API 状态 */}
      <ProCard title="API 端点状态" style={{ borderRadius: 8 }}>
        <Row gutter={[12, 12]}>
          {[
            { path: 'GET /api/contents', name: '内容列表' },
            { path: 'POST /api/auth/login', name: '用户登录' },
            { path: 'POST /api/ai/chat', name: 'AI 对话' },
            { path: 'GET /api/learning/today', name: '今日任务' },
            { path: 'GET /api/community/works', name: '社区作品' },
            { path: 'GET /api/achievements', name: '成就列表' },
            { path: 'GET /api/search', name: '搜索' },
            { path: 'GET /health', name: '健康检查' },
          ].map((e) => (
            <Col span={6} key={e.path}>
              <div style={{ background: '#f6f6f6', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <Text style={{ fontSize: 12, fontWeight: 500 }}>{e.name}</Text>
                  <div><Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{e.path}</Text></div>
                </div>
                <Badge status="success" />
              </div>
            </Col>
          ))}
        </Row>
      </ProCard>
    </div>
  )
}
