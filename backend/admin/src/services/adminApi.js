import request from '../utils/request'

// Auth
export const adminLogin = (data) => request.post('/admin/auth/login', data)

// Stats
export const getOverviewStats = () => request.get('/admin/stats/overview')
export const getChartData = () => request.get('/admin/stats/chart')

// Users
export const getUsers = (params) => request.get('/admin/users', { params })
export const updateUser = (id, data) => request.put(`/admin/users/${id}`, data)
export const deleteUser = (id) => request.delete(`/admin/users/${id}`)

// Contents
export const getContents = (params) => request.get('/admin/contents', { params })
export const createContent = (data) => request.post('/admin/contents', data)
export const updateContent = (id, data) => request.put(`/admin/contents/${id}`, data)
export const deleteContent = (id) => request.delete(`/admin/contents/${id}`)

// AI
export const getAIStatus = () => request.get('/admin/ai/status')
export const getAIStats = () => request.get('/admin/ai/stats')
export const getConversations = (params) => request.get('/admin/ai/conversations', { params })
export const deleteConversation = (id) => request.delete(`/admin/ai/conversations/${id}`)

// Challenges
export const getChallenges = (params) => request.get('/admin/challenges', { params })
export const createChallenge = (data) => request.post('/admin/challenges', data)
export const updateChallenge = (id, data) => request.put(`/admin/challenges/${id}`, data)
export const deleteChallenge = (id) => request.delete(`/admin/challenges/${id}`)

// Community
export const getAdminWorks = (params) => request.get('/admin/works', { params })
export const deleteAdminWork = (id) => request.delete(`/admin/works/${id}`)
export const getComments = (params) => request.get('/admin/comments', { params })
export const deleteComment = (id) => request.delete(`/admin/comments/${id}`)

// Achievements
export const getAchievements = () => request.get('/admin/achievements')
export const createAchievement = (data) => request.post('/admin/achievements', data)
export const updateAchievement = (id, data) => request.put(`/admin/achievements/${id}`, data)
export const deleteAchievement = (id) => request.delete(`/admin/achievements/${id}`)

// API switches
export const getApiSwitches = () => request.get('/admin/apis')
export const toggleApiSwitch = (key) => request.put('/admin/apis/toggle', { key })
export const testApi = (data) => request.post('/admin/apis/test', data)

// System
export const getSystemHealth = () => request.get('/admin/system/health')
export const getSettings = () => request.get('/admin/settings')
export const updateSettings = (data) => request.put('/admin/settings', data)
