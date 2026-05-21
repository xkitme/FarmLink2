import React, { useRef } from 'react'
import { ProTable } from '@ant-design/pro-components'
import { Button, Image, Popconfirm, Space, Tabs, Tag, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { getAdminWorks, deleteAdminWork, getComments, deleteComment } from '../../services/adminApi'
import dayjs from 'dayjs'

const TYPE_MAP = { calligraphy: ['书法', 'purple'], poetry: ['诗词', 'blue'], painting: ['国画', 'green'] }

function WorksTable() {
  const ref = useRef()
  const columns = [
    { title: '作者', dataIndex: ['user', 'nickname'], width: 100 },
    { title: '类型', dataIndex: 'workType', width: 80,
      render: (v) => <Tag color={TYPE_MAP[v]?.[1]}>{TYPE_MAP[v]?.[0] || v}</Tag> },
    { title: '标题', dataIndex: 'title', width: 140, ellipsis: true },
    { title: '内容预览', dataIndex: 'content', ellipsis: true,
      render: (v, r) => r.mediaPath
        ? <Image src={`/api/media/${r.mediaPath?.split('/').pop()}`} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />
        : <span style={{ color: '#666', fontSize: 12 }}>{v?.slice(0, 40)}</span>,
    },
    { title: '点赞', dataIndex: 'likeCount', width: 70 },
    { title: '评论', dataIndex: 'commentCount', width: 70 },
    { title: '发布时间', dataIndex: 'createdAt', width: 120,
      render: (v) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', width: 80, fixed: 'right',
      render: (_, r) => (
        <Popconfirm title="删除该作品？" onConfirm={async () => {
          await deleteAdminWork(r.id); message.success('已删除'); ref.current?.reload()
        }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ]
  return (
    <ProTable
      actionRef={ref} rowKey="id" columns={columns}
      request={async (params) => {
        const res = await getAdminWorks({ page: params.current, pageSize: params.pageSize })
        return { data: res.data.list, total: res.data.total, success: true }
      }}
      search={false} scroll={{ x: 900 }}
    />
  )
}

function CommentsTable() {
  const ref = useRef()
  const columns = [
    { title: '评论者', dataIndex: ['user', 'nickname'], width: 100 },
    { title: '作品', dataIndex: ['work', 'title'], width: 120, ellipsis: true,
      render: (v, r) => v || `[${TYPE_MAP[r.work?.workType]?.[0] || r.work?.workType}]` },
    { title: '评论内容', dataIndex: 'content', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt', width: 120,
      render: (v) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', width: 80, fixed: 'right',
      render: (_, r) => (
        <Popconfirm title="删除该评论？" onConfirm={async () => {
          await deleteComment(r.id); message.success('已删除'); ref.current?.reload()
        }}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ]
  return (
    <ProTable
      actionRef={ref} rowKey="id" columns={columns}
      request={async (params) => {
        const res = await getComments({ page: params.current, pageSize: params.pageSize })
        return { data: res.data.list, total: res.data.total, success: true }
      }}
      search={false} scroll={{ x: 700 }}
    />
  )
}

export default function Community() {
  return (
    <Tabs defaultActiveKey="works" size="large" items={[
      { key: 'works',    label: '用户作品',  children: <WorksTable /> },
      { key: 'comments', label: '评论管理',  children: <CommentsTable /> },
    ]} />
  )
}
