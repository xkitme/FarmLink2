/**
 * 客户端类型检测 — Capacitor/Ionic/Cordova 原生壳 vs 浏览器管理台。
 * auth.js / csrf.js / auth.controller.js / originGuard.js 共享同一判断逻辑，
 * 避免多处散落正则导致口径不一致。
 */

/** Capacitor / Ionic / Cordova 原生壳 User-Agent 特征 */
export const NATIVE_UA_RE = /capacitor|ionic|cordova/i

/**
 * 判断请求是否来自 Capacitor/Ionic/Cordova 原生壳。
 * 原生壳继续走 Bearer token；浏览器走 HttpOnly Cookie。
 */
export function isNativeClient(req) {
  const ua = (req.headers?.['user-agent'] || '').toLowerCase()
  return NATIVE_UA_RE.test(ua)
}
