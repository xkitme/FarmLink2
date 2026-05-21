import React, { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../services/adminApi'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await adminLogin(values)
      localStorage.setItem('admin_token', res.data.token)
      localStorage.setItem('admin_username', res.data.username)
      message.success('登录成功')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)',
    }}>
      <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🖌</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#8B4513' }}>墨脉 InkFlow</div>
          <div style={{ color: '#999', fontSize: 13, marginTop: 4 }}>管理后台</div>
        </div>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="管理员用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ background: '#8B4513', borderColor: '#8B4513', height: 42 }}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12 }}>
          默认账号：admin / inkflow2025
        </div>
      </Card>
    </div>
  )
}
