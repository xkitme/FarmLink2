import React, { useEffect, useRef, useState } from 'react'
import { ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit } from '@ant-design/pro-components'
import { Button, Popconfirm, Progress, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getAchievements, createAchievement, updateAchievement, deleteAchievement } from '../../services/adminApi'

export default function Achievements() {
  const ref = useRef()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [total, setTotal] = useState(0)

  const openEdit = (record = null) => { setEditing(record); setModal(true) }

  const handleSubmit = async (values) => {
    if (editing) { await updateAchievement(editing.id, values); message.success('修改成功') }
    else { await createAchievement(values); message.success('新增成功') }
    ref.current?.reload()
    return true
  }

  const columns = [
    { title: '图标', dataIndex: 'icon', width: 50, render: (v) => <span style={{ fontSize: 20 }}>{v}</span> },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 80, render: (v) => <Tag>{v}</Tag> },
    { title: '触发条件', width: 140,
      render: (_, r) => <Tag color="blue">{r.conditionType} ≥ {r.conditionValue}</Tag> },
    { title: '经验奖励', dataIndex: 'expReward', width: 80, render: (v) => <Tag color="gold">+{v} EXP</Tag> },
    { title: '解锁人数', dataIndex: ['_count', 'userAchievements'], width: 80,
      render: (v) => (
        <Space>
          <span>{v}</span>
          <Progress percent={total > 0 ? Math.round(v / total * 100) : 0} size="small" style={{ width: 60 }} showInfo={false} />
        </Space>
      ),
    },
    { title: '操作', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => {
            await deleteAchievement(r.id); message.success('已删除'); ref.current?.reload()
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
        actionRef={ref} rowKey="id" columns={columns}
        request={async () => {
          const res = await getAchievements()
          setTotal(res.data.reduce((s, a) => s + (a._count?.userAchievements || 0), 0))
          return { data: res.data, success: true }
        }}
        search={false} pagination={false}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />}
            style={{ background: '#8B4513' }} onClick={() => openEdit()}>
            新增成就
          </Button>,
        ]}
      />

      <ModalForm
        title={editing ? '编辑成就' : '新增成就'}
        open={modal}
        onOpenChange={(v) => { setModal(v); if (!v) setEditing(null) }}
        onFinish={handleSubmit}
        initialValues={editing || {}}
        width={480} grid
      >
        <ProFormText name="code" label="成就代码" rules={[{ required: true }]} colProps={{ span: 12 }} placeholder="streak_7" />
        <ProFormText name="icon" label="图标 Emoji" colProps={{ span: 12 }} placeholder="🔥" />
        <ProFormText name="name" label="成就名称" rules={[{ required: true }]} colProps={{ span: 12 }} />
        <ProFormText name="category" label="分类" colProps={{ span: 12 }} placeholder="streak" />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 2 }} />
        <ProFormSelect name="conditionType" label="触发类型" colProps={{ span: 12 }}
          options={['streak', 'complete', 'score', 'create'].map((v) => ({ label: v, value: v }))} />
        <ProFormDigit name="conditionValue" label="触发阈值" colProps={{ span: 12 }} />
        <ProFormDigit name="expReward" label="经验奖励" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
