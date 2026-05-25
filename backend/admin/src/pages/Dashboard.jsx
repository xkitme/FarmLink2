import {
  ApiOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FieldTimeOutlined,
  FireOutlined,
  RobotOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Card, Col, Empty, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/request.js'

const cardMeta = [
  { key: 'userCount', title: '用户总数', icon: <TeamOutlined />, suffix: '人' },
  { key: 'plotCount', title: '地块数量', icon: <FieldTimeOutlined />, suffix: '块' },
  { key: 'totalAreaMu', title: '管理面积', icon: <DatabaseOutlined />, suffix: '亩' },
  { key: 'recordCount', title: '农事记录', icon: <CheckCircleOutlined />, suffix: '条' },
  { key: 'orderAmount', title: '订单金额', icon: <ShoppingCartOutlined />, prefix: '¥' },
  { key: 'disasterLoss', title: '灾损估算', icon: <FireOutlined />, prefix: '¥' },
  { key: 'policyCount', title: '政策条目', icon: <CloudServerOutlined />, suffix: '条' },
  { key: 'aiCallCount', title: 'AI 记录', icon: <RobotOutlined />, suffix: '次' },
]

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)
  const [switches, setSwitches] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [dash, ai, sw] = await Promise.all([
        api.get('/data/dashboard'),
        api.get('/ai/status'),
        api.get('/admin/api-switch/list', { pageSize: 6 }),
      ])
      if (mounted) {
        setDashboard(dash)
        setAiStatus(ai)
        setSwitches(sw.records || [])
        setLoading(false)
      }
    }
    load().catch(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  const cards = dashboard?.cards || {}
  const cropColumns = useMemo(() => [
    { title: '作物', dataIndex: 'cropType' },
    { title: '面积', dataIndex: 'areaMu', render: (v) => `${v} 亩` },
    { title: '地块', dataIndex: 'plots', render: (v) => `${v} 块` },
  ], [])

  if (loading) {
    return <div className="center-loading"><Spin size="large" /></div>
  }

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>运营驾驶舱</Typography.Title>
          <Typography.Text type="secondary">平台数据、AI 服务与治理能力统一汇总。</Typography.Text>
        </div>
        <Space>
          <Tag color={aiStatus?.ollama?.online ? 'green' : 'gold'} icon={<ExperimentOutlined />}>
            {aiStatus?.ollama?.online ? '智能模型在线' : 'AI 服务运行中'}
          </Tag>
          <Tag color="blue" icon={<ApiOutlined />}>API 已接入</Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {cardMeta.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.key}>
            <Card className="metric-card">
              <Statistic
                title={item.title}
                value={cards[item.key] ?? 0}
                prefix={item.prefix || item.icon}
                suffix={item.suffix}
                precision={Number.isInteger(cards[item.key]) ? 0 : 2}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="作物面积分布" className="panel-card">
            {dashboard?.cropArea?.length
              ? <Table rowKey="cropType" size="small" pagination={false} columns={cropColumns} dataSource={dashboard.cropArea} />
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="API 开关概览" className="panel-card">
            <Space wrap>
              {switches.map((item) => (
                <Tag key={item.id} color={item.enabled ? 'green' : 'red'}>
                  {item.name}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="服务状态" className="panel-card">
        <Space size={24} wrap>
          <Tag color="green">数据库：{dashboard?.offlineReady?.database || 'SQLite'}</Tag>
          <Tag color="green">模式：{dashboard?.offlineReady?.mode || 'DATA_SERVICE'}</Tag>
          <Tag color="blue">AI：{aiStatus?.fallback?.engine || 'SQLite RAG + rules'}</Tag>
        </Space>
      </Card>
    </Space>
  )
}
