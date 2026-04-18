import React, { useState, useEffect } from 'react';
import { SettingsService } from '@/services/SettingsService';
import { FolderService } from '@/services/FolderService';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';
import { PasswordService } from '@/services/PasswordService';
import { SessionService } from '@/services/SessionService';
import type { BasicSettings } from '@/types/settings';
import type { Folder } from '@/types/data';
import './SettingsPanel.css';

interface BasicSettingsPanelProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
}

/**
 * 基本设置面板
 */
const BasicSettingsPanel: React.FC<BasicSettingsPanelProps> = ({ onMessage }) => {
  const [settings, setSettings] = useState<BasicSettings | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载设置和文件夹列表
  useEffect(() => {
    const loadData = async () => {
      try {
        // 检查会话状态并恢复 masterKey
        const unlocked = await PasswordService.checkAndRestoreSession();
        if (!unlocked) {
          // 未解锁，使用空文件夹列表
          setFolders([]);
          const [basicSettings] = await Promise.all([
            SettingsService.getBasicSettings()
          ]);
          setSettings(basicSettings);
          return;
        }

        // 获取 masterKey
        const masterKey = await SessionService.getSessionKey();
        if (!masterKey) {
          setFolders([]);
          const [basicSettings] = await Promise.all([
            SettingsService.getBasicSettings()
          ]);
          setSettings(basicSettings);
          return;
        }

        // 创建 FolderService 实例并设置 masterKey
        const folderStorage = ChromeStorageAdapter.getFolderInstance();
        const bookmarkStorage = ChromeStorageAdapter.getInstance();
        const folderService = new FolderService(folderStorage, bookmarkStorage);
        folderService.setMasterKey(masterKey);

        // 并行加载设置和文件夹列表
        const [basicSettings, folderResult] = await Promise.all([
          SettingsService.getBasicSettings(),
          folderService.getFolders()
        ]);

        setSettings(basicSettings);
        if (folderResult.success && folderResult.data) {
          setFolders(folderResult.data);
        }
      } catch (error) {
        console.error('Failed to load basic settings:', error);
        onMessage('加载设置失败', 'error');
      }
    };

    loadData();
  }, [onMessage]);

  const handleSave = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      await SettingsService.saveBasicSettings(settings);
      onMessage('保存成功！', 'success');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="settings-panel">
      <h1 className="panel-title">基本设置</h1>
      <p className="panel-desc">配置书签管理的基本选项</p>

      <div className="settings-section">
        <h3 className="section-title">默认文件夹</h3>
        <p className="section-desc">新建书签时默认保存到的文件夹</p>
        <select
          className="settings-select"
          value={settings.defaultFolderId}
          onChange={(e) => setSettings({ ...settings, defaultFolderId: e.target.value })}
          disabled={loading}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-section">
        <h3 className="section-title">打开方式</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.openInNewTab}
            onChange={(e) => setSettings({ ...settings, openInNewTab: e.target.checked })}
            disabled={loading}
          />
          <span>在新标签页中打开书签</span>
        </label>
      </div>

      <div className="settings-section">
        <h3 className="section-title">主题</h3>
        <p className="section-desc">选择界面主题</p>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={settings.theme === 'light'}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
              disabled={loading}
            />
            <span>浅色</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={settings.theme === 'dark'}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
              disabled={loading}
            />
            <span>深色</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="theme"
              value="auto"
              checked={settings.theme === 'auto'}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
              disabled={loading}
            />
            <span>跟随系统</span>
          </label>
        </div>
      </div>

      <div className="panel-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default BasicSettingsPanel;
