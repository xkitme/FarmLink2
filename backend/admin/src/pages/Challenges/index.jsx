import React, { useRef, useState } from 'react'
import { ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormDatePicker } from '@ant-design/pro-components'
import { Button, Popconfirm, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getChallenges, createChallenge, updateChallenge, deleteChallenge } from '../../services/adminApi'
import dayjs from 'dayjs'

export default function Challenges() {
  const ref = useRef()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const today = dayjs().format('YYYY-MM-DD')

  const openEdit = (record = null) => { setEditing(record); setModal(true) }

  const handleSubmit = async (values) => {
    const data = {
      ...values,
      options: values.options ? values.options.split('\n').filter(Boolean) : undefined,
      date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
    }
    if (editing) {
      await updateChallenge(editing.id, data)
      message.success('修改成功')
    } else {
      await createChallenge(data)
      message.success('新增成功')
    }
    ref.current?.reload()
    return true
  }

  const columns = [
    { title: '日期', dataIndex: 'date', width: 110,
      render: (v) => (
        <Space>
          <span>{v}</span>
          {v === today && <Tag color="red">今日</Tag>}
        </Space>
      ),
    },
    { title: '题目', dataIndex: 'question', ellipsis: true },
    { title: '正确答案', dataIndex: 'answer', width: 80,
      render: (v) => <Tag color="green">{v}</Tag>,
    },
    { title: '提交数', dataIndex: ['_count', 'submissions'], width: 80 },
    { title: '操作', width: 120, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => {
            await deleteChallenge(r.id); message.success('已删除'); ref.current?.reload()
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
          const res = await getChallenges({ page: params.current, pageSize: params.pageSize })
          return { data: res.data.list, total: res.data.total, success: true }
        }}
        search={false}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />}
            style={{ background: '#8B4513' }} onClick={() => openEdit()}>
            新增挑战
          </Button>,
        ]}
      />

      <ModalForm
        title={editing ? '编辑挑战' : '新增挑战'}
        open={modal}
        onOpenChange={(v) => { setModal(v); if (!v) setEditing(null) }}
        onFinish={handleSubmit}
        initialValues={editing ? {
          ...editing,
          options: Array.isArray(editing.options)
            ? editing.options.join('\n')
            : (typeof editing.options === 'string' ? JSON.parse(editing.options || '[]').join('\n') : ''),
        } : {}}
        width={520}
      >
        <ProFormDatePicker name="date" label="挑战日期" rules={[{ required: true }]} style={{ width: '100%' }} />
        <ProFormTextArea name="question" label="题目" rules={[{ required: true }]} fieldProps={{ rows: 2 }} />
        <ProFormTextArea name="options" label="选项（每行一个，如 A.xxx）"
          fieldProps={{ rows: 4, placeholder: 'A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四' }} />
        <ProFormText name="answer" label="正确答案（A/B/C/D）" rules={[{ required: true }]} />
        <ProFormTextArea name="explanation" label="解析说明" fieldProps={{ rows: 2 }} />
      </ModalForm>
    </>
  )
}
