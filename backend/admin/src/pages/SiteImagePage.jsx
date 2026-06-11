import { useEffect, useState } from 'react'
import { Button, Card, Col, Empty, message, Row, Space, Spin, Typography, Upload } from 'antd'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { API_BASE, api } from '../api/request.js'

const { Title, Paragraph, Text } = Typography

// 站点图 key → 中文说明，便于管理员辨认每张图的用途。
const LABELS = {
  'auth-hero': '登录/注册顶图',
  'smart-farming': '首页·智慧种植横幅',
  'farm-market': '首页·乡村集市横幅',
  'machinery-sharing': '首页/农机·共享横幅',
  'farmland-map': '农机·农田地图底图',
  'rural-life': '乡村生活顶图',
  'rural-tourism': '乡村生活·乡村旅游图',
  'weather-monitoring': '设置·气象监测横幅',
  'policy-support': '政策·惠农政策配图',
  'community-learning': '政策·党建学习配图',
  'village-honor': '政策·文明乡风配图',
  'farmlink-mark': '品牌标识 Logo',
  'product-rice': '商品·香米',
  'product-citrus': '商品·柑橘',
  'product-tomato': '商品·番茄',
  'product-vegetable-box': '商品·蔬菜礼盒',
  'product-sweet-potato': '商品·红薯干',
  'product-eggs': '商品·土鸡蛋',
  'product-corn': '商品·玉米',
  'product-asparagus': '商品·芦笋',
}

function resolveUrl(imageUrl) {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const apiOrigin = new URL(API_BASE, window.location.origin).origin
  const path = String(imageUrl).startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${apiOrigin}${path}`
}

export default function SiteImagePage() {
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState([])
  // 上传成功后用时间戳打破浏览器对同名图的缓存
  const [bust, setBust] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await api.get('/site/images')
      const map = data?.images || {}
      const list = Object.entries(map)
        .map(([key, url]) => ({ key, url }))
        .sort((a, b) => a.key.localeCompare(b.key))
      setImages(list)
    } catch {
      // request 已统一弹错
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(key, file) {
    setUploadingKey(key)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/site/images/${key}`, form)
      message.success(`「${LABELS[key] || key}」已更新，前端下次加载即生效`)
      setBust((prev) => ({ ...prev, [key]: Date.now() }))
      await load()
    } catch {
      // request 已统一弹错
    } finally {
      setUploadingKey('')
    }
    return false
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>站点配图</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            App 引导页、首页横幅、登录、商品、政策等配图统一由后端托管。
            在此上传替换后，移动端下次加载即实时更新，无需重新发布 App。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </div>

      <Spin spinning={loading}>
        {!loading && images.length === 0 ? (
          <Empty description="暂无站点图，请确认 backend/uploads/site/ 目录" />
        ) : (
          <Row gutter={[16, 16]}>
            {images.map(({ key, url }) => {
              const src = resolveUrl(url) + (bust[key] ? `?t=${bust[key]}` : '')
              return (
                <Col key={key} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    cover={
                      <div style={{ height: 150, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={src} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    }
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text strong>{LABELS[key] || key}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{key}</Text>
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={(file) => handleUpload(key, file)}
                      >
                        <Button
                          size="small"
                          icon={<UploadOutlined />}
                          loading={uploadingKey === key}
                          block
                        >
                          上传替换
                        </Button>
                      </Upload>
                    </Space>
                  </Card>
                </Col>
              )
            })}
          </Row>
        )}
      </Spin>
    </div>
  )
}
