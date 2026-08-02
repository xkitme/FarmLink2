import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { message } from '../api/feedback.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, api, rawRequest } from '../api/request.js'
import { clearSession, saveSession } from '../api/auth.js'

function resolveUrl(imageUrl) {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const apiOrigin = new URL(API_BASE, window.location.origin).origin
  const path = String(imageUrl).startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${apiOrigin}${path}`
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const reason = searchParams.get('reason')

  useEffect(() => {
    api.get('/site/images')
      .then((data) => {
        const url = resolveUrl(data?.images?.['admin-login-bg'])
        if (url) setBackgroundUrl(`${url}?t=${Date.now()}`)
      })
      .catch(() => {})
  }, [])

  async function onFinish(values) {
    const session = await api.post('/auth/login', values)
    if (session.user?.role !== 'ADMIN') {
      saveSession(session)
      try {
        await rawRequest('/auth/logout', { method: 'POST' })
      } catch {
        // 非管理员账号也必须立刻收口，本地态不能继续保留。
      } finally {
        clearSession()
      }
      message.error('当前账号不是管理员')
      return
    }
    saveSession(session)
    message.success('登录成功')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div
      className="login-page"
      style={backgroundUrl ? { '--admin-login-bg': `url("${backgroundUrl}")` } : undefined}
    >
      <div className="login-visual">
        <div className="field-map">
          {Array.from({ length: 36 }).map((_, index) => <span key={index} />)}
        </div>
      </div>
      <Card className="login-card">
        <div className="login-title">
          <SafetyCertificateOutlined />
          <div>
            <Typography.Title level={2}>田园通管理后台</Typography.Title>
            <Typography.Text type="secondary">在线服务平台 · 数据治理 · AI 能力</Typography.Text>
          </div>
        </div>
        {reason && (
          <Alert
            style={{ marginBottom: 16 }}
            type={reason === 'expired' ? 'warning' : 'info'}
            showIcon
            message={reason === 'expired' ? '登录已失效，请重新登录' : '你已退出登录，请重新进入'}
          />
        )}
        <Form
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item label="管理员账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input size="large" prefix={<UserOutlined />} autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit">
            登录后台
          </Button>
        </Form>
      </Card>
    </div>
  )
}
