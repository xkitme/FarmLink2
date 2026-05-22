import { Card, Space, Tag, Typography } from 'antd'

export default function Placeholder({ title, group }) {
  return (
    <Space direction="vertical" size={16} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Text type="secondary">该模块正在接入完整管理页面。</Typography.Text>
        </div>
        <Tag color="blue">{group}</Tag>
      </div>
      <Card className="panel-card">
        <div className="placeholder-grid">
          <div>
            <strong>路由已预留</strong>
            <span>菜单、布局、鉴权和请求封装已经可用。</span>
          </div>
          <div>
            <strong>后端已接入</strong>
            <span>直接调用 `/api/v1` 下的业务接口。</span>
          </div>
          <div>
            <strong>离线可用</strong>
            <span>管理台与后端均可在本机运行。</span>
          </div>
        </div>
      </Card>
    </Space>
  )
}
