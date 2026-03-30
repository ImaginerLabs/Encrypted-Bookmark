import React, { useState, useCallback } from 'react';
import Sidebar, { SettingsTab } from './components/Sidebar';
import BasicSettingsPanel from './components/BasicSettingsPanel';
import SecuritySettingsPanel from './components/SecuritySettingsPanel';
import StorageSettingsPanel from './components/StorageSettingsPanel';
import ImportExportPanel from './components/ImportExportPanel';
import AboutPanel from './components/AboutPanel';
import './App.css';

/**
 * Options 设置页面主组件
 * 提供侧边导航和各个设置模块的切换
 */
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // 显示消息提示
  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  // 渲染当前激活的面板
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'basic':
        return <BasicSettingsPanel onMessage={showMessage} />;
      case 'security':
        return <SecuritySettingsPanel onMessage={showMessage} />;
      case 'storage':
        return <StorageSettingsPanel onMessage={showMessage} />;
      case 'import-export':
        return <ImportExportPanel onMessage={showMessage} />;
      case 'about':
        return <AboutPanel onMessage={showMessage} />;
      default:
        return <BasicSettingsPanel onMessage={showMessage} />;
    }
  };

  return (
    <div className="options-container">
      {/* 侧边导航 */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 主内容区 */}
      <main className="options-content">
        {/* 全局消息提示 */}
        {message && (
          <div className={`global-message message-${messageType}`}>
            {message}
          </div>
        )}

        {/* 渲染当前面板 */}
        {renderActivePanel()}
      </main>
    </div>
  );
};

export default App;
