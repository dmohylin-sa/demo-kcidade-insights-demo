import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import enGB from 'antd/locale/en_GB';
import 'antd/dist/reset.css';
import { antdTheme } from './theme';
import './styles.css';
import App from './App';
import { DemoLoginGate } from './demo-login/DemoLoginGate';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoLoginGate>
      <ConfigProvider theme={antdTheme} locale={enGB}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </DemoLoginGate>
  </React.StrictMode>,
);
