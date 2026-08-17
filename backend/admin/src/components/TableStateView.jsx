import { Button, Empty, Result } from 'antd'

/**
 * ResourcePage 表格确定性状态呈现（116g-B）。
 * state 必须是 resourceTablePolicy.TABLE_STATE 之一；
 * loading 类状态由调用方以 Spin/Table loading 呈现，此处只处理
 * empty / error / unauthorized / api-disabled，互不混淆。
 */
const ERROR_VIEW = {
  error: {
    status: 'error',
    title: '加载失败',
    fallback: '请求失败，请稍后重试',
  },
  unauthorized: {
    status: '403',
    title: '无权限访问',
    fallback: '当前账号无权访问该资源，请联系管理员确认角色权限',
  },
  'api-disabled': {
    status: 'warning',
    title: '功能已关闭',
    fallback: '该功能已被管理员关闭，请联系管理员确认',
  },
}

export default function TableStateView({ state, message, onRetry }) {
  if (state === 'empty') {
    return <Empty description="暂无数据" className="table-state" />
  }
  const view = ERROR_VIEW[state]
  if (!view) return null
  return (
    <Result
      className="table-state"
      status={view.status}
      title={view.title}
      subTitle={message || view.fallback}
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        ) : null
      }
    />
  )
}
