import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
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
  Upload,
  message,
  Spin,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/request.js'

const VALUE_LABELS = {
  FARMER: '农户',
  BIGFARMER: '种植大户',
  VILLAGE: '村委',
  EXPERT: '农技员',
  MERCHANT: '商家',
  ADMIN: '管理员',
  PENDING: '待处理',
  REPLIED: '已回复',
  CLOSED: '已关闭',
  PAID: '已支付',
  SHIPPED: '已发货',
  CREATED: '已创建',
  PICKED: '已揽收',
  TRANSIT: '运输中',
  ARRIVED: '已到站',
  DELIVERED: '已签收',
  DONE: '已完成',
  CANCELLED: '已取消',
  CONFIRMED: '已确认',
  OPEN: '开放中',
  DEALT: '已成交',
  REPORTED: '已上报',
  REVIEWING: '审核中',
  PROCESSED: '已处理',
  ASSESSING: '评估中',
  APPROVED: '已通过',
  REJECTED: '未通过',
  PUBLISHED: '已发布',
  HANDLING: '处理中',
  RESOLVED: '已解决',
  ON_SALE: '在售',
  SOLD: '已售出',
  DRAFT: '草稿',
  SUBMITTED: '已提交',
  SUCCESS: '成功',
  CONFLICT: '冲突',
  FAILED: '失败',
  INSERT: '新增',
  UPDATE: '更新',
  DELETE: '删除',
}

const VALUE_COLORS = {
  APPROVED: 'green',
  CONFIRMED: 'green',
  DONE: 'green',
  PAID: 'green',
  PROCESSED: 'green',
  PUBLISHED: 'green',
  RESOLVED: 'green',
  SUCCESS: 'green',
  REJECTED: 'red',
  CANCELLED: 'red',
  CLOSED: 'default',
  FAILED: 'red',
  CONFLICT: 'orange',
  PENDING: 'gold',
  SUBMITTED: 'blue',
  REVIEWING: 'blue',
  ASSESSING: 'blue',
  HANDLING: 'blue',
  TRANSIT: 'blue',
}

function optionLabel(item) {
  if (item && typeof item === 'object') return item.label || item.value
  return VALUE_LABELS[item] || item
}

function optionValue(item) {
  if (item && typeof item === 'object') return item.value
  return item
}

function formatValue(value, field) {
  if (value === null || value === undefined || value === '') return '-'
  if (field?.type === 'image') {
    return (
      <img
        src={value}
        alt={field.label}
        style={{ height: 36, maxWidth: 96, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
      />
    )
  }
  if (typeof value === 'boolean') return value ? <Tag color="green">是</Tag> : <Tag>否</Tag>
  if (field?.name === 'status' && typeof value === 'number') {
    return value === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>
  }
  if (typeof value === 'string' && VALUE_LABELS[value]) {
    return <Tag color={VALUE_COLORS[value] || 'blue'}>{VALUE_LABELS[value]}</Tag>
  }
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

/** 图片字段：上传到 /upload/image 拿回 URL（也可直接填 URL），带缩略图预览。 */
function ImageUploadField({ value, onChange }) {
  const [loading, setLoading] = useState(false)
  async function customRequest({ file, onSuccess, onError }) {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const data = await api.post('/upload/image', fd)
      onChange?.(data?.url || '')
      onSuccess?.(data)
      message.success('图片已上传')
    } catch (error) {
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {value ? (
        <img
          src={value}
          alt="预览"
          style={{ maxWidth: 200, maxHeight: 110, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
        />
      ) : null}
      <Space wrap>
        <Upload showUploadList={false} accept="image/*" customRequest={customRequest}>
          <Button icon={<UploadOutlined />} loading={loading}>
            {value ? '更换图片' : '上传图片'}
          </Button>
        </Upload>
        {value ? <Button danger onClick={() => onChange?.('')}>清除</Button> : null}
      </Space>
      <Input
        value={value || ''}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="或直接填图片 URL"
        allowClear
      />
    </Space>
  )
}

function FieldInput({ field, ...rest }) {
  // rest 携带 Form.Item 注入的 value/onChange/id，必须透传给真正的控件，否则字段不与表单绑定。
  if (field.type === 'image') return <ImageUploadField {...rest} />
  if (field.type === 'textarea' || field.type === 'json') {
    return <Input.TextArea {...rest} rows={field.type === 'json' ? 4 : 3} placeholder={field.placeholder || field.label} />
  }
  if (field.type === 'int' || field.type === 'float') {
    return <InputNumber {...rest} className="full-control" precision={field.type === 'float' ? 2 : 0} />
  }
  if (field.type === 'boolean') return <Switch {...rest} />
  if (field.type === 'select') {
    return (
      <Select
        {...rest}
        allowClear
        options={(field.options || []).map((item) => ({ label: optionLabel(item), value: optionValue(item) }))}
      />
    )
  }
  if (field.type === 'date') return <Input {...rest} type="date" />
  if (field.type === 'password') return <Input.Password {...rest} placeholder={field.placeholder || field.label} />
  return <Input {...rest} placeholder={field.placeholder || field.label} />
}

function ResourceTable({ resourceKey, title }) {
  const [config, setConfig] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const detailRequestRef = useRef(0)
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
    detailRequestRef.current += 1
    setConfig(null)
    setRows([])
    setViewing(null)
    setDetailLoading(false)
    setPagination({ current: 1, pageSize: 10, total: 0 })
    loadConfig().then(() => loadList(1, 10, ''))
  }, [resourceKey])

  const fields = config?.fields || []
  const listFields = config?.listFields || []
  const fieldMap = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, field])), [fields])

  async function openDetail(record) {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setViewing(record)
    setDetailLoading(true)
    try {
      const data = await api.get(`/admin/resource/${resourceKey}/${record.id}`)
      if (detailRequestRef.current === requestId) setViewing(data)
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  function closeDetail() {
    detailRequestRef.current += 1
    setDetailLoading(false)
    setViewing(null)
  }

  const columns = useMemo(() => {
    const cols = listFields.map((name) => ({
      title: fieldMap[name]?.label || name,
      dataIndex: name,
      ellipsis: true,
      render: (value) => formatValue(value, fieldMap[name]),
    }))
    cols.push({
      title: '操作',
      key: 'actions',
      width: 210,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>查看</Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record)
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
  }, [fieldMap, listFields, resourceKey])

  function openCreate() {
    setEditing(null)
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
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open) return
          if (editing) form.setFieldsValue(normalizeInitial(editing, fields))
          else form.resetFields()
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          preserve={false}
        >
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
        onClose={closeDetail}
        width={720}
      >
        {viewing && (
          <Spin spinning={detailLoading}>
            <Descriptions bordered column={1} size="small">
              {Object.entries(viewing).map(([key, value]) => (
                <Descriptions.Item key={key} label={fieldMap[key]?.label || key}>
                  {typeof value === 'string' && value.length > 160
                    ? <pre className="detail-pre">{value}</pre>
                    : formatValue(value, fieldMap[key])}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Spin>
        )}
      </Drawer>
    </Card>
  )
}

export default function ResourcePage({ title, group, resources }) {
  const [active, setActive] = useState(resources[0])
  const [configs, setConfigs] = useState({})
  const resourceSignature = resources.join(',')
  const activeKey = resources.includes(active) ? active : resources[0]

  useEffect(() => {
    let mounted = true
    setActive(resources[0])
    setConfigs({})
    async function loadNames() {
      const result = {}
      for (const key of resources) {
        result[key] = await api.get(`/admin/resource/${key}/config`)
      }
      if (mounted) setConfigs(result)
    }
    loadNames()
    return () => { mounted = false }
  }, [resourceSignature])

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
        activeKey={activeKey}
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
