import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#167d5b',
          borderRadius: 6,
          colorInfo: '#2468b2',
          colorSuccess: '#2f8a45',
          colorWarning: '#b7791f',
          colorError: '#c24138',
          fontFamily: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#f5f7f6',
            siderBg: '#ffffff',
            headerBg: '#ffffff',
          },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemColor: '#42554d',
            itemHoverColor: '#167d5b',
            itemHoverBg: '#eef5f1',
            itemSelectedColor: '#167d5b',
            itemSelectedBg: '#e7f2ec',
            itemActiveBg: '#e7f2ec',
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
)
