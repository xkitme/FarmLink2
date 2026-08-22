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
  Result,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  Spin,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { message } from '../api/feedback.js'
import { api } from '../api/request.js'
import TableStateView from '../components/TableStateView.jsx'
import {
  FORM_MODE,
  buildSubmitPayload,
  isFieldEditable,
  isFieldRequired,
  isFieldVisible,
  normalizeInitial,
} from '../policies/fieldEditPolicy.js'
import { buildDeleteConfirmText, createWriteOperation, primaryRecordText } from '../policies/operationState.js'
import { createResourceLoadCoordinator, LOAD_RESULT } from '../policies/resourceLoadCoordinator.js'
import { isConfigUnavailable, isStaleResponse, resolveTableState, TABLE_STATE } from '../policies/resourceTablePolicy.js'

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

/** 解析多图字段：DB 里存 JSON 数组字符串（如 ["/uploads/a.jpg","assets/x.jpg"]）。
 *  兼容空值 / 已是数组 / 遗留的裸 URL 字符串，始终返回 URL 数组。 */
function parseImages(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string') return []
  try {
    const arr = JSON.parse(value)
    if (Array.isArray(arr)) return arr.filter(Boolean)
    if (typeof arr === 'string' && arr) return [arr]
    return []
  } catch {
    return value.trim() ? [value.trim()] : []
  }
}

function formatValue(value, field) {
  if (field?.type === 'images') {
    const arr = parseImages(value)
    if (!arr.length) return '-'
    return (
      <Space size={4}>
        {arr.slice(0, 3).map((url, index) => (
          <img
            key={index}
            src={url}
            alt=""
            style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
          />
        ))}
        {arr.length > 3 ? <Tag>+{arr.length - 3}</Tag> : null}
      </Space>
    )
  }
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

/** 图片字段：上传到 /upload/image 拿回 URL（也可直接填 URL），带缩略图预览。 */
function ImageUploadField({ value, onChange, disabled }) {
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
        <Upload showUploadList={false} accept="image/*" disabled={disabled} customRequest={customRequest}>
          <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
            {value ? '更换图片' : '上传图片'}
          </Button>
        </Upload>
        {value ? (
          <Button danger disabled={disabled} onClick={() => onChange?.('')}>
            清除
          </Button>
        ) : null}
      </Space>
      <Input
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="或直接填图片 URL"
        allowClear
      />
    </Space>
  )
}

/** 多图字段：上传多张到 /upload/image，维护一个 URL 数组，回写为 JSON 字符串（与 DB 既有格式一致）。
 *  缩略图网格可逐张删除，也支持手动填 URL 追加。 */
function ImagesUploadField({ value, onChange, disabled }) {
  const [loading, setLoading] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const list = parseImages(value)
  // 批量上传时多个 customRequest 并发，闭包里的 value 是旧的；用 ref 串行累加避免相互覆盖。
  const listRef = useRef(list)
  listRef.current = list
  const emit = (arr) => {
    listRef.current = arr
    onChange?.(arr.length ? JSON.stringify(arr) : '')
  }
  async function customRequest({ file, onSuccess, onError }) {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const data = await api.post('/upload/image', fd)
      if (data?.url) emit([...listRef.current, data.url])
      onSuccess?.(data)
    } catch (error) {
      message.error('图片上传失败')
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {list.length ? (
        <Space wrap size={8}>
          {list.map((url, index) => (
            <div key={index} style={{ position: 'relative', lineHeight: 0 }}>
              <img
                src={url}
                alt=""
                style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
              />
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() => emit(list.filter((_, i) => i !== index))}
                style={{ position: 'absolute', top: 2, right: 2, padding: '0 4px', height: 22 }}
              />
            </div>
          ))}
        </Space>
      ) : null}
      <Space wrap>
        <Upload showUploadList={false} accept="image/*" multiple disabled={disabled} customRequest={customRequest}>
          <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
            {list.length ? '继续添加' : '上传图片'}
          </Button>
        </Upload>
        {list.length ? (
          <Button danger disabled={disabled} onClick={() => emit([])}>
            清空
          </Button>
        ) : null}
      </Space>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={urlDraft}
          disabled={disabled}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="或手动填图片 URL 后点添加"
          onPressEnter={() => {
            if (urlDraft.trim()) {
              emit([...list, urlDraft.trim()])
              setUrlDraft('')
            }
          }}
        />
        <Button
          disabled={disabled}
          onClick={() => {
            if (urlDraft.trim()) {
              emit([...list, urlDraft.trim()])
              setUrlDraft('')
            }
          }}
        >
          添加
        </Button>
      </Space.Compact>
    </Space>
  )
}

function FieldInput({ field, ...rest }) {
  // rest 携带 Form.Item 注入的 value/onChange/id/disabled，必须透传给真正的控件，否则字段不与表单绑定。
  if (field.type === 'image') return <ImageUploadField {...rest} />
  if (field.type === 'images') return <ImagesUploadField {...rest} />
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
  const [configLoading, setConfigLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [tableError, setTableError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form] = Form.useForm()

  // 详情请求独立序号（与配置/列表序号互不干扰）
  const detailSeqRef = useRef(0)
  // 供协调器回调读取的实时值（避免过期闭包）
  const resourceKeyRef = useRef(resourceKey)
  resourceKeyRef.current = resourceKey
  const editingRef = useRef(null)
  editingRef.current = editing
  const fieldsRef = useRef([])

  // 116g-B 整改 #1/#2：配置/列表加载协调器（页面与测试共用同一实现）
  const coordRef = useRef(null)
  function getCoord() {
    if (!coordRef.current) {
      coordRef.current = createResourceLoadCoordinator({
        fetchConfig: () =>
          api.get(`/admin/resource/${resourceKeyRef.current}/config`, null, { retries: 1, retryDelayMs: 300 }),
        fetchList: (page, pageSize, kw) =>
          api.get(
            `/admin/resource/${resourceKeyRef.current}/list`,
            { pageNum: page, pageSize, keyword: kw },
            { retries: 1, retryDelayMs: 300 },
          ),
        applyConfig: (data) => setConfig(data),
        applyList: (data) => {
          setRows(data?.records || [])
          setPagination({ current: data?.pageNum, pageSize: data?.pageSize, total: data?.total })
        },
        applyError: (error) => setTableError({ category: error?.category, message: error?.message }),
        onLoadingChange: ({ configLoading: cLoading, listLoading: lLoading }) => {
          setConfigLoading(cLoading)
          setListLoading(lLoading)
        },
      })
    }
    return coordRef.current
  }

  // 116g-B 整改 #4：写操作协调器（页面与测试共用同一实现，替代平行状态机模型）
  const submitOpRef = useRef(null)
  function getSubmitOp() {
    if (!submitOpRef.current) {
      submitOpRef.current = createWriteOperation({
        perform: async ({ values }) => {
          const mode = editingRef.current ? FORM_MODE.EDIT : FORM_MODE.CREATE
          // 整改 #3：只提交当前模式可见且可编辑的字段；readonly 永不提交；createOnly 仅创建模式提交
          const body = buildSubmitPayload(values, fieldsRef.current, mode)
          if (editingRef.current) {
            await api.put(`/admin/resource/${resourceKeyRef.current}/${editingRef.current.id}`, body)
          } else {
            await api.post(`/admin/resource/${resourceKeyRef.current}`, body)
          }
        },
        onSuccess: async () => {
          // 成功路径恰好执行一次：关弹窗 → 成功提示一次 → 确定性刷新一次
          setModalOpen(false)
          message.success(editingRef.current ? '记录已更新' : '记录已创建')
          await getCoord().refreshAfterWrite({ mode: editingRef.current ? FORM_MODE.EDIT : FORM_MODE.CREATE })
        },
        onFailure: () => {
          // 失败路径：弹窗保持打开、表单值保留；错误提示由请求层统一呈现；绝不弹成功、绝不刷新
        },
      })
    }
    return submitOpRef.current
  }

  const deleteOpRef = useRef(null)
  function getDeleteOp() {
    if (!deleteOpRef.current) {
      deleteOpRef.current = createWriteOperation({
        perform: async ({ record }) => {
          await api.delete(`/admin/resource/${resourceKeyRef.current}/${record.id}`)
        },
        onSuccess: async () => {
          // 删除成功：成功提示一次 + 按最新查询参数（协调器意图口径）恰好刷新一次
          message.success('记录已删除')
          await getCoord().refreshCurrentQuery()
        },
        onFailure: () => {
          // 删除失败：行保留、不弹成功提示；错误提示由请求层统一呈现
        },
      })
    }
    return deleteOpRef.current
  }

  useEffect(() => {
    detailSeqRef.current += 1
    setConfig(null)
    setRows([])
    setTableError(null)
    setViewing(null)
    setDetailLoading(false)
    setDetailError(null)
    setPagination({ current: 1, pageSize: 10, total: 0 })
    setKeyword('')
    getCoord().startResource()
  }, [resourceKey])

  const fields = config?.fields || []
  fieldsRef.current = fields
  const listFields = config?.listFields || []
  const fieldMap = useMemo(() => Object.fromEntries(fields.map((field) => [field.name, field])), [fields])

  const tableState = resolveTableState({
    configLoading,
    listLoading,
    error: tableError,
    rows,
    config,
  })

  // PR #5 审查整改：config 未就绪（含加载中/加载失败/尚无配置）一律禁用搜索/刷新/新增，
  // 仅在配置加载成功后才放开（isConfigUnavailable 纯函数，页面与测试同口径）。
  const configUnavailable = isConfigUnavailable(config)

  /** 用户动作入口：配置未就绪直接忽略且**不清错误态**；就绪后先清错误态再交给协调器。 */
  function requestList(page, pageSize, kw) {
    const coord = getCoord()
    if (!coord.hasConfig()) return LOAD_RESULT.IGNORED_NO_CONFIG
    setTableError(null)
    return coord.loadList(page, pageSize, kw)
  }

  function handleRetry() {
    setTableError(null)
    return getCoord().retry()
  }

  async function openDetail(record) {
    const requestId = detailSeqRef.current + 1
    detailSeqRef.current = requestId
    setViewing(record)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const data = await api.get(`/admin/resource/${resourceKeyRef.current}/${record.id}`)
      if (isStaleResponse(requestId, detailSeqRef.current)) return
      setViewing(data)
    } catch (error) {
      if (isStaleResponse(requestId, detailSeqRef.current)) return
      setDetailError({ category: error?.category, message: error?.message })
    } finally {
      if (!isStaleResponse(requestId, detailSeqRef.current)) setDetailLoading(false)
    }
  }

  function closeDetail() {
    detailSeqRef.current += 1
    setDetailLoading(false)
    setDetailError(null)
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
          <Popconfirm
            title={buildDeleteConfirmText({
              resourceTitle: config?.title || title,
              record,
              primaryValue: primaryRecordText(record, listFields),
            })}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deleting }}
            cancelButtonProps={{ disabled: deleting }}
            disabled={deleting}
            onConfirm={() => removeRecord(record)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} disabled={deleting} />
          </Popconfirm>
        </Space>
      ),
    })
    return cols
  }, [fieldMap, listFields, config, title, deleting, resourceKey])

  function openCreate() {
    // 整改 #1：配置未就绪不得触发无配置操作
    if (!getCoord().hasConfig()) return
    setEditing(null)
    setModalOpen(true)
  }

  const formMode = editing ? FORM_MODE.EDIT : FORM_MODE.CREATE

  async function submit(values) {
    setSubmitting(true)
    try {
      return await getSubmitOp().run({ values })
    } finally {
      setSubmitting(false)
    }
  }

  async function removeRecord(record) {
    setDeleting(true)
    try {
      await getDeleteOp().run({ record })
    } finally {
      setDeleting(false)
    }
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
            disabled={configUnavailable}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => requestList(1, pagination.pageSize, keyword)}
          />
          <Button icon={<SearchOutlined />} disabled={configUnavailable} onClick={() => requestList(1, pagination.pageSize, keyword)}>搜索</Button>
          <Button
            icon={<ReloadOutlined />}
            disabled={configUnavailable}
            onClick={() => {
              const query = getCoord().getLastQuery()
              requestList(query.page, query.pageSize, query.keyword)
            }}
          >
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={configUnavailable} onClick={openCreate}>新增</Button>
        </Space>
      }
    >
      {tableState === TABLE_STATE.CONFIG_LOADING ? (
        <div className="table-state">
          <Spin />
        </div>
      ) : null}

      {(tableState === TABLE_STATE.LIST_LOADING || tableState === TABLE_STATE.READY) && (
        <Table
          rowKey="id"
          loading={tableState === TABLE_STATE.LIST_LOADING}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1100 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => requestList(page, pageSize, keyword),
          }}
        />
      )}

      {(tableState === TABLE_STATE.EMPTY ||
        tableState === TABLE_STATE.ERROR ||
        tableState === TABLE_STATE.UNAUTHORIZED ||
        tableState === TABLE_STATE.API_DISABLED) && (
        <TableStateView
          state={tableState}
          message={tableError?.message}
          onRetry={handleRetry}
        />
      )}

      <Modal
        title={editing ? `编辑${config?.title || ''}` : `新增${config?.title || ''}`}
        open={modalOpen}
        onCancel={() => {
          if (!submitting) setModalOpen(false)
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        maskClosable={!submitting}
        keyboard={!submitting}
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
            {fields
              .filter((field) => isFieldVisible(field, formMode))
              .map((field) => (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  valuePropName={field.type === 'boolean' ? 'checked' : 'value'}
                  rules={isFieldRequired(field) ? [{ required: true, message: `请填写${field.label}` }] : []}
                  className={field.type === 'textarea' || field.type === 'json' ? 'wide-field' : undefined}
                >
                  <FieldInput field={field} disabled={!isFieldEditable(field, formMode)} />
                </Form.Item>
              ))}
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
          detailError ? (
            <Result
              status="error"
              title="详情加载失败"
              subTitle={detailError.message || '请求失败，请稍后重试'}
              extra={
                <Button type="primary" onClick={() => openDetail(viewing)}>
                  重试
                </Button>
              }
            />
          ) : (
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
          )
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
  const nameSeqRef = useRef(0)

  useEffect(() => {
    const seq = nameSeqRef.current + 1
    nameSeqRef.current = seq
    setActive(resources[0])
    setConfigs({})
    async function loadNames() {
      const result = {}
      for (const key of resources) {
        try {
          result[key] = await api.get(`/admin/resource/${key}/config`)
        } catch {
          // 标题回退为 key；该资源的表格自身会呈现错误态，这里不阻塞其它标签。
          result[key] = null
        }
        if (isStaleResponse(seq, nameSeqRef.current)) return
      }
      if (!isStaleResponse(seq, nameSeqRef.current)) setConfigs(result)
    }
    loadNames()
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
