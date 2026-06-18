import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
  Upload,
} from 'antd'
import { ReloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import { message } from '../api/feedback.js'
import { API_BASE, api } from '../api/request.js'

const { Title, Paragraph, Text } = Typography

const STARTUP_AD_IMAGE_KEY = 'app-fullscreen-ad'

// 站点图 key -> 中文用途，便于管理员辨认每张图的使用场景。
const LABELS = {
  [STARTUP_AD_IMAGE_KEY]: 'App 启动全屏广告',
  'admin-login-bg': '管理后台登录页背景',
  'auth-hero': '登录/注册页顶图',
  'smart-farming': '首页 · 智慧种植横幅',
  'farm-market': '首页 · 乡村集市横幅',
  'machinery-sharing': '首页/农机 · 共享横幅',
  'farmland-map': '农机 · 农田地图底图',
  'rural-life': '乡村生活页顶图',
  'rural-tourism': '乡村生活 · 乡村旅游图',
  'weather-monitoring': '设置 · 气象监测横幅',
  'policy-support': '政策 · 惠农政策配图',
  'community-learning': '政策 · 党建学习配图',
  'village-honor': '政策 · 文明乡风配图',
  'farmlink-mark': '品牌标识 Logo',
  'product-rice': '商品 · 香米',
  'product-citrus': '商品 · 柑橘',
  'product-tomato': '商品 · 番茄',
  'product-vegetable-box': '商品 · 蔬菜礼盒',
  'product-sweet-potato': '商品 · 红薯干',
  'product-eggs': '商品 · 土鸡蛋',
  'product-corn': '商品 · 玉米',
  'product-asparagus': '商品 · 芦笋',
}

function resolveUrl(imageUrl) {
  if (!imageUrl) return ''
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl
  const apiOrigin = new URL(API_BASE, window.location.origin).origin
  const path = String(imageUrl).startsWith('/') ? imageUrl : `/${imageUrl}`
  return `${apiOrigin}${path}`
}

export default function SiteImagePage() {
  const [form] = Form.useForm()
  const selectedImageKey = Form.useWatch('imageKey', form)
  const [loading, setLoading] = useState(true)
  const [adLoading, setAdLoading] = useState(true)
  const [adSaving, setAdSaving] = useState(false)
  const [startupAd, setStartupAd] = useState(null)
  const [images, setImages] = useState([])
  // 上传成功后用时间戳打破浏览器对同名图的缓存。
  const [bust, setBust] = useState({})
  const [uploadingKey, setUploadingKey] = useState('')

  const imageOptions = useMemo(() => {
    const keys = new Set([STARTUP_AD_IMAGE_KEY, ...images.map((item) => item.key)])
    return [...keys]
      .sort((a, b) => (LABELS[a] || a).localeCompare(LABELS[b] || b, 'zh-Hans-CN'))
      .map((key) => ({ value: key, label: `${LABELS[key] || key}（${key}）` }))
  }, [images])

  const selectedImage = images.find((item) => item.key === selectedImageKey)
  const previewUrl = resolveUrl(selectedImage?.url || startupAd?.imageUrl)

  async function loadImages() {
    setLoading(true)
    try {
      const data = await api.get('/site/images')
      const map = data?.images || {}
      const list = Object.entries(map)
        .map(([key, url]) => ({ key, url }))
        .sort((a, b) => (LABELS[a.key] || a.key).localeCompare(LABELS[b.key] || b.key, 'zh-Hans-CN'))
      setImages(list)
    } catch {
      // request 已统一弹错
    } finally {
      setLoading(false)
    }
  }

  async function loadStartupAd() {
    setAdLoading(true)
    try {
      const data = await api.get('/admin/site/startup-ad')
      setStartupAd(data)
      form.setFieldsValue({
        enabled: data?.enabled !== false,
        imageKey: data?.imageKey || STARTUP_AD_IMAGE_KEY,
        durationSeconds: data?.durationSeconds || 5,
        targetPath: data?.targetPath || '/home',
      })
    } catch {
      // request 已统一弹错
    } finally {
      setAdLoading(false)
    }
  }

  async function loadAll() {
    await Promise.all([loadImages(), loadStartupAd()])
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleUpload(key, file) {
    setUploadingKey(key)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/site/images/${key}`, formData)
      message.success(`「${LABELS[key] || key}」已更新，前端下次加载即生效`)
      setBust((prev) => ({ ...prev, [key]: Date.now() }))
      await Promise.all([loadImages(), key === selectedImageKey ? loadStartupAd() : Promise.resolve()])
    } catch {
      // request 已统一弹错
    } finally {
      setUploadingKey('')
    }
    return false
  }

  async function saveStartupAd(values) {
    setAdSaving(true)
    try {
      const data = await api.put('/admin/site/startup-ad', values)
      setStartupAd(data)
      form.setFieldsValue(data)
      message.success('启动广告配置已保存')
    } catch {
      // request 已统一弹错
    } finally {
      setAdSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>站点配图</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            App 启动广告、引导页、首页横幅、登录页、商品、政策等配图统一由后端托管。
            上传替换后，移动端下次加载即可实时更新，无需重新发布 App。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
      </div>

      <Card
        title="App 启动广告"
        extra={
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => handleUpload(selectedImageKey || STARTUP_AD_IMAGE_KEY, file)}
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploadingKey === (selectedImageKey || STARTUP_AD_IMAGE_KEY)}
            >
              上传当前广告图
            </Button>
          </Upload>
        }
        style={{ marginBottom: 16 }}
      >
        <Spin spinning={adLoading}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              <div style={{ height: 220, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8 }}>
                {previewUrl ? (
                  <img
                    src={previewUrl + (bust[selectedImageKey] ? `?t=${bust[selectedImageKey]}` : '')}
                    alt="启动广告预览"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无广告图" />
                )}
              </div>
            </Col>
            <Col xs={24} md={16}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  enabled: true,
                  imageKey: STARTUP_AD_IMAGE_KEY,
                  durationSeconds: 5,
                  targetPath: '/home',
                }}
                onFinish={saveStartupAd}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="enabled" label="是否展示" valuePropName="checked">
                      <Switch checkedChildren="展示" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="durationSeconds"
                      label="展示时间（秒）"
                      rules={[{ required: true, message: '请输入展示秒数' }]}
                    >
                      <InputNumber min={1} max={60} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      name="imageKey"
                      label="广告图"
                      rules={[{ required: true, message: '请选择广告图' }]}
                    >
                      <Select options={imageOptions} />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item name="targetPath" label="跳转路径">
                      <Input placeholder="/home" />
                    </Form.Item>
                  </Col>
                </Row>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={adSaving}>
                    保存广告配置
                  </Button>
                  <Text type="secondary">移动端会按这里的秒数显示右上角倒计时。</Text>
                </Space>
              </Form>
            </Col>
          </Row>
        </Spin>
      </Card>

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
