/**
 * 统一来源 IP 解析。
 *
 * 全项目所有需要来源 IP 的消费者（限流、审计日志、上传配额等）
 * 统一导入此函数，不得各自读取 req.ip / req.socket.remoteAddress
 * 或原始 X-Forwarded-For / X-Real-IP 头，也不得形成不同的来源策略。
 *
 * 只读取 Express 已验证的 req.ip（受 app.set('trust proxy', ...) 控制）。
 *
 * - trust proxy = false（默认）→ req.ip 即直连 IP，客户端伪造的 XFF 被忽略。
 * - trust proxy 配置可信代理 → req.ip 是受信代理上报的最左端客户端 IP。
 * - req.ip 缺失时安全回退到 req.socket.remoteAddress。
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}
