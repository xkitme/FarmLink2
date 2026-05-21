import React, { useRef, useState } from 'react'
import { ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDigit } from '@ant-design/pro-components'
import { Button, Popconfirm, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getContents, createContent, updateContent, deleteContent } from '../../services/adminApi'

const CATEGORIES = [
  { label: '诗词歌赋', value: 'poetry' }, { label: '书法篆刻', value: 'calligraphy' },
  { label: '历史典故', value: 'history' }, { label: '国学经典', value: 'classics' },
  { label: '节气民俗', value: 'season' },  { label: '传统艺术', value: 'art' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))
const DIFFICULTY_COLORS = ['', 'green', 'blue', 'gold', 'orange', 'red']

export default function Contents() {
  const ref = useRef()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const openEdit = (record = null) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    if (values.tags && typeof values.tags === 'string') {
      values.tags = values.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    }
    if (editing) {
      await updateContent(editing.id, values)
      message.success('修改成功')
    } else {
      await createContent(values)
      message.success('新增成功')
    }
    ref.current?.reload()
    return true
  }

  const handleDelete = async (id) => {
    await deleteContent(id)
    message.success('已删除')
    ref.current?.reload()
  }

  const columns = [
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 100,
      render: (v) => <Tag color="brown">{CAT_MAP[v] || v}</Tag>,
      filters: CATEGORIES.map((c) => ({ text: c.label, value: c.value })),
    },
    { title: '作者', dataIndex: 'author', width: 80, ellipsis: true },
    { title: '朝代', dataIndex: 'dynasty', width: 70 },
    { title: '难度', dataIndex: 'difficulty', width: 70,
      render: (v) => <Tag color={DIFFICULTY_COLORS[v]}>Lv.{v}</Tag>,
    },
    { title: '浏览量', dataIndex: 'viewCount', width: 80, sorter: true },
    { title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
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
          const res = await getContents({
            page: params.current, pageSize: params.pageSize,
            keyword: params.title, category: params.category,
          })
          return { data: res.data.list, total: res.data.total, success: true }
        }}
        search={{ labelWidth: 'auto' }}
        scroll={{ x: 900 }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />}
            style={{ background: '#8B4513' }} onClick={() => openEdit()}>
            新增内容
          </Button>,
        ]}
      />

      <ModalForm
        title={editing ? '编辑内容' : '新增内容'}
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null) }}
        onFinish={handleSubmit}
        initialValues={editing || {}}
        width={700}
        grid
      >
        <ProFormText name="title" label="标题" rules={[{ required: true }]} colProps={{ span: 16 }} />
        <ProFormSelect name="category" label="分类" options={CATEGORIES} rules={[{ required: true }]} colProps={{ span: 8 }} />
        <ProFormText name="author" label="作者" colProps={{ span: 12 }} />
        <ProFormText name="dynasty" label="朝代" colProps={{ span: 12 }} />
        <ProFormDigit name="difficulty" label="难度(1-5)" min={1} max={5} colProps={{ span: 8 }} />
        <ProFormText name="tags" label="标签(逗号分隔)" colProps={{ span: 16 }} />
        <ProFormTextArea name="body" label="原文" rules={[{ required: true }]} fieldProps={{ rows: 4 }} />
        <ProFormTextArea name="translation" label="译文" fieldProps={{ rows: 3 }} />
        <ProFormTextArea name="background" label="创作背景" fieldProps={{ rows: 2 }} />
      </ModalForm>
    </>
  )
}
