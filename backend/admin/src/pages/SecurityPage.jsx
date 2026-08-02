import {
  CheckCircleOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import { message } from '../api/feedback.js'
import { api } from '../api/request.js'

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replaceAll('/', '-')
}

export default function SecurityPage() {
  const [codeForm] = Form.useForm()
  const [revokeForm] = Form.useForm()
  const [codeResult, setCodeResult] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)

  async function generateCode(values) {
    setCodeLoading(true)
    try {
      const result = await api.post('/admin/security/password-reset-code', {
        username: values.username.trim(),
      })
      setCodeResult(result)
      message.success('一次性重置码已生成，请只向本人转交')
    } finally {
      setCodeLoading(false)
    }
  }

  async function revokeSessions(values) {
    setRevokeLoading(true)
    try {
      const result = await api.post('/admin/security/revoke-sessions', {
        username: values.username.trim(),
      })
      message.success(`已撤销 ${result.revokedCount || 0} 个有效会话`)
      revokeForm.resetFields()
    } finally {
      setRevokeLoading(false)
    }
  }

  async function copyCode() {
    if (!codeResult?.resetCode) return
    await navigator.clipboard.writeText(codeResult.resetCode)
    message.success('重置码已复制')
  }

  return (
    <Space direction="vertical" size={16} className="page-stack security-page">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>账号安全服务</Typography.Title>
          <Typography.Text type="secondary">
            协助农户完成身份恢复，并在异常情况下收拢设备会话。
          </Typography.Text>
        </div>
        <Tag color="green" icon={<SafetyCertificateOutlined />}>服务端强校验</Tag>
      </div>

      <Alert
        type="info"
        showIcon
        message="重置码只显示一次"
        description="重置码有效期 5 分钟，最多输错 5 次；生成新码会立即作废同一账号的旧码。请通过安全渠道转交给账号本人。"
      />

      <Row gutter={[16, 16]} className="security-grid">
        <Col xs={24} xl={14}>
          <Card
            className="panel-card security-card"
            title="生成一次性重置码"
            extra={<Tag color="gold">5 分钟有效</Tag>}
          >
            <Form form={codeForm} layout="vertical" onFinish={generateCode} requiredMark={false}>
              <Form.Item
                label="农户账号"
                name="username"
                rules={[{ required: true, whitespace: true, message: '请输入需要协助的账号' }]}
              >
                <Input size="large" placeholder="输入登录账号" autoComplete="off" />
              </Form.Item>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<SafetyCertificateOutlined />}
                loading={codeLoading}
              >
                生成重置码
              </Button>
            </Form>

            {codeResult && (
              <div className="reset-code-ticket" role="status" aria-live="polite">
                <div className="reset-code-ticket-head">
                  <span>当前重置凭证</span>
                  <Tag color="green" icon={<CheckCircleOutlined />}>仅本次可见</Tag>
                </div>
                <div className="reset-code-value" aria-label={`重置码 ${codeResult.resetCode}`}>
                  {codeResult.resetCode}
                </div>
                <div className="reset-code-meta">
                  <span>{codeResult.username}{codeResult.nickname ? ` · ${codeResult.nickname}` : ''}</span>
                  <span>失效时间 {formatTime(codeResult.expiresAt)}</span>
                </div>
                <Button type="text" icon={<CopyOutlined />} onClick={copyCode}>
                  复制重置码
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card
            className="panel-card security-card"
            title="撤销账号会话"
            extra={<Tag color="red">高影响操作</Tag>}
          >
            <Typography.Paragraph type="secondary">
              账号疑似在其它设备泄露时，可立即撤销该账号的全部有效会话。账号本人需要重新登录。
            </Typography.Paragraph>
            <Form form={revokeForm} layout="vertical" onFinish={revokeSessions} requiredMark={false}>
              <Form.Item
                label="农户账号"
                name="username"
                rules={[{ required: true, whitespace: true, message: '请输入需要处理的账号' }]}
              >
                <Input placeholder="输入登录账号" autoComplete="off" />
              </Form.Item>
              <Button danger icon={<StopOutlined />} htmlType="submit" loading={revokeLoading}>
                撤销全部设备会话
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
