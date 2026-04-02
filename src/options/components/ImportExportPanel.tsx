import React, { useState, useEffect } from 'react';
import { PasswordService } from '@/services';
import { InvalidPasswordError, AccountLockedError } from '@/types';
import ImportSection from './ImportSection';
import ExportSection from './ExportSection';
import './SettingsPanel.css';

interface ImportExportPanelProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
}

/**
 * 导入导出面板
 * 集成导入和导出功能
 */
const ImportExportPanel: React.FC<ImportExportPanelProps> = ({ onMessage }) => {
  const [masterKey, setMasterKey] = useState<string>('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // 获取 masterKey
  useEffect(() => {
    const key = sessionStorage.getItem('masterKey');
    if (key) {
      setMasterKey(key);
    }
  }, []);

  // 解锁
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    setUnlocking(true);

    try {
      await PasswordService.verifyMasterPassword(unlockPassword);
      setUnlockPassword('');
      // 同步到 sessionStorage
      try { sessionStorage.setItem('masterKey', unlockPassword); } catch { /* ignore */ }
      setMasterKey(unlockPassword);
    } catch (err) {
      if (err instanceof InvalidPasswordError) {
        setUnlockError(`密码错误，剩余尝试次数：${err.remainingAttempts}`);
      } else if (err instanceof AccountLockedError) {
        const seconds = Math.ceil((err.lockedUntil - Date.now()) / 1000);
        setUnlockError(`账户已锁定，请在 ${seconds} 秒后重试`);
      } else {
        setUnlockError(err instanceof Error ? err.message : '解锁失败');
      }
    } finally {
      setUnlocking(false);
    }
  };

  // 如果没有 masterKey，显示解锁表单
  if (!masterKey) {
    return (
      <div className="settings-panel">
        <div className="panel-header">
          <h2>🔄 导入导出</h2>
          <p>备份和迁移您的书签数据</p>
        </div>
        <div className="panel-content">
          <div className="info-box">
            <p>⚠️ 请先登录后再使用导入导出功能</p>
          </div>
          <form onSubmit={handleUnlock} className="unlock-form" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label htmlFor="options-unlock-password">主密码</label>
              <input
                id="options-unlock-password"
                type="password"
                placeholder="输入密码"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                disabled={unlocking}
                autoFocus
              />
            </div>
            {unlockError && <div className="error">{unlockError}</div>}
            <button type="submit" className="btn btn-primary" disabled={unlocking || !unlockPassword}>
              {unlocking ? '验证中...' : '解锁'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>🔄 导入导出</h2>
        <p>备份和迁移您的书签数据</p>
      </div>

      <div className="panel-content">
        {/* 导入区域 */}
        <ImportSection onMessage={onMessage} masterKey={masterKey} />

        {/* 分隔线 */}
        <div className="section-divider" />

        {/* 导出区域 */}
        <ExportSection onMessage={onMessage} masterKey={masterKey} />

        {/* 使用提示 */}
        <div className="settings-section">
          <h3>💡 使用提示</h3>
          <div className="tips-container">
            <div className="tip-item">
              <span className="tip-icon">📌</span>
              <div className="tip-content">
                <strong>定期备份</strong>
                <p>建议每月导出一次加密备份，防止数据丢失</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔄</span>
              <div className="tip-content">
                <strong>迁移浏览器书签</strong>
                <p>从 Chrome 导出 HTML → 导入本插件 → 开始使用</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🔐</span>
              <div className="tip-content">
                <strong>加密密钥管理</strong>
                <p>导出时可设置独立密钥，方便分享或跨设备同步</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-icon">⚠️</span>
              <div className="tip-content">
                <strong>覆盖导入风险</strong>
                <p>覆盖模式会删除所有现有数据，请谨慎使用</p>
              </div>
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div className="settings-section">
          <h3>❓ 常见问题</h3>
          <div className="faq-container">
            <details className="faq-item">
              <summary>如何从 Chrome 导入原生书签？</summary>
              <p>
                1. 打开 Chrome，进入「书签管理器」（Ctrl+Shift+O）
                <br />
                2. 点击右上角「⋮」→「导出书签」，保存为 HTML 文件
                <br />
                3. 在本插件选择「Chrome HTML 书签」格式，导入该文件
              </p>
            </details>
            <details className="faq-item">
              <summary>导出的 PBM 文件可以用在其他设备吗？</summary>
              <p>
                可以。PBM 是本插件的专用备份格式，包含完整的书签、文件夹和标签数据。
                只需在其他设备安装本插件，导入 PBM 文件即可恢复所有数据。
              </p>
            </details>
            <details className="faq-item">
              <summary>忘记加密密钥怎么办？</summary>
              <p>
                很遗憾，加密文件无法在不知道密钥的情况下解密。建议：
                <br />
                1. 导出时使用当前登录密码（默认选项）
                <br />
                2. 如果设置了独立密钥，请务必记录保存
                <br />
                3. 可以同时导出明文 JSON 作为后备方案
              </p>
            </details>
            <details className="faq-item">
              <summary>合并模式如何去重？</summary>
              <p>
                合并模式会按照 URL 进行去重。如果导入的书签 URL 与现有书签相同，
                将跳过该书签，保留原有数据。文件夹和标签按名称合并。
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExportPanel;
