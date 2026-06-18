// 上下文感知的全局 message：替代 antd 静态 message，消除
// 「Static function can not consume context like dynamic theme」告警，
// 并让 message 弹层继承 ConfigProvider 的主题色。
// 真正的实例由 <FeedbackBridge/>（挂在 <AntApp> 内）通过 App.useApp() 注入。

let _message = null

export function setFeedbackMessage(instance) {
  _message = instance
}

function proxy(method) {
  return (...args) => {
    if (_message) return _message[method](...args)
    // Bridge 尚未挂载（极少见，仅极早期调用）时退化为不抛错。
    return undefined
  }
}

export const message = {
  success: proxy('success'),
  error: proxy('error'),
  warning: proxy('warning'),
  info: proxy('info'),
  loading: proxy('loading'),
  open: proxy('open'),
  destroy: (...args) => _message?.destroy(...args),
}
