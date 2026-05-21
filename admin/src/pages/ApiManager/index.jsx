import React, { useEffect, useState } from 'react'
import { ProCard } from '@ant-design/pro-components'
import { Badge, Button, Col, Divider, Form, Input, InputNumber, message, Row, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd'
import { SendOutlined, CodeOutlined, ApiOutlined } from '@ant-design/icons'
import { getApiSwitches, toggleApiSwitch, testApi } from '../../services/adminApi'
import { API_DEFINITIONS, CATEGORIES } from '../../config/apiDefinitions'

const { Text, Title } = Typography
const { TextArea } = Input
const METHOD_COLORS = { GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'purple' }

// ── API 开关面板 ──────────────────────────────────────────
function SwitchPanel() {
  const [features, setFeatures] = useState([])
  useEffect(() => { getApiSwitches().then((r) => setFeatures(r.data)) }, [])

  const handleToggle = async (key) => {
    await toggleApiSwitch(key)
    setFeatures((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f))
    message.success('已切换')
  }

  const grouped = features.reduce((acc, f) => {
    ;(acc[f.category] = acc[f.category] || []).push(f)
    return acc
  }, {})

  return (
    <div>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 13, color: '#8B4513' }}>{cat}</Text>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {items.map((f) => (
              <div key={f.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: f.enabled ? '#fff7f0' : '#f9f9f9',
                border: `1px solid ${f.enabled ? '#f0d0b0' : '#eee'}`,
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{f.name}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{f.desc}</Text>
                </div>
                <Switch size="small" checked={f.enabled} onChange={() => handleToggle(f.key)}
                  checkedChildren="开" unCheckedChildren="关" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── API 在线调试面板 ──────────────────────────────────────
function DebugPanel() {
  const [selected, setSelected] = useState(null)
  const [catFilter, setCatFilter] = useState(null)
  const [pathValues, setPathValues] = useState({})
  const [queryValues, setQueryValues] = useState({})
  const [bodyValues, setBodyValues] = useState({})
  const [customToken, setCustomToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [history, setHistory] = useState([])

  const api = API_DEFINITIONS.find((a) => a.id === selected)

  const buildPath = (path) => {
    let p = path
    Object.entries(pathValues).forEach(([k, v]) => { p = p.replace(`:${k}`, v || `:${k}`) })
    return p
  }

  const handleSend = async () => {
    if (!api) return message.warning('请先选择 API')
    setLoading(true)
    try {
      const path = buildPath(api.path)
      const headers = {}
      if (api.requiresAuth || customToken) {
        headers.Authorization = `Bearer ${customToken || localStorage.getItem('admin_token')}`
      }
      const bodyParam = Object.fromEntries(
        Object.entries(bodyValues).filter(([, v]) => v !== '' && v !== undefined)
      )
      const res = await testApi({
        method: api.method,
        path,
        headers,
        query: queryValues,
        body: api.method !== 'GET' ? bodyParam : undefined,
      })
      setResponse(res.data)
      setHistory((prev) => [{ api: api.name, status: res.data?.status, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)])
    } finally {
      setLoading(false)
    }
  }

  const filteredApis = catFilter ? API_DEFINITIONS.filter((a) => a.category === catFilter) : API_DEFINITIONS

  return (
    <Row gutter={16} style={{ height: '100%' }}>
      {/* 左侧：API 列表 */}
      <Col span={8}>
        <div style={{ marginBottom: 8 }}>
          <Select placeholder="按分类筛选" allowClear style={{ width: '100%' }}
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            onChange={setCatFilter} />
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
          {filteredApis.map((api) => (
            <div key={api.id}
              onClick={() => { setSelected(api.id); setPathValues({}); setQueryValues({}); setBodyValues({}); setResponse(null) }}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
                background: selected === api.id ? '#fff7f0' : 'white',
                borderLeft: selected === api.id ? '3px solid #8B4513' : '3px solid transparent',
              }}>
              <Space>
                <Tag color={METHOD_COLORS[api.method]} style={{ minWidth: 48, textAlign: 'center', fontSize: 11 }}>
                  {api.method}
                </Tag>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{api.name}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{api.path}</Text>
                </div>
              </Space>
            </div>
          ))}
        </div>
      </Col>

      {/* 右侧：调试区 */}
      <Col span={16}>
        {!api ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#bbb' }}>
            <ApiOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>点击左侧 API 开始调试</div>
          </div>
        ) : (
          <>
            {/* API 信息 */}
            <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
              <Space wrap>
                <Tag color={METHOD_COLORS[api.method]} style={{ fontSize: 13 }}>{api.method}</Tag>
                <Text code style={{ fontSize: 13 }}>{api.path}</Text>
                {api.requiresAuth && <Tag color="volcano">需要认证</Tag>}
              </Space>
              <div style={{ marginTop: 6, color: '#666', fontSize: 13 }}>{api.desc}</div>
            </div>

            <Tabs size="small" items={[
              // Path Params
              ...(api.pathParams?.length ? [{
                key: 'path', label: 'Path 参数',
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {api.pathParams.map((p) => (
                      <div key={p.name} style={{ marginBottom: 10 }}>
                        <Text strong style={{ fontSize: 12 }}>{p.name}</Text>
                        {p.required && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>必填</Tag>}
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{p.desc}</div>
                        <Input size="small" placeholder={p.example} value={pathValues[p.name] || ''}
                          onChange={(e) => setPathValues((prev) => ({ ...prev, [p.name]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                ),
              }] : []),
              // Query Params
              ...(api.query?.length ? [{
                key: 'query', label: 'Query 参数',
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {api.query.map((p) => (
                      <div key={p.name} style={{ marginBottom: 10 }}>
                        <Text strong style={{ fontSize: 12 }}>{p.name}</Text>
                        {p.required && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>必填</Tag>}
                        <Tag style={{ marginLeft: 4, fontSize: 10 }}>{p.type}</Tag>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{p.desc}</div>
                        <Input size="small" placeholder={`示例: ${p.example}`} value={queryValues[p.name] || ''}
                          onChange={(e) => setQueryValues((prev) => ({ ...prev, [p.name]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                ),
              }] : []),
              // Body
              ...(api.body?.length ? [{
                key: 'body', label: 'Body 参数',
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {api.body.map((p) => (
                      <div key={p.name} style={{ marginBottom: 10 }}>
                        <Text strong style={{ fontSize: 12 }}>{p.name}</Text>
                        {p.required && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>必填</Tag>}
                        <Tag style={{ marginLeft: 4, fontSize: 10 }}>{p.type}</Tag>
                        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{p.desc}</div>
                        {p.type === 'array' || p.example?.startsWith('[') ? (
                          <TextArea rows={2} placeholder={p.example} value={bodyValues[p.name] || ''}
                            onChange={(e) => setBodyValues((prev) => ({ ...prev, [p.name]: e.target.value }))} />
                        ) : (
                          <Input size="small" placeholder={`示例: ${p.example}`} value={bodyValues[p.name] || ''}
                            onChange={(e) => setBodyValues((prev) => ({ ...prev, [p.name]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                  </div>
                ),
              }] : []),
              // Auth
              {
                key: 'auth', label: '认证',
                children: (
                  <div style={{ padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Bearer Token（留空则使用当前管理员 Token）</Text>
                    <Input.TextArea rows={2} placeholder="eyJ..." value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)} style={{ marginTop: 8, fontFamily: 'monospace' }} />
                  </div>
                ),
              },
            ]} />

            <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSend}
              style={{ background: '#8B4513', marginTop: 8, width: '100%' }}>
              发送请求
            </Button>

            {/* 响应 */}
            {response && (
              <div style={{ marginTop: 12 }}>
                <Space style={{ marginBottom: 6 }}>
                  <Badge status={response.status < 300 ? 'success' : 'error'} />
                  <Text strong>HTTP {response.status}</Text>
                  <Text type="secondary">{response.statusText}</Text>
                  <Tag>{response.duration}ms</Tag>
                </Space>
                <div style={{
                  background: '#1e1e1e', color: '#d4d4d4', borderRadius: 6,
                  padding: 12, maxHeight: 260, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12,
                }}>
                  <pre style={{ margin: 0 }}>{JSON.stringify(response.body, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* 请求历史 */}
            {history.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>最近请求</Text>
                {history.map((h, i) => (
                  <Space key={i} style={{ display: 'flex', marginTop: 4 }}>
                    <Badge status={h.status < 300 ? 'success' : 'error'} />
                    <Text style={{ fontSize: 11 }}>{h.api}</Text>
                    <Tag style={{ fontSize: 10 }}>{h.status}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>{h.time}</Text>
                  </Space>
                ))}
              </div>
            )}
          </>
        )}
      </Col>
    </Row>
  )
}

// ── 主页面 ────────────────────────────────────────────────
export default function ApiManager() {
  return (
    <Tabs
      defaultActiveKey="debug"
      size="large"
      items={[
        {
          key: 'debug',
          label: <span><CodeOutlined /> API 在线调试</span>,
          children: (
            <ProCard style={{ borderRadius: 8 }}>
              <DebugPanel />
            </ProCard>
          ),
        },
        {
          key: 'switch',
          label: <span><ApiOutlined /> API 功能开关</span>,
          children: (
            <ProCard style={{ borderRadius: 8 }}>
              <SwitchPanel />
            </ProCard>
          ),
        },
      ]}
    />
  )
}
