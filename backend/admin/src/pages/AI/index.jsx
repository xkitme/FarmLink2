import React, { useEffect, useRef, useState } from 'react'
import { ProCard, ProTable } from '@ant-design/pro-components'
import { Badge, Button, Col, Descriptions, Popconfirm, Row, Space, Statistic, Switch, Tag, Typography, message } from 'antd'
import { RobotOutlined, DeleteOutlined } from '@ant-design/icons'
import { getAIStatus, getAIStats, getConversations, deleteConversation, getApiSwitches, toggleApiSwitch } from '../../services/adminApi'
import dayjs from 'dayjs'

const { Text } = Typography

function AIStatusCard() {
  const [status, setStatus] = useState(null)
  const [stats, setStats] = useState(null)
  useEffect(() => {
    getAIStatus().then((r) => setStatus(r.data))
    getAIStats().then((r) => setStats(r.data))
  }, [])

  return (
    <ProCard title={<Space><RobotOutlined /> AI 服务状态</Space>} style={{ marginBottom: 16 }}>
      <Row gutter={24}>
        <Col span={8}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Ollama 状态">
              <Badge status={status?.online ? 'success' : 'error'} text={status?.online ? '在线' : '离线'} />
            </Descriptions.Item>
            <Descriptions.Item label="主模型">
              <Tag color="orange">{status?.primaryModel || '—'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="视觉模型">
              <Tag color="purple">{status?.visionModel || '—'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={16}>
          <Row gutter={16}>
            <Col span={8}><Statistic title="对话总数" value={stats?.total ?? 0} /></Col>
            <Col span={8}><Statistic title="今日对话" value={stats?.todayCount ?? 0} /></Col>
            <Col span={8}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>功能分布</div>
              {stats?.modeStats?.map((m) => (
                <Tag key={m.mode} color="blue" style={{ marginBottom: 4 }}>
                  {m.mode || '未知'}: {m._count.id}
                </Tag>
              ))}
            </Col>
          </Row>
        </Col>
      </Row>
    </ProCard>
  )
}

function AISwitches() {
  const [features, setFeatures] = useState([])
  useEffect(() => {
    getApiSwitches().then((r) => setFeatures(r.data.filter((f) => f.category === 'AI功能')))
  }, [])

  const handleToggle = async (key) => {
    await toggleApiSwitch(key)
    setFeatures((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f))
    message.success('已切换')
  }

  return (
    <ProCard title="AI 功能开关" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 12]}>
        {features.map((f) => (
          <Col span={8} key={f.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fafafa', borderRadius: 8, padding: '10px 14px' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{f.name}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{f.desc}</Text>
              </div>
              <Switch checked={f.enabled} onChange={() => handleToggle(f.key)}
                checkedChildren="开" unCheckedChildren="关" />
            </div>
          </Col>
        ))}
      </Row>
    </ProCard>
  )
}

export default function AI() {
  const ref = useRef()

  const columns = [
    { title: '用户', dataIndex: ['user', 'nickname'], width: 100 },
    { title: '模式', dataIndex: 'mode', width: 100,
      render: (v) => <Tag color="blue">{v || 'guide'}</Tag> },
    { title: '人物', dataIndex: 'character', width: 80,
      render: (v) => v ? <Tag>{v}</Tag> : '—' },
    { title: '消息条数', dataIndex: 'messages', width: 90,
      render: (v) => { try { return JSON.parse(v)?.length ?? 0 } catch { return '?' } } },
    { title: '时间', dataIndex: 'createdAt', width: 140,
      render: (v) => dayjs(v).format('MM-DD HH:mm:ss') },
    { title: '操作', width: 80, fixed: 'right',
      render: (_, r) => (
        <Popconfirm title="删除此对话记录？" onConfirm={async () => {
          await deleteConversation(r.id); message.success('已删除'); ref.current?.reload()
        }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <AIStatusCard />
      <AISwitches />
      <ProTable
        actionRef={ref}
        rowKey="id"
        headerTitle="对话记录"
        columns={columns}
        request={async (params) => {
          const res = await getConversations({ page: params.current, pageSize: params.pageSize })
          return { data: res.data.list, total: res.data.total, success: true }
        }}
        search={false}
        scroll={{ x: 700 }}
      />
    </>
  )
}
