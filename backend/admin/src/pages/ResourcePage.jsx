import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/request.js'

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? <Tag color="green">是</Tag> : <Tag>否</Tag>
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 19).replace('T', ' ')
  if (typeof value === 'string' && value.length > 48) return `${value.slice(0, 48)}...`
  return String(value)
}

function normalizeInitial(record, fields) {
  const values = {}
  for (const field of fields) {
    if (field.createOnly) continue
    const value = record?.[field.name]
    if (field.type === 'date' && typeof value === 'string') values[field.name] = value.slice(0, 10)
    else values[field.name] = value
  }
  return values
}

function FieldInput({ field }) {
  if (field.type === 'textarea' || field.type === 'json') {
    return <Input.TextArea rows={field.type === 'json' ? 4 : 3} placeholder={field.placeholder || field.label} />
  }
  if (field.type === 'int' || field.type === 'float') {
    return <InputNumber className="full-control" precision={field.type === 'float' ? 2 : 0} />
  }
  if (field.type === 'boolean') return <Switch />
  if (field.type === 'select') {
    return (
      <Select
        allowClear
        options={(field.options || []).map((item) => ({ label: item, value: item }))}
      />
    )
  }
  if (field.type === 'date') return <Input type="date" />
  if (field.type === 'password') return <Input.Password placeholder={field.placeholder || field.label} />
  return <Input placeholder={field.placeholder || field.label} />
}

function ResourceTable({ resourceKey, title }) {
  const [config, setConfig] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  async function loadConfig() {
    const data = await api.get(`/admin/resource/${resourceKey}/config`)
    setConfig(data)
  }

  async function loadList(page = pagination.current, pageSize = pagination.pageSize, kw = keyword) {
    setLoading(true)
    try {
      const data = await api.get(`/admin/resource/${resourceKey}/list`, { pageNum: page, pageSize, keyword: kw })
      setRows(data.records || [])
      setPagination({ current: data.pageNum, pageSize: data.pageSize, total: data.total })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setConfig(null)
    setRows([])
    setPagination({ current: 1, pageSize: 10, total: 0 })
    loadConfig().then(() => loadList(1, 10, ''))
  }, [resourceKey])

  const fields = config?.fields || []
  const listFields = config?.listFields || []

  const columns = useMemo(() => {
    const fieldMap = Object.fromEntries(fields.map((field) => [field.name, field]))
    const cols = listFields.map((name) => ({
      title: fieldMap[name]?.label || name,
      dataIndex: name,
      ellipsis: true,
      render: formatValue,
    }))
    cols.push({
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(record)}>查看</Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record)
              form.setFieldsValue(normalizeInitial(record, fields))
              setModalOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除这条记录？" onConfirm={() => removeRecord(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    })
    return cols
  }, [fields, listFields])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  async function submit(values) {
    const body = { ...values }
    if (editing) {
      await api.put(`/admin/resource/${resourceKey}/${editing.id}`, body)
      message.success('记录已更新')
    } else {
      await api.post(`/admin/resource/${resourceKey}`, body)
      message.success('记录已创建')
    }
    setModalOpen(false)
    await loadList()
  }

  async function removeRecord(id) {
    await api.delete(`/admin/resource/${resourceKey}/${id}`)
    message.success('记录已删除')
    await loadList()
  }

  return (
    <Card
      className="panel-card"
      title={config?.title || title}
      extra={
        <Space>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索关键词"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => loadList(1, pagination.pageSize, keyword)}
          />
          <Button icon={<SearchOutlined />} onClick={() => loadList(1, pagination.pageSize, keyword)}>搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={() => loadList()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1100 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => loadList(page, pageSize),
        }}
      />

      <Modal
        title={editing ? `编辑${config?.title || ''}` : `新增${config?.title || ''}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
          <div className="resource-form-grid">
            {fields.map((field) => {
              if (field.createOnly && editing) return null
              return (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
                  rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : []}
                  className={field.type === 'textarea' || field.type === 'json' ? 'wide-field' : undefined}
                >
                  <FieldInput field={field} />
                </Form.Item>
              )
            })}
          </div>
        </Form>
      </Modal>

      <Drawer
        title="记录详情"
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        width={720}
      >
        {viewing && (
          <Descriptions bordered column={1} size="small">
            {Object.entries(viewing).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'string' && value.length > 160
                  ? <pre className="detail-pre">{value}</pre>
                  : formatValue(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Drawer>
    </Card>
  )
}

export default function ResourcePage({ title, group, resources }) {
  const [active, setActive] = useState(resources[0])
  const [configs, setConfigs] = useState({})

  useEffect(() => {
    let mounted = true
    async function loadNames() {
      const result = {}
      for (const key of resources) {
        result[key] = await api.get(`/admin/resource/${key}/config`)
      }
      if (mounted) setConfigs(result)
    }
    loadNames()
    return () => { mounted = false }
  }, [resources.join(',')])

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Text type="secondary">支持搜索、分页、新增、查看、编辑和删除。</Typography.Text>
        </div>
        <Tag color="blue">{group}</Tag>
      </div>
      <Tabs
        activeKey={active}
        onChange={setActive}
        items={resources.map((key) => ({
          key,
          label: configs[key]?.title || key,
          children: <ResourceTable resourceKey={key} title={configs[key]?.title || key} />,
        }))}
      />
    </Space>
  )
}
