import React, { useRef, useState } from 'react'
import { ProTable, ModalForm, ProFormSelect, ProFormDatePicker } from '@ant-design/pro-components'
import { Avatar, Button, Popconfirm, Space, Tag, Tooltip, message } from 'antd'
import { EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { getUsers, updateUser, deleteUser } from '../../services/adminApi'
import dayjs from 'dayjs'

const MEMBER_MAP = { 0: ['默认', 'default'], 1: ['月度会员', 'blue'], 2: ['年度会员', 'gold'] }
const LEVEL_NAMES = ['', '白丁', '学童', '秀才', '举人', '进士', '翰林', '博士', '大儒', '宗师', '状元']

export default function Users() {
  const ref = useRef()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const openEdit = (record) => { setEditing(record); setModal(true) }

  const handleSubmit = async (values) => {
    await updateUser(editing.id, {
      ...values,
      memberExpireAt: values.memberExpireAt ? dayjs(values.memberExpireAt).toISOString() : undefined,
    })
    message.success('修改成功')
    ref.current?.reload()
    return true
  }

  const columns = [
    { title: '用户', dataIndex: 'nickname', width: 160,
      render: (v, r) => (
        <Space>
          <Avatar size={32} icon={<UserOutlined />} style={{ background: '#8B4513' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{v}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{r.phone}</div>
          </div>
        </Space>
      ),
    },
    { title: '等级', dataIndex: 'level', width: 90,
      render: (v) => <Tag color="volcano">Lv.{v} {LEVEL_NAMES[v]}</Tag>,
    },
    { title: '经验', dataIndex: 'expPoints', width: 90, sorter: true,
      render: (v) => v.toLocaleString(),
    },
    { title: '会员', dataIndex: 'memberType', width: 100,
      render: (v) => <Tag color={MEMBER_MAP[v]?.[1]}>{MEMBER_MAP[v]?.[0]}</Tag>,
      filters: [{ text: '免费', value: 0 }, { text: '月度会员', value: 1 }, { text: '年度会员', value: 2 }],
    },
    { title: '会员到期', dataIndex: 'memberExpireAt', width: 110,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    { title: '作品数', dataIndex: ['_count', 'works'], width: 80 },
    { title: '打卡天数', dataIndex: ['_count', 'checkins'], width: 80 },
    { title: '注册时间', dataIndex: 'createdAt', width: 110,
      render: (v) => dayjs(v).format('MM-DD HH:mm'),
    },
    { title: '操作', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除该用户？此操作不可逆。" onConfirm={async () => {
            await deleteUser(r.id); message.success('已删除'); ref.current?.reload()
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable
        actionRef={ref}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const res = await getUsers({ page: params.current, pageSize: params.pageSize, keyword: params.nickname, memberType: params.memberType })
          return { data: res.data.list, total: res.data.total, success: true }
        }}
        search={{ labelWidth: 80 }}
        scroll={{ x: 1000 }}
      />

      <ModalForm
        title="编辑用户"
        open={modal}
        onOpenChange={(v) => { setModal(v); if (!v) setEditing(null) }}
        onFinish={handleSubmit}
        initialValues={editing ? { memberType: editing.memberType } : {}}
        width={420}
      >
        <ProFormSelect
          name="memberType" label="会员类型"
          options={[{ label: '免费', value: 0 }, { label: '月度会员', value: 1 }, { label: '年度会员', value: 2 }]}
        />
        <ProFormDatePicker name="memberExpireAt" label="会员到期日" style={{ width: '100%' }} />
      </ModalForm>
    </>
  )
}
