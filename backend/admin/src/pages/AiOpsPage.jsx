import {
  ApiOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  ExperimentOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { API_BASE, api } from '../api/request.js'

const sceneOptions = [
  { label: '综合知识', value: 'GENERAL' },
  { label: '政策服务', value: 'POLICY' },
  { label: '农业生产', value: 'AGRI' },
  { label: '法律咨询', value: 'LEGAL' },
]

function formatBytes(value) {
  if (!value) return '-'
  const gb = value / 1024 / 1024 / 1024
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function compactText(value, limit = 64) {
  const text = String(value || '')
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

function formatDateTime(value) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '-'
}

function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number * 100).toFixed(1)}%`
}

function formatConfidence(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  const percent = number <= 1 ? number * 100 : number
  return `${percent.toFixed(0)}%`
}

function buildUploadUrl(imageUrl) {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const apiOrigin = new URL(API_BASE, window.location.origin).origin
  const path = String(imageUrl).startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${apiOrigin}${path}`
}

const detectImageStyle = {
  width: 48,
  height: 48,
  borderRadius: 4,
  objectFit: 'cover',
}

const detectImageFallbackStyle = {
  ...detectImageStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5f5f5',
  color: '#999',
  fontSize: 12,
}

function DetectImage({ imageUrl }) {
  const [failed, setFailed] = useState(false)
  const src = buildUploadUrl(imageUrl)
  if (!src || failed) return <span style={detectImageFallbackStyle}>无图</span>
  return <img src={src} style={detectImageStyle} alt="识别图片" onError={() => setFailed(true)} />
}

export default function AiOpsPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(null)
  const [version, setVersion] = useState(null)
  const [qaRows, setQaRows] = useState([])
  const [detectRows, setDetectRows] = useState([])
  const [switches, setSwitches] = useState([])
  const [keyword, setKeyword] = useState('水稻补贴')
  const [scene, setScene] = useState('POLICY')
  const [searching, setSearching] = useState(false)
  const [references, setReferences] = useState([])

  async function load() {
    setLoading(true)
    try {
      const [aiStatus, modelVersion, qa, sw, detect] = await Promise.all([
        api.get('/ai/status'),
        api.get('/ai/model/version'),
        api.get('/admin/resource/aiQaRecord/list', { pageNum: 1, pageSize: 6 }),
        api.get('/admin/api-switch/list', { category: 'AI功能', pageNum: 1, pageSize: 20 }),
        api.get('/admin/resource/aiDetectRecord/list', { pageNum: 1, pageSize: 6 }),
      ])
      setStatus(aiStatus)
      setVersion(modelVersion)
      setQaRows(qa.records || [])
      setDetectRows(detect.records || [])
      setSwitches(sw.records || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [])

  async function searchKnowledge() {
    const text = keyword.trim()
    if (!text) {
      message.warning('请输入检索关键词')
      return
    }
    setSearching(true)
    try {
      const result = await api.get('/ai/kb/search', { keyword: text, scene, limit: 8 })
      setReferences(result.references || [])
      message.success('知识库检索完成')
    } finally {
      setSearching(false)
    }
  }

  async function copyEnvTemplate() {
    const current = version?.current || {}
    const text = [
      `OLLAMA_BASE_URL=${status?.ollama?.baseUrl || 'http://localhost:11434'}`,
      `OLLAMA_PRIMARY_MODEL=${current.primaryModel || ''}`,
      `OLLAMA_VISION_MODEL=${current.visionModel || ''}`,
      `OLLAMA_EMBED_MODEL=${current.embedModel || ''}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    message.success('配置模板已复制')
  }

  const modelRows = useMemo(() => {
    const current = version?.current || {}
    const ollama = status?.ollama || {}
    return [
      { key: 'primaryModel', type: '问答模型', model: current.primaryModel, warm: Boolean(ollama.primaryWarm) },
      { key: 'visionModel', type: '视觉模型', model: current.visionModel, warm: Boolean(ollama.visionWarm) },
      { key: 'embedModel', type: '检索模型', model: current.embedModel },
    ].filter((item) => item.model)
  }, [status, version])

  const modelColumns = [
    {
      title: '用途',
      dataIndex: 'type',
      width: 170,
      render: (value, row) => (
        <Space size={6}>
          <span>{value}</span>
          {row.warm !== undefined && <Tag color={row.warm ? 'green' : 'default'}>{row.warm ? '已暖机' : '未暖机'}</Tag>}
        </Space>
      ),
    },
    { title: '模型', dataIndex: 'model', render: (value) => <Tag color="blue">{value}</Tag> },
  ]

  const installedColumns = [
    { title: '模型名称', dataIndex: 'name', render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: '大小', dataIndex: 'size', width: 120, render: formatBytes },
    { title: '更新时间', dataIndex: 'modifiedAt', width: 180, render: formatDateTime },
  ]

  const qaColumns = [
    { title: '场景', dataIndex: 'scene', width: 100, render: (value) => <Tag>{value}</Tag> },
    { title: '问题', dataIndex: 'question', ellipsis: true, render: (value) => compactText(value, 42) },
    { title: '模型', dataIndex: 'modelUsed', width: 180, ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: formatDateTime },
  ]

  const detectColumns = [
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 70,
      render: (value) => <DetectImage imageUrl={value} />,
    },
    {
      title: '识别结果',
      dataIndex: 'resultLabel',
      ellipsis: true,
      render: (value) => <Tag color={value === '无法识别' ? 'red' : 'green'}>{value || '未知'}</Tag>,
    },
    { title: '置信度', dataIndex: 'confidence', width: 90, render: formatConfidence },
    {
      title: '反馈',
      dataIndex: 'feedback',
      width: 80,
      render: (value) => {
        if (value === null || value === undefined) return '-'
        const feedback = Number(value)
        if (feedback === 1) return <Tag color="green">准</Tag>
        if (feedback === 0) return <Tag color="red">不准</Tag>
        if (feedback === 2) return <Tag color="gold">不确定</Tag>
        return '-'
      },
    },
    { title: '时间', dataIndex: 'createdAt', width: 170, render: formatDateTime },
  ]

  const referenceColumns = [
    { title: '来源', dataIndex: 'source', width: 150, render: (value) => value || '知识库' },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '内容片段', dataIndex: 'content', ellipsis: true, render: (value) => compactText(value, 72) },
    { title: '相关度', dataIndex: 'score', width: 100, render: (value) => value ?? '-' },
  ]

  if (loading) return <div className="center-loading"><Spin size="large" /></div>

  const counters = status?.counters || {}
  const detect24h = status?.detect24h || {}
  const online = Boolean(status?.ollama?.online)
  const feedbackTotal24h = (detect24h.feedbackCorrect || 0) + (detect24h.feedbackIncorrect || 0)
  const feedbackAccuracy = feedbackTotal24h
    ? `${((detect24h.feedbackCorrect / feedbackTotal24h) * 100).toFixed(1)}%`
    : '-'

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>AI 运维中心</Typography.Title>
          <Typography.Text type="secondary">统一查看 AI 服务状态、模型配置、知识库检索与调用记录。</Typography.Text>
        </div>
        <Space>
          <Tag color={online ? 'green' : 'gold'} icon={<ExperimentOutlined />}>
            {online ? '模型服务在线' : 'AI 服务运行中'}
          </Tag>
          <Button icon={<CopyOutlined />} onClick={copyEnvTemplate}>复制配置模板</Button>
          <Button icon={<RobotOutlined />} onClick={load}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="问答记录" value={counters.qaCount || 0} suffix="条" prefix={<RobotOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="识别记录" value={counters.detectCount || 0} suffix="条" prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="24h 识别率" value={formatPercent(detect24h.recognizeRate || 0)} suffix={`24h 共 ${detect24h.total || 0} 条`} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="反馈准确率" value={feedbackAccuracy} suffix={`共 ${counters.detectFeedbackTotal || 0} 条反馈`} prefix={<CheckCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="知识切片" value={counters.policyChunks || 0} suffix="段" prefix={<SearchOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="metric-card"><Statistic title="AI 开关" value={switches.filter((item) => item.enabled).length} suffix={`/ ${switches.length}`} prefix={<ApiOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="模型配置" className="panel-card">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="服务地址">{status?.ollama?.baseUrl || '-'}</Descriptions.Item>
              <Descriptions.Item label="服务能力">{status?.capability?.engine || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态说明">{status?.capability?.message || '-'}</Descriptions.Item>
            </Descriptions>
            <Table rowKey="key" size="small" pagination={false} columns={modelColumns} dataSource={modelRows} style={{ marginTop: 16 }} />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="已识别模型" className="panel-card">
            {(status?.ollama?.models || []).length ? (
              <Table rowKey="name" size="small" pagination={false} columns={installedColumns} dataSource={status.ollama.models} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模型列表，仍可使用平台智能服务" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="知识库检索" className="panel-card">
        <Space.Compact className="full-control">
          <Select value={scene} options={sceneOptions} onChange={setScene} style={{ width: 150 }} />
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={searchKnowledge} placeholder="输入关键词，例如 水稻补贴" />
          <Button type="primary" icon={<SearchOutlined />} loading={searching} onClick={searchKnowledge}>检索</Button>
        </Space.Compact>
        <Table
          rowKey={(record, index) => `${record.source || 'kb'}-${record.title || index}-${index}`}
          size="small"
          columns={referenceColumns}
          dataSource={references}
          pagination={false}
          scroll={{ x: 900 }}
          style={{ marginTop: 16 }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="最近问答记录" className="panel-card">
            <Table rowKey="id" size="small" columns={qaColumns} dataSource={qaRows} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="最近识别记录" className="panel-card">
            <Table rowKey="id" size="small" columns={detectColumns} dataSource={detectRows} pagination={false} scroll={{ x: 640 }} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="AI 功能开关" className="panel-card">
            <Space wrap>
              {switches.map((item) => <Tag key={item.id} color={item.enabled ? 'green' : 'default'}>{item.name}</Tag>)}
              {!switches.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 AI 开关数据" />}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
