import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import {
  ApiOutlined,
  ReloadOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { api } from '../api/request.js'
import { message } from '../api/feedback.js'

const { Title, Paragraph, Text } = Typography

const PROVIDER_OPTIONS = [
  { value: 'auto', label: '自动（DeepSeek 优先，失败回落本地 Ollama）' },
  { value: 'deepseek', label: '只用 DeepSeek（云端大模型）' },
  { value: 'ollama', label: '只用本地 Ollama（离线/无 Key）' },
]

export default function AiAssistantPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [meta, setMeta] = useState({ keySet: false, keyMasked: '', defaultPrompt: '' })

  async function load() {
    setLoading(true)
    try {
      const data = await api.get('/admin/ai-assistant/config')
      setMeta({
        keySet: Boolean(data?.deepseekApiKeySet),
        keyMasked: data?.deepseekApiKeyMasked || '',
        defaultPrompt: data?.defaultSystemPrompt || '',
      })
      form.setFieldsValue({
        enabled: data?.enabled !== false,
        assistantProvider: data?.assistantProvider || 'auto',
        chatProvider: data?.chatProvider || 'ollama',
        deepseekModel: data?.deepseekModel || '',
        deepseekBaseUrl: data?.deepseekBaseUrl || '',
        temperature: typeof data?.temperature === 'number' ? data.temperature : 0.1,
        deepseekThinking: data?.deepseekThinking === true,
        systemPrompt: data?.systemPrompt || '',
        wakeWords: Array.isArray(data?.wakeWords) ? data.wakeWords.join('\n') : '',
        deepseekApiKey: '', // 永不回显明文；留空=保持原 Key
      })
    } catch {
      // request 已统一弹错
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave(values) {
    setSaving(true)
    try {
      const payload = { ...values }
      // 没填新 Key 就不提交该字段，避免把已存 Key 覆盖成空。
      if (!payload.deepseekApiKey || !payload.deepseekApiKey.trim()) {
        delete payload.deepseekApiKey
      }
      await api.put('/admin/ai-assistant/config', payload)
      message.success('已保存，移动端下次说话即生效')
      await load()
    } catch {
      // request 已统一弹错
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const data = await api.post('/admin/ai-assistant/test', {})
      message.success(`DeepSeek 连接正常（${data?.latencyMs ?? '-'} ms，模型 ${data?.model || '-'}）`)
    } catch {
      // request 已统一弹错
    } finally {
      setTesting(false)
    }
  }

  function useDefaultPrompt() {
    form.setFieldsValue({ systemPrompt: meta.defaultPrompt })
  }

  function clearPrompt() {
    form.setFieldsValue({ systemPrompt: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>AI 语音助手</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            配置语音助手的开关、提供方与 DeepSeek 凭证、系统提示词。保存后移动端无需重启，下次说话即按新配置运行。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </div>

      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ enabled: true, assistantProvider: 'auto', chatProvider: 'ollama', temperature: 0.1, deepseekThinking: false }}
          onFinish={handleSave}
        >
          <Card title="两个模块各自的模型提供方" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="enabled" label="语音助手总开关" valuePropName="checked">
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="assistantProvider"
                  label="① 语音助手 提供方"
                  rules={[{ required: true, message: '请选择提供方' }]}
                >
                  <Select options={PROVIDER_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="chatProvider"
                  label="② AI 问答（主聊天）提供方"
                  rules={[{ required: true, message: '请选择提供方' }]}
                >
                  <Select options={PROVIDER_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              type="info"
              showIcon
              message="语音助手与主问答各自独立选择提供方。关闭总开关后语音助手返回「已关闭」（不影响主问答）。选「只用 Ollama」无需 DeepSeek Key；选 DeepSeek/自动需在下方填 Key。"
            />
          </Card>

          <Card title="语音唤醒词" style={{ marginBottom: 16 }}>
            <Form.Item
              name="wakeWords"
              label="唤醒词（移动端开启「语音唤醒」后离线监听这些词）"
              extra="逗号或换行分隔多个，最多 8 个、单词 ≤ 20 字；留空使用默认「你好小田」。识别有近音容错，建议用清晰好念的词。"
            >
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder={'你好小田\n小田小田'} />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              message="语音唤醒需移动端在「设置 - 语音唤醒」手动开启（默认关），且仅 APK 真机离线识别可用；Web 端不生效。"
            />
          </Card>

          <Card title="DeepSeek 凭证" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="deepseekApiKey"
                  label={
                    <Space>
                      API Key
                      {meta.keySet
                        ? <Tag color="green">已配置 {meta.keyMasked}</Tag>
                        : <Tag color="orange">未配置</Tag>}
                    </Space>
                  }
                  extra="留空表示保持现有 Key 不变；填入新值即覆盖。"
                >
                  <Input.Password placeholder={meta.keySet ? '••••（已配置，留空不改）' : 'sk-...'} autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="deepseekModel"
                  label="模型名"
                  extra="推荐 deepseek-v4-flash（快）或 deepseek-v4-pro。deepseek-chat/-reasoner 将于 2026/07/24 弃用。"
                >
                  <Input placeholder="deepseek-v4-flash" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="deepseekThinking"
                  label="思考模式"
                  valuePropName="checked"
                  extra="关闭=非思考，快约 2 倍、短指令更稳（推荐）。开启=深度推理，更强但更慢。"
                >
                  <Switch checkedChildren="思考(强/慢)" unCheckedChildren="非思考(快)" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="deepseekBaseUrl" label="接口地址">
                  <Input placeholder="https://api.deepseek.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="temperature" label="采样温度（0-1，越低越稳定）">
                  <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Button icon={<ApiOutlined />} onClick={handleTest} loading={testing}>
              测试 DeepSeek 连接
            </Button>
          </Card>

          <Card
            title="系统提示词"
            extra={
              <Space>
                <Button size="small" onClick={useDefaultPrompt}>填入默认</Button>
                <Button size="small" onClick={clearPrompt}>清空（用默认）</Button>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item
              name="systemPrompt"
              extra="约束助手输出的 JSON 命令协议；留空则使用内置默认提示词。改错可能导致命令解析失败，建议以默认版本为基础微调。"
            >
              <Input.TextArea autoSize={{ minRows: 8, maxRows: 24 }} placeholder={meta.defaultPrompt} />
            </Form.Item>
          </Card>

          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              保存配置
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={handleTest} loading={testing}>
              测试连接
            </Button>
            <Text type="secondary">配置存于数据库，移动端每次请求实时读取。</Text>
          </Space>
        </Form>
      </Spin>
    </div>
  )
}
