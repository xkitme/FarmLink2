import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { message } from '../api/feedback.js'
import { api } from '../api/request.js'

function formatDate(value) {
  if (!value) return '-'
  return String(value).slice(0, 19).replace('T', ' ')
}

function formatTtl(value) {
  if (!value) return '-'
  return `${Math.ceil(value / 1000)} 秒`
}

export default function ApiSwitchPage() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ keyword: '', category: undefined, enabled: undefined })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [loading, setLoading] = useState(false)
  const [rateLimit, setRateLimit] = useState({ policies: [], counters: [] })
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  async function loadList(page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) {
    setLoading(true)
    try {
      const data = await api.get('/admin/api-switch/list', {
        pageNum: page,
        pageSize,
        keyword: nextFilters.keyword,
        category: nextFilters.category,
        enabled: nextFilters.enabled,
      })
      setRows(data.records || [])
      setPagination({ current: data.pageNum, pageSize: data.pageSize, total: data.total })
    } finally {
      setLoading(false)
    }
  }

  async function loadMeta() {
    const [categoryData, rateData] = await Promise.all([
      api.get('/admin/api-switch/categories'),
      api.get('/admin/rate-limit/status'),
    ])
    setCategories(categoryData || [])
    setRateLimit(rateData || { policies: [], counters: [] })
  }

  useEffect(() => {
    loadMeta()
    loadList(1, 10)
  }, [])

  const stats = useMemo(() => {
    const enabled = rows.filter((item) => item.enabled).length
    return {
      total: pagination.total,
      currentEnabled: enabled,
      currentDisabled: rows.length - enabled,
      categoryCount: categories.length,
    }
  }, [rows, categories, pagination.total])

  const categoryOptions = categories.map((category) => ({ label: category, value: category }))

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true })
    setModalOpen(true)
  }

  function openEdit(record) {
    setEditing(record)
    form.setFieldsValue({
      key: record.key,
      name: record.name,
      category: record.category,
      description: record.description,
      enabled: record.enabled,
    })
    setModalOpen(true)
  }

  async function submit(values) {
    if (editing) {
      await api.put(`/admin/api-switch/${editing.id}`, values)
      message.success('API 开关已更新')
    } else {
      await api.post('/admin/api-switch', values)
      message.success('API 开关已创建')
    }
    setModalOpen(false)
    await Promise.all([loadMeta(), loadList()])
  }

  async function toggle(record, enabled) {
    const updated = await api.put(`/admin/api-switch/${record.id}/toggle`, { enabled })
    setRows((items) => items.map((item) => (item.id === record.id ? updated : item)))
    message.success(enabled ? '功能已开启' : '功能已关闭')
  }

  async function removeRecord(record) {
    await api.delete(`/admin/api-switch/${record.id}`)
    message.success('API 开关已删除')
    await Promise.all([loadMeta(), loadList()])
  }

  function runSearch() {
    loadList(1, pagination.pageSize, filters)
  }

  const columns = [
    {
      title: '开关 Key',
      dataIndex: 'key',
      width: 220,
      ellipsis: true,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 130,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value, record) => (
        <Tooltip title={value ? '关闭后命中的 API 会返回权限不足' : '开启后恢复 API 调用'}>
          <Switch checked={value} checkedChildren="开" unCheckedChildren="关" onChange={(checked) => toggle(record, checked)} />
        </Tooltip>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除这个 API 开关？" onConfirm={() => removeRecord(record)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const counterColumns = [
    { title: '计数 Key', dataIndex: 'key', ellipsis: true },
    { title: '次数', dataIndex: 'count', width: 90 },
    { title: '剩余时间', dataIndex: 'ttl', width: 120, render: formatTtl },
  ]

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>API 开关管理</Typography.Title>
          <Typography.Text type="secondary">可直接关闭高成本 AI、交易、同步等能力，统一治理后端接口。</Typography.Text>
        </div>
        <Tag color="green">平台数据服务</Tag>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="开关总数" value={stats.total} suffix="个" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="当前页开启" value={stats.currentEnabled} suffix="个" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="当前页关闭" value={stats.currentDisabled} suffix="个" /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card"><Statistic title="开关分类" value={stats.categoryCount} suffix="类" /></Card>
        </Col>
      </Row>

      <Card
        className="panel-card"
        title="开关列表"
        extra={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Key / 名称 / 说明"
              value={filters.keyword}
              onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
              onPressEnter={runSearch}
            />
            <Select
              allowClear
              className="filter-select"
              placeholder="分类"
              options={categoryOptions}
              value={filters.category}
              onChange={(value) => setFilters((item) => ({ ...item, category: value }))}
            />
            <Select
              allowClear
              className="filter-select"
              placeholder="状态"
              value={filters.enabled}
              onChange={(value) => setFilters((item) => ({ ...item, enabled: value }))}
              options={[
                { label: '已开启', value: true },
                { label: '已关闭', value: false },
              ]}
            />
            <Button icon={<SearchOutlined />} onClick={runSearch}>搜索</Button>
            <Button icon={<ReloadOutlined />} onClick={() => Promise.all([loadMeta(), loadList()])}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增开关</Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1050 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个开关`,
            onChange: (page, pageSize) => loadList(page, pageSize),
          }}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="panel-card" title="限流策略">
            <Space wrap>
              {(rateLimit.policies || []).map((item) => (
                <Tag color="geekblue" key={item.name}>
                  {item.name}: {item.limit} 次 / {item.windowSec} 秒 / {item.scope}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="panel-card" title="当前限流计数">
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              columns={counterColumns}
              dataSource={rateLimit.counters || []}
              locale={{ emptyText: '暂无计数，调用 API 后会出现' }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editing ? '编辑 API 开关' : '新增 API 开关'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
          <Form.Item label="开关 Key" name="key" rules={[{ required: true, message: '请填写开关 Key' }]}>
            <Input placeholder="例如 ai_chat" />
          </Form.Item>
          <Form.Item label="显示名称" name="name" rules={[{ required: true, message: '请填写显示名称' }]}>
            <Input placeholder="例如 通用 AI 对话" />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请填写分类' }]}>
            <Input placeholder="例如 AI 能力 / 交易流程 / 数据同步" />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} placeholder="说明这个开关影响哪些接口和业务场景" />
          </Form.Item>
          <Form.Item label="启用状态" name="enabled" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
