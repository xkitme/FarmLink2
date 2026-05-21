import React, { useEffect, useState } from 'react'
import { ProCard, StatisticCard } from '@ant-design/pro-components'
import { Alert, Badge, Col, Row, Space, Tag, Typography } from 'antd'
import { UserOutlined, FileTextOutlined, RobotOutlined, FireOutlined, TeamOutlined } from '@ant-design/icons'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getOverviewStats, getChartData, getAIStatus } from '../../services/adminApi'

const { Text } = Typography
const COLORS = { primary: '#8B4513', secondary: '#D2691E', accent: '#CD853F' }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState([])
  const [ai, setAi] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOverviewStats(), getChartData(), getAIStatus()])
      .then(([s, c, a]) => {
        setStats(s.data)
        setChart(c.data)
        setAi(a.data)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '0 4px' }}>
      {ai && !ai.online && (
        <Alert
          type="warning"
          message="Ollama 未启动"
          description="AI 功能当前不可用。请运行 ollama serve 并确保模型已下载。"
          showIcon closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 核心指标 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { title: '注册用户', value: stats?.users, icon: <UserOutlined />, color: '#8B4513', suffix: '人' },
          { title: '文化内容', value: stats?.contents, icon: <FileTextOutlined />, color: '#D2691E', suffix: '条' },
          { title: 'AI 对话总数', value: stats?.aiConvs, icon: <RobotOutlined />, color: '#CD853F', suffix: '次' },
          { title: '今日打卡', value: stats?.todayCheckins, icon: <FireOutlined />, color: '#A0522D', suffix: '人' },
          { title: '用户作品', value: stats?.works, icon: <TeamOutlined />, color: '#6B3A2A', suffix: '件' },
        ].map((item) => (
          <Col span={24 / 5} key={item.title}>
            <ProCard bodyStyle={{ padding: '20px 24px' }}
              style={{ borderTop: `3px solid ${item.color}`, borderRadius: 8 }}>
              <Space direction="vertical" size={4}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  <span style={{ color: item.color, marginRight: 6 }}>{item.icon}</span>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 700, color: item.color }}>
                  {loading ? '—' : (item.value ?? 0).toLocaleString()}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.suffix}</Text>
              </Space>
            </ProCard>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        {/* 活跃趋势图 */}
        <Col span={16}>
          <ProCard title="近 7 日活跃趋势" style={{ borderRadius: 8 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="checkins" name="打卡人数" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="learning" name="学习记录" stroke={COLORS.secondary} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ProCard>
        </Col>

        {/* 系统状态 */}
        <Col span={8}>
          <ProCard title="服务状态" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {[
                { name: '后端服务', status: 'ok' },
                { name: 'SQLite 数据库', status: 'ok' },
                { name: 'Ollama AI', status: ai?.online ? 'ok' : 'error' },
              ].map((s) => (
                <Row key={s.name} justify="space-between" align="middle">
                  <Text>{s.name}</Text>
                  <Badge
                    status={s.status === 'ok' ? 'success' : 'error'}
                    text={s.status === 'ok' ? '正常' : '离线'}
                  />
                </Row>
              ))}
              {ai && (
                <div style={{ background: '#fafafa', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>当前模型</Text>
                  <div><Tag color="orange" style={{ marginTop: 4, fontSize: 11 }}>{ai.primaryModel}</Tag></div>
                </div>
              )}
            </Space>
          </ProCard>

          <ProCard title="本周新增" style={{ borderRadius: 8, marginTop: 16 }}>
            <StatisticCard.Group>
              <StatisticCard statistic={{ title: '新用户', value: stats?.weeklyUsers ?? 0, suffix: '人' }} />
              <StatisticCard statistic={{ title: '今日打卡', value: stats?.todayCheckins ?? 0, suffix: '人' }} />
            </StatisticCard.Group>
          </ProCard>
        </Col>
      </Row>
    </div>
  )
}
