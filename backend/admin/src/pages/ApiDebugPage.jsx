import {
  ApiOutlined,
  CopyOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useMemo, useState } from 'react'
import { rawRequest } from '../api/request.js'
import { API_CATALOG, flatApiCatalog } from '../apiCatalog.js'

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'].map((method) => ({ label: method, value: method }))

function pretty(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function parseJson(label, value, fallback) {
  const text = String(value || '').trim()
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${error.message}`)
  }
}

function methodColor(method) {
  if (method === 'GET') return 'green'
  if (method === 'POST') return 'blue'
  if (method === 'PUT') return 'orange'
  if (method === 'DELETE') return 'red'
  return 'default'
}

function statusColor(status) {
  if (!status) return 'default'
  if (status >= 500) return 'red'
  if (status >= 400) return 'orange'
  return 'green'
}

export default function ApiDebugPage() {
  const presets = useMemo(() => flatApiCatalog(), [])
  const presetMap = useMemo(() => Object.fromEntries(presets.map((item) => [item.key, item])), [presets])
  const firstPreset = presets[0]
  const [presetKey, setPresetKey] = useState(firstPreset.key)
  const [method, setMethod] = useState(firstPreset.method)
  const [path, setPath] = useState(firstPreset.path)
  const [headersText, setHeadersText] = useState('{}')
  const [bodyText, setBodyText] = useState(pretty(firstPreset.body))
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const currentPreset = presetMap[presetKey]
  const presetOptions = API_CATALOG.map((group) => ({
    label: group.group,
    options: group.items.map((item) => ({
      label: `${item.method} ${item.name}`,
      value: item.key,
    })),
  }))

  function applyPreset(key) {
    const preset = presetMap[key]
    setPresetKey(key)
    setMethod(preset.method)
    setPath(preset.path)
    setHeadersText(pretty(preset.headers || {}))
    setBodyText(pretty(preset.body))
    setResult(null)
  }

  async function send() {
    let headers
    let body
    try {
      headers = parseJson('请求头', headersText, {})
      body = method === 'GET' || method === 'HEAD' ? undefined : parseJson('请求体', bodyText, undefined)
    } catch (error) {
      message.error(error.message)
      return
    }

    setSending(true)
    try {
      const response = await rawRequest(path, { method, headers, body })
      setResult(response)
      if (response.ok && response.data?.code === 200) message.success('请求成功')
      else message.warning(`请求完成，状态 ${response.status}`)
    } catch (error) {
      message.error(error.message || '请求失败')
    } finally {
      setSending(false)
    }
  }

  async function copyResponse() {
    if (!result) return
    await navigator.clipboard.writeText(pretty(result.data || result.rawText))
    message.success('响应内容已复制')
  }

  const presetColumns = [
    {
      title: '分组',
      dataIndex: 'group',
      width: 150,
      render: (value) => <Tag color="geekblue">{value}</Tag>,
    },
    {
      title: '接口',
      dataIndex: 'name',
      width: 160,
    },
    {
      title: '方法',
      dataIndex: 'method',
      width: 90,
      render: (value) => <Tag color={methodColor(value)}>{value}</Tag>,
    },
    {
      title: '路径',
      dataIndex: 'path',
      ellipsis: true,
    },
    {
      title: '鉴权',
      dataIndex: 'auth',
      width: 90,
      render: (value) => value ? <Tag color="orange">需要</Tag> : <Tag>可匿名</Tag>,
    },
    {
      title: '需要传什么',
      dataIndex: 'bodyNote',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Button size="small" onClick={() => applyPreset(record.key)}>填入</Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>API 在线调试</Typography.Title>
          <Typography.Text type="secondary">内置常用接口模板，能直接看到请求路径、请求体、响应和 Trace ID。</Typography.Text>
        </div>
        <Tag color="blue" icon={<ApiOutlined />}>/api/v1</Tag>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            className="panel-card"
            title="请求配置"
            extra={<Button icon={<ReloadOutlined />} onClick={() => applyPreset(presetKey)}>重置模板</Button>}
          >
            <Space direction="vertical" size={12} className="debug-form">
              <div>
                <Typography.Text strong>接口模板</Typography.Text>
                <Select
                  className="full-control"
                  value={presetKey}
                  options={presetOptions}
                  onChange={applyPreset}
                />
              </div>

              <Row gutter={10}>
                <Col span={8}>
                  <Typography.Text strong>方法</Typography.Text>
                  <Select className="full-control" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
                </Col>
                <Col span={16}>
                  <Typography.Text strong>路径</Typography.Text>
                  <Input value={path} onChange={(event) => setPath(event.target.value)} />
                </Col>
              </Row>

              <Card size="small" className="inline-info-card">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="说明">{currentPreset?.description || '-'}</Descriptions.Item>
                  <Descriptions.Item label="鉴权">{currentPreset?.auth ? '需要登录 Token，管理台会自动携带' : '可匿名调用，若已登录也会自动携带 Token'}</Descriptions.Item>
                  <Descriptions.Item label="需要传什么">{currentPreset?.bodyNote || '按接口文档填写 JSON 请求体或 query 参数'}</Descriptions.Item>
                </Descriptions>
              </Card>

              <div>
                <Typography.Text strong>额外请求头 JSON</Typography.Text>
                <Input.TextArea
                  rows={3}
                  value={headersText}
                  onChange={(event) => setHeadersText(event.target.value)}
                  spellCheck={false}
                />
              </div>

              <div>
                <Typography.Text strong>请求体 JSON</Typography.Text>
                <Input.TextArea
                  rows={method === 'GET' ? 5 : 10}
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  disabled={method === 'GET'}
                  spellCheck={false}
                />
              </div>

              <Button type="primary" size="large" icon={<SendOutlined />} loading={sending} onClick={send}>
                发送请求
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            className="panel-card"
            title="响应结果"
            extra={<Button icon={<CopyOutlined />} disabled={!result} onClick={copyResponse}>复制响应</Button>}
          >
            {!result ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="发送请求后显示响应" />
            ) : (
              <Space direction="vertical" size={12} className="debug-result">
                <Space wrap>
                  <Tag color={statusColor(result.status)}>HTTP {result.status} {result.statusText}</Tag>
                  <Tag color={result.data?.code === 200 ? 'green' : 'orange'}>业务码 {result.data?.code ?? '-'}</Tag>
                  <Tag color="blue">{result.durationMs} ms</Tag>
                  {result.data?.traceId && <Tag>Trace {result.data.traceId}</Tag>}
                </Space>
                <pre className="debug-pre">{pretty(result.data || result.rawText)}</pre>
                <Collapse
                  size="small"
                  items={[
                    {
                      key: 'headers',
                      label: '响应头',
                      children: <pre className="detail-pre">{pretty(result.headers)}</pre>,
                    },
                  ]}
                />
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Card className="panel-card" title="接口模板总览">
        <Table
          rowKey="key"
          size="small"
          columns={presetColumns}
          dataSource={presets}
          scroll={{ x: 1050 }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />
      </Card>
    </Space>
  )
}
