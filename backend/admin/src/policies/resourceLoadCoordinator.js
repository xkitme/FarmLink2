/**
 * 116g-B 配置/列表加载协调器（ResourcePage 与测试共用同一实现）。
 *
 * 整改 #1（配置/列表竞态）：
 * - 配置请求与列表请求使用**独立**序号（configSeq / listSeq）：
 *   搜索/刷新/翻页只会推进 listSeq，**不会**使在途配置请求失效——
 *   配置请求一定能完成，或被 retry/资源切换**确定性重发**，绝不永久停留在加载态。
 * - 配置未就绪时 loadList 直接返回 IGNORED_NO_CONFIG，不发起无配置请求；
 *   页面同时在 UI 上禁用搜索/刷新/新增。
 * - resetResource（资源切换）同时推进两个序号并清空配置：
 *   旧配置、旧列表的在途响应全部失效（STALE）。
 *
 * 整改 #2（删除刷新参数）：
 * - lastQuery 在每次列表请求**发起时**记录（意图口径，失败也记录，便于精确重放）；
 * - refreshCurrentQuery / refreshAfterWrite 一律以 lastQuery 为准，
 *   不依赖组件闭包中可能过期的 pagination/keyword。
 */

import { isStaleResponse } from './resourceTablePolicy.js'

export const LOAD_RESULT = Object.freeze({
  APPLIED: 'applied',
  STALE: 'stale',
  IGNORED_NO_CONFIG: 'ignored-no-config',
  FAILED: 'failed',
})

/**
 * @param {object} options
 * @param {() => Promise<any>} options.fetchConfig 配置请求
 * @param {(page: number, pageSize: number, keyword: string) => Promise<any>} options.fetchList 列表请求
 * @param {(config: any) => void} options.applyConfig 配置落地（页面 setState）
 * @param {(data: any, query: {page:number,pageSize:number,keyword:string}) => void} options.applyList 列表落地
 * @param {(error: Error) => void} options.applyError 错误落地
 * @param {({configLoading:boolean,listLoading:boolean}) => void} [options.onLoadingChange] 加载态回传
 */
export function createResourceLoadCoordinator({ fetchConfig, fetchList, applyConfig, applyList, applyError, onLoadingChange } = {}) {
  let configSeq = 0
  let listSeq = 0
  let config = null
  let configLoading = false
  let listLoading = false
  let lastQuery = { page: 1, pageSize: 10, keyword: '' }

  function emitLoading() {
    onLoadingChange?.({ configLoading, listLoading })
  }

  async function loadConfig() {
    const seq = ++configSeq
    configLoading = true
    emitLoading()
    try {
      const data = await fetchConfig()
      if (isStaleResponse(seq, configSeq)) return LOAD_RESULT.STALE
      config = data
      applyConfig(data)
      configLoading = false
      emitLoading()
      return LOAD_RESULT.APPLIED
    } catch (error) {
      if (isStaleResponse(seq, configSeq)) return LOAD_RESULT.STALE
      applyError(error)
      configLoading = false
      emitLoading()
      return LOAD_RESULT.FAILED
    }
  }

  async function loadList(page, pageSize, keyword) {
    // 整改 #1：配置未就绪不发起无配置请求
    if (config === null) return LOAD_RESULT.IGNORED_NO_CONFIG
    const seq = ++listSeq
    const kw = keyword ?? ''
    // 整改 #2：请求发起即记录查询意图（失败也保留，便于精确重放）
    lastQuery = { page, pageSize, keyword: kw }
    listLoading = true
    emitLoading()
    try {
      const data = await fetchList(page, pageSize, kw)
      if (isStaleResponse(seq, listSeq)) return LOAD_RESULT.STALE
      applyList(data, { page, pageSize, keyword: kw })
      listLoading = false
      emitLoading()
      return LOAD_RESULT.APPLIED
    } catch (error) {
      if (isStaleResponse(seq, listSeq)) return LOAD_RESULT.STALE
      applyError(error)
      listLoading = false
      emitLoading()
      return LOAD_RESULT.FAILED
    }
  }

  /** 资源切换：旧配置、旧列表全部失效；重置查询意图。 */
  function resetResource() {
    configSeq += 1
    listSeq += 1
    config = null
    lastQuery = { page: 1, pageSize: 10, keyword: '' }
    configLoading = false
    listLoading = false
    emitLoading()
  }

  /** 资源初始化：重发配置，成功后自动加载第 1 页。 */
  async function startResource() {
    resetResource()
    const result = await loadConfig()
    if (result === LOAD_RESULT.APPLIED) return loadList(1, 10, '')
    return result
  }

  /** 错误/空态重试：无配置先确定性重发配置，再按最近一次查询参数精确重放。 */
  async function retry() {
    if (config === null) {
      const result = await loadConfig()
      if (result !== LOAD_RESULT.APPLIED) return result
    }
    return loadList(lastQuery.page, lastQuery.pageSize, lastQuery.keyword)
  }

  /** 删除成功后按最新查询参数恰好刷新一次（整改 #2）。 */
  function refreshCurrentQuery() {
    return loadList(lastQuery.page, lastQuery.pageSize, lastQuery.keyword)
  }

  /** 写成功后确定性刷新：创建回第 1 页（保留 pageSize/keyword），更新留当前页。 */
  function refreshAfterWrite({ mode } = {}) {
    if (mode === 'create') return loadList(1, lastQuery.pageSize, lastQuery.keyword)
    return refreshCurrentQuery()
  }

  return {
    loadConfig,
    loadList,
    startResource,
    retry,
    resetResource,
    refreshCurrentQuery,
    refreshAfterWrite,
    getLastQuery: () => ({ ...lastQuery }),
    hasConfig: () => config !== null,
    getState: () => ({ config, configLoading, listLoading, lastQuery: { ...lastQuery } }),
  }
}
