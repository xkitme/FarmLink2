import {
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/request.js'

const MODULE_OPTIONS = [
  'auth',
  'user',
  'agri',
  'market',
  'machinery',
  'disaster',
  'policy',
  'party',
  'village',
  'training',
  'life',
  'data',
  'ai',
  'admin',
]

function formatDate(value) {
  if (!value) return '-'
  return String(value).slice(0, 19).replace('T', ' ')
}

function statusColor(statusCode) {
  if (!statusCode) return 'default'
  if (statusCode >= 500) return 'red'
  if (statusCode >= 400) return 'orange'
  return 'green'
}

function stringify(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export default function OperationLogPage() {
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState({ keyword: '', module: undefined, userId: undefined })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [loading, setLoading] = useState(false)
  const [viewing, setViewing] = useState(null)

  async function loadList(page = pagination.current, pageSize = pagination.pageSize, nextFilters = filters) {
    setLoading(true)
    try {
      const data = await api.get('/admin/operation-log/list', {
        pageNum: page,
        pageSize,
        keyword: nextFilters.keyword,
        module: nextFilters.module,
        userId: nextFilters.userId,
      })
      setRows(data.records || [])
      setPagination({ current: data.pageNum, pageSize: data.pageSize, total: data.total })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList(1, 10)
  }, [])

  const modules = useMemo(() => {
    const current = rows.map((item) => item.module).filter(Boolean)
    return [...new Set([...MODULE_OPTIONS, ...current])].map((module) => ({ label: module, value: module }))
  }, [rows])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 120,
      render: (value) => <Tag color="blue">{value || 'system'}</Tag>,
    },
    {
      title: '动作',
      dataIndex: 'action',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={statusColor(record.detail?.statusCode)}>
          {record.detail?.statusCode || '-'}
        </Tag>
      ),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 100,
      render: (_, record) => record.detail?.durationMs === undefined ? '-' : `${record.detail.durationMs} ms`,
    },
    {
      title: '用户',
      dataIndex: 'userId',
      width: 100,
      render: (value) => value || '-',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 160,
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      render: formatDate,
    },
    {
      title: '操作',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(record)}>详情</Button>
      ),
    },
  ]

  function runSearch() {
    loadList(1, pagination.pageSize, filters)
  }

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>系统操作日志</Typography.Title>
          <Typography.Text type="secondary">审计后台和业务侧非 GET API 调用，便于追踪业务操作行为。</Typography.Text>
        </div>
        <Tag color="purple">非 GET 自动记录</Tag>
      </div>

      <Card
        className="panel-card"
        title="日志列表"
        extra={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="动作关键词"
              value={filters.keyword}
              onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
              onPressEnter={runSearch}
            />
            <Select
              allowClear
              showSearch
              className="filter-select"
              placeholder="模块"
              options={modules}
              value={filters.module}
              onChange={(value) => setFilters((item) => ({ ...item, module: value }))}
            />
            <InputNumber
              className="filter-number"
              placeholder="用户 ID"
              min={1}
              value={filters.userId}
              onChange={(value) => setFilters((item) => ({ ...item, userId: value }))}
            />
            <Button icon={<SearchOutlined />} onClick={runSearch}>搜索</Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadList()}>刷新</Button>
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
            showTotal: (total) => `共 ${total} 条日志`,
            onChange: (page, pageSize) => loadList(page, pageSize),
          }}
        />
      </Card>

      <Drawer
        title="操作日志详情"
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        width={760}
      >
        {viewing && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="日志 ID">{viewing.id}</Descriptions.Item>
            <Descriptions.Item label="模块">{viewing.module}</Descriptions.Item>
            <Descriptions.Item label="动作">{viewing.action}</Descriptions.Item>
            <Descriptions.Item label="用户 ID">{viewing.userId || '-'}</Descriptions.Item>
            <Descriptions.Item label="IP">{viewing.ip || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDate(viewing.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Trace ID">{viewing.detail?.traceId || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求路径">{viewing.detail?.path || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求方法">{viewing.detail?.method || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态码">{viewing.detail?.statusCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="耗时">{viewing.detail?.durationMs === undefined ? '-' : `${viewing.detail.durationMs} ms`}</Descriptions.Item>
            <Descriptions.Item label="API 开关">{viewing.detail?.apiSwitchKey || '-'}</Descriptions.Item>
            <Descriptions.Item label="限流策略">{viewing.detail?.rateLimitPolicy || '-'}</Descriptions.Item>
            <Descriptions.Item label="查询参数">
              <pre className="detail-pre">{stringify(viewing.detail?.query)}</pre>
            </Descriptions.Item>
            <Descriptions.Item label="请求体">
              <pre className="detail-pre">{stringify(viewing.detail?.body)}</pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Space>
  )
}
