import {
  CheckCircleOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { message } from '../api/feedback.js'
import { api } from '../api/request.js'

function formatTime(value) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '-'
}

export default function SeedDataPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setSummary(await api.get('/admin/seed/summary'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [])

  async function copyCommand(command) {
    await navigator.clipboard.writeText(command)
    message.success('命令已复制')
  }

  const resourceRows = useMemo(() => {
    const rows = []
    for (const group of summary?.groups || []) {
      for (const item of group.resources || []) {
        rows.push({ ...item, groupTitle: group.title })
      }
    }
    return rows
  }, [summary])

  const groupColumns = [
    { title: '板块', dataIndex: 'title' },
    { title: '资源数', dataIndex: 'resources', width: 100, render: (value) => `${value?.length || 0} 项` },
    { title: '有数据项', dataIndex: 'readyCount', width: 110, render: (value, record) => `${value} / ${record.resources?.length || 0}` },
    {
      title: '状态',
      dataIndex: 'readyCount',
      width: 100,
      render: (value, record) => value === record.resources?.length ? <Tag color="green">完整</Tag> : <Tag color="gold">待补齐</Tag>,
    },
  ]

  const resourceColumns = [
    { title: '板块', dataIndex: 'groupTitle', width: 150, render: (value) => <Tag color="blue">{value}</Tag> },
    { title: '资源', dataIndex: 'title', width: 160 },
    { title: '模型', dataIndex: 'model', width: 180, render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: '记录数', dataIndex: 'count', width: 110, render: (value) => value ?? '-' },
    { title: '状态', dataIndex: 'ready', width: 100, render: (value) => value ? <Tag color="green">有数据</Tag> : <Tag color="gold">待补齐</Tag> },
  ]

  if (loading) return <div className="center-loading"><Spin size="large" /></div>

  const data = summary?.summary || {}
  const commands = summary?.commands || {}

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>初始化数据中心</Typography.Title>
          <Typography.Text type="secondary">查看平台基础数据覆盖情况，辅助维护初始化脚本和演示数据包。</Typography.Text>
        </div>
        <Space>
          <Tag color="green" icon={<CheckCircleOutlined />}>数据服务正常</Tag>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="业务板块" value={data.groupCount || 0} suffix="个" prefix={<DatabaseOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="资源配置" value={data.resourceCount || 0} suffix="项" prefix={<FileSearchOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="数据记录" value={data.recordCount || 0} suffix="条" prefix={<DatabaseOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="API 开关" value={data.enabledSwitchCount || 0} suffix={`/ ${data.apiSwitchCount || 0}`} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="板块数据概览" className="panel-card">
            {(summary?.groups || []).length ? (
              <Table rowKey="key" size="small" pagination={false} columns={groupColumns} dataSource={summary.groups} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="维护信息" className="panel-card">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="统计时间">{formatTime(summary?.generatedAt)}</Descriptions.Item>
              <Descriptions.Item label="初始化脚本">{summary?.files?.seedScript || '-'}</Descriptions.Item>
              <Descriptions.Item label="数据结构">{summary?.files?.schema || '-'}</Descriptions.Item>
              <Descriptions.Item label="数据文件">{summary?.files?.database || '-'}</Descriptions.Item>
            </Descriptions>
            <Space wrap style={{ marginTop: 16 }}>
              <Button icon={<CopyOutlined />} onClick={() => copyCommand(commands.installAll)}>复制依赖安装命令</Button>
              <Button icon={<CopyOutlined />} onClick={() => copyCommand(commands.migrate)}>复制结构同步命令</Button>
              <Button icon={<CopyOutlined />} onClick={() => copyCommand(commands.seed)}>复制初始化命令</Button>
              <Button icon={<CopyOutlined />} onClick={() => copyCommand(commands.start)}>复制启动命令</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="资源明细" className="panel-card">
        <Table rowKey={(record) => `${record.groupTitle}-${record.key}`} size="small" columns={resourceColumns} dataSource={resourceRows} scroll={{ x: 900 }} pagination={{ pageSize: 12 }} />
      </Card>

      <Collapse
        className="panel-card"
        items={[
          {
            key: 'notes',
            label: '维护说明',
            children: (
              <Space direction="vertical">
                {(summary?.notes || []).map((item) => <Typography.Text key={item}>{item}</Typography.Text>)}
              </Space>
            ),
          },
        ]}
      />
    </Space>
  )
}
