import axios from 'axios'
import { message } from 'antd'

const request = axios.create({ baseURL: '/', timeout: 30000 })

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message
    if (status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    } else {
      message.error(msg || '请求失败')
    }
    return Promise.reject(err)
  }
)

export default request
