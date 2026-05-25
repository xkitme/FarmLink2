import { Card, Space, Tag, Typography } from 'antd'

export default function Placeholder({ title, group }) {
  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Text type="secondary">请选择左侧菜单进入对应管理页面。</Typography.Text>
        </div>
        <Tag color="blue">{group}</Tag>
      </div>
      <Card className="panel-card">
        <div className="placeholder-grid">
          <div>
            <strong>统一入口</strong>
            <span>菜单、布局、鉴权和请求封装保持一致。</span>
          </div>
          <div>
            <strong>接口已接入</strong>
            <span>直接调用 `/api/v1` 下的业务接口。</span>
          </div>
          <div>
            <strong>数据可管理</strong>
            <span>业务数据、状态和日志均可在后台治理。</span>
          </div>
        </div>
      </Card>
    </Space>
  )
}
