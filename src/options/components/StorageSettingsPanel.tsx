import React, { useState, useEffect } from 'react';
import { SettingsService } from '@/services/SettingsService';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';
import { FileSystemAdapter } from '@/storage/adapters/FileSystemAdapter';
import type { StorageSettings, StorageType, TestConnectionResult } from '@/types/settings';
import './SettingsPanel.css';

interface StorageSettingsPanelProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
}

/**
 * 存储设置面板
 */
const StorageSettingsPanel: React.FC<StorageSettingsPanelProps> = ({ onMessage }) => {
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  
  // 文件系统相关状态
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [pathValid, setPathValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');

  // 容量信息
  const [capacityInfo, setCapacityInfo] = useState<{
    used: number;
    total: number;
    usagePercent: number;
  } | null>(null);

  // 加载设置
  useEffect(() => {
    loadSettings();
    loadCapacity();
  }, []);

  const loadSettings = async () => {
    try {
      const storageSettings = await SettingsService.getStorageSettings();
      setSettings(storageSettings);
    } catch (error) {
      console.error('Failed to load storage settings:', error);
      onMessage('加载设置失败', 'error');
    }
  };

  const loadCapacity = async () => {
    try {
      const adapter = await SettingsService.createStorageAdapter();
      const capacity = await adapter.getCapacity();
      setCapacityInfo(capacity);
    } catch (error) {
      console.error('Failed to load capacity:', error);
    }
  };

  // 选择本地目录
  const handleSelectDirectory = async () => {
    try {
      // 检查浏览器支持
      if (!window.showDirectoryPicker) {
        onMessage('您的浏览器不支持文件系统访问，请使用 Chrome 86+ 或 Edge 86+', 'error');
        return;
      }

      // 打开目录选择器
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      setDirectoryHandle(handle);

      // 验证路径
      const validation = await SettingsService.validatePath(handle);
      setPathValid(validation.valid);
      setValidationMessage(
        validation.valid
          ? `✓ 路径有效: ${validation.info?.path}`
          : `✗ ${validation.error}`
      );

      if (validation.valid) {
        onMessage('路径验证成功', 'success');
      } else {
        onMessage(validation.error || '路径验证失败', 'error');
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // 用户取消选择
        return;
      }
      console.error('Failed to select directory:', error);
      onMessage('选择目录失败', 'error');
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!settings) return;

    setTesting(true);
    setTestResult(null);

    try {
      let adapter;

      if (settings.type === 'chrome') {
        adapter = new ChromeStorageAdapter();
      } else {
        // 文件系统存储
        if (!directoryHandle) {
          onMessage('请先选择存储目录', 'error');
          setTesting(false);
          return;
        }

        adapter = new FileSystemAdapter(directoryHandle);
      }

      const result = await SettingsService.testConnection(adapter);
      setTestResult(result);

      if (result.success) {
        onMessage(
          `连接成功！响应时间: ${result.responseTime}ms`,
          'success'
        );
      } else {
        onMessage(`连接失败: ${result.error}`, 'error');
      }
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : '测试连接失败',
        'error'
      );
    } finally {
      setTesting(false);
    }
  };

  // 切换存储方式
  const handleChangeStorageType = async (newType: StorageType) => {
    if (!settings) return;

    // 如果切换到文件系统存储，需要先选择目录
    if (newType === 'filesystem' && !directoryHandle) {
      onMessage('请先选择存储目录', 'error');
      return;
    }

    // 确认切换
    const confirmed = window.confirm(
      '切换存储方式可能需要迁移数据。\n\n' +
      '建议在切换前先导出备份数据。\n\n' +
      '是否继续？'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await SettingsService.switchStorageType(newType, directoryHandle || undefined);
      
      setSettings({ ...settings, type: newType });
      
      onMessage('存储方式已切换', 'success');
      
      // 重新加载容量信息
      await loadCapacity();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : '切换存储方式失败',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes === -1) return '无限制';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (!settings) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="settings-panel">
      <h1 className="panel-title">存储设置</h1>
      <p className="panel-desc">配置书签数据的存储方式</p>

      {/* 存储方式选择 */}
      <div className="settings-section">
        <h3 className="section-title">存储方式</h3>
        <div className="storage-options">
          <label className="storage-option">
            <input
              type="radio"
              name="storageType"
              value="chrome"
              checked={settings.type === 'chrome'}
              onChange={() => handleChangeStorageType('chrome')}
              disabled={loading}
            />
            <div className="option-content">
              <div className="option-header">
                <strong>浏览器存储</strong>
                <span className="badge badge-recommended">推荐</span>
              </div>
              <p className="option-desc">
                使用 Chrome 内置存储（chrome.storage.local）
              </p>
              <ul className="option-features">
                <li>✓ 无需配置，开箱即用</li>
                <li>✓ 性能优秀</li>
                <li>✗ 容量限制 10MB (约3000条书签)</li>
              </ul>
            </div>
          </label>

          <label className="storage-option">
            <input
              type="radio"
              name="storageType"
              value="filesystem"
              checked={settings.type === 'filesystem'}
              onChange={() => handleChangeStorageType('filesystem')}
              disabled={loading}
            />
            <div className="option-content">
              <div className="option-header">
                <strong>本地文件存储</strong>
                <span className="badge badge-advanced">高级</span>
              </div>
              <p className="option-desc">
                存储到本地文件系统
              </p>
              <ul className="option-features">
                <li>✓ 无容量限制</li>
                <li>✓ 便于备份</li>
                <li>✗ 需要手动选择目录</li>
                <li>✗ 需要授权文件访问权限</li>
              </ul>
            </div>
          </label>
        </div>
      </div>

      {/* 本地路径配置（仅文件系统存储时显示） */}
      {settings.type === 'filesystem' && (
        <div className="settings-section">
          <h3 className="section-title">存储路径</h3>
          <p className="section-desc">选择书签数据文件的存储位置</p>

          <div className="path-config">
            <div className="path-input-group">
              <input
                type="text"
                className="path-input"
                value={directoryHandle?.name || settings.localPath || '未选择'}
                readOnly
                placeholder="点击下方按钮选择目录"
              />
              <button
                className="btn btn-secondary"
                onClick={handleSelectDirectory}
                disabled={loading}
              >
                📁 选择目录
              </button>
            </div>

            {validationMessage && (
              <div className={`validation-message ${pathValid ? 'valid' : 'invalid'}`}>
                {validationMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 测试连接 */}
      <div className="settings-section">
        <h3 className="section-title">测试连接</h3>
        <p className="section-desc">测试当前存储配置是否正常工作</p>

        <button
          className="btn btn-secondary"
          onClick={handleTestConnection}
          disabled={testing || loading}
        >
          {testing ? '测试中...' : '🔍 测试连接'}
        </button>

        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? (
              <>
                <div className="result-icon">✓</div>
                <div className="result-content">
                  <strong>连接成功</strong>
                  <p>响应时间: {testResult.responseTime}ms</p>
                  {testResult.capacity && (
                    <p>
                      容量: {formatBytes(testResult.capacity.used)} / {formatBytes(testResult.capacity.total)}
                      {testResult.capacity.total !== -1 && ` (${testResult.capacity.usagePercent.toFixed(1)}%)`}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="result-icon">✗</div>
                <div className="result-content">
                  <strong>连接失败</strong>
                  <p>{testResult.error}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 存储容量统计 */}
      {capacityInfo && (
        <div className="settings-section">
          <h3 className="section-title">存储容量</h3>
          
          <div className="capacity-info">
            <div className="capacity-stats">
              <div className="stat-item">
                <span className="stat-label">已使用</span>
                <span className="stat-value">{formatBytes(capacityInfo.used)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">总容量</span>
                <span className="stat-value">{formatBytes(capacityInfo.total)}</span>
              </div>
            </div>

            {capacityInfo.total !== -1 && (
              <div className="capacity-bar">
                <div
                  className="capacity-fill"
                  style={{
                    width: `${capacityInfo.usagePercent}%`,
                    backgroundColor:
                      capacityInfo.usagePercent > 80 ? '#dc3545' :
                      capacityInfo.usagePercent > 60 ? '#ffc107' :
                      '#28a745'
                  }}
                />
              </div>
            )}

            {capacityInfo.total !== -1 && capacityInfo.usagePercent > 80 && (
              <div className="capacity-warning">
                ⚠️ 存储空间使用率较高，建议清理或导出数据
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageSettingsPanel;
