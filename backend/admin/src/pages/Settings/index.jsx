import React, { useEffect, useState } from 'react'
import { ProCard, ProForm, ProFormDigit, ProFormText, ProFormGroup } from '@ant-design/pro-components'
import { Alert, Divider, Space, Tag, Typography, message } from 'antd'
import { getSettings, updateSettings } from '../../services/adminApi'

const { Text, Title } = Typography

export default function Settings() {
  const [initialValues, setInitialValues] = useState(null)

  useEffect(() => {
    getSettings().then((res) => {
      const d = res.data
      setInitialValues({
        ollama_baseUrl: d.ollama?.baseUrl,
        ollama_primaryModel: d.ollama?.primaryModel,
        ollama_visionModel: d.ollama?.visionModel,
        rateLimit_free: d.aiRateLimit?.free,
        rateLimit_monthly: d.aiRateLimit?.monthly,
        rateLimit_yearly: d.aiRateLimit?.yearly,
        upload_maxSizeMb: d.upload?.maxSizeMb,
      })
    })
  }, [])

  const handleFinish = async (values) => {
    await updateSettings({
      ollama: {
        baseUrl: values.ollama_baseUrl,
        primaryModel: values.ollama_primaryModel,
        visionModel: values.ollama_visionModel,
      },
      aiRateLimit: {
        free: values.rateLimit_free,
        monthly: values.rateLimit_monthly,
        yearly: values.rateLimit_yearly,
      },
      upload: { maxSizeMb: values.upload_maxSizeMb },
    })
    message.success('配置已应用（重启服务后永久生效，需修改 .env 文件）')
  }

  if (!initialValues) return null

  return (
    <div>
      <Alert
        type="info"
        message="配置说明"
        description="此处修改在服务运行期间生效，重启后恢复 .env 文件中的默认值。如需永久修改，请直接编辑 backend/.env 文件。"
        showIcon style={{ marginBottom: 16 }}
      />

      <ProCard title="系统设置" style={{ borderRadius: 8 }}>
        <ProForm
          initialValues={initialValues}
          onFinish={handleFinish}
          submitter={{ searchConfig: { submitText: '保存设置' } }}
          layout="vertical"
        >
          <ProFormGroup title="Ollama AI 配置">
            <ProFormText
              name="ollama_baseUrl" label="Ollama 服务地址"
              fieldProps={{ style: { width: 300 } }} placeholder="http://localhost:11434"
            />
            <ProFormText
              name="ollama_primaryModel" label="主模型（对话/翻译/出题）"
              fieldProps={{ style: { width: 300 } }}
            />
            <ProFormText
              name="ollama_visionModel" label="视觉模型（书法点评）"
              fieldProps={{ style: { width: 300 } }}
            />
          </ProFormGroup>

          <Divider />

          <ProFormGroup title="AI 每日调用次数限制">
            <ProFormDigit name="rateLimit_free" label="免费用户（次/天）" min={1} max={9999} fieldProps={{ style: { width: 140 } }} />
            <ProFormDigit name="rateLimit_monthly" label="月度会员（次/天）" min={1} max={9999} fieldProps={{ style: { width: 140 } }} />
            <ProFormDigit name="rateLimit_yearly" label="年度会员（次/天）" min={1} max={9999} fieldProps={{ style: { width: 140 } }} />
          </ProFormGroup>

          <Divider />

          <ProFormGroup title="文件上传">
            <ProFormDigit name="upload_maxSizeMb" label="最大文件大小（MB）" min={1} max={100} fieldProps={{ style: { width: 140 } }} />
          </ProFormGroup>
        </ProForm>
      </ProCard>

      <ProCard title="管理员账号" style={{ borderRadius: 8, marginTop: 16 }}>
        <Space direction="vertical">
          <Text type="secondary" style={{ fontSize: 13 }}>
            管理员账号在 <Tag><Text code>backend/.env</Text></Tag> 中配置：
          </Text>
          <Text code style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 6, display: 'block' }}>
            ADMIN_USERNAME=admin<br />
            ADMIN_PASSWORD=inkflow2025<br />
            ADMIN_JWT_SECRET=your-secret
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>修改后重启后端服务生效。</Text>
        </Space>
      </ProCard>
    </div>
  )
}
