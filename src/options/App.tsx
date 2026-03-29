import React, { useState, useEffect, useCallback } from 'react';
import { PasswordService } from '@/services';
import type { PasswordStatus } from '@/types';
import './App.css';

/**
 * Options 设置页面
 * 提供密码管理和数据管理功能
 */
const App: React.FC = () => {
  const [status, setStatus] = useState<PasswordStatus | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  const showMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const loadPasswordStatus = useCallback(async () => {
    try {
      const passwordStatus = await PasswordService.getPasswordStatus();
      setStatus(passwordStatus);
    } catch {
      showMessage('加载状态失败', 'error');
    }
  }, [showMessage]);

  useEffect(() => {
    loadPasswordStatus();
  }, [loadPasswordStatus]);

  // 修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showMessage('两次输入的新密码不一致', 'error');
      return;
    }

    setLoading(true);
    try {
      await PasswordService.changeMasterPassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showMessage('密码修改成功！', 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '修改密码失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 重置所有数据
  const handleResetAll = async () => {
    const confirmed = window.confirm(
      '⚠️ 危险操作！\n\n这将清除所有数据，包括：\n- 主密码\n- 所有书签\n- 所有文件夹\n- 所有标签\n\n此操作不可恢复，确定要继续吗？'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm('请再次确认：是否要删除所有数据？');
    if (!doubleConfirm) return;

    try {
      await PasswordService.resetAll();
      showMessage('所有数据已清除', 'success');
      await loadPasswordStatus();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '重置失败', 'error');
    }
  };

  if (!status) {
    return (
      <div className="options-app">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="options-app">
      <header className="options-header">
        <h1>🔐 Private BookMark</h1>
        <p>设置与管理</p>
      </header>

      <main className="options-main">
        {message && (
          <div className={`message message-${messageType}`}>
            {message}
          </div>
        )}

        {/* 密码状态 */}
        <section className="section">
          <h2>密码状态</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">密码设置：</span>
              <span className={status.isSet ? 'status-yes' : 'status-no'}>
                {status.isSet ? '已设置 ✓' : '未设置'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">锁定状态：</span>
              <span className={status.lockedUntil > Date.now() ? 'status-locked' : 'status-normal'}>
                {status.lockedUntil > Date.now() ? '已锁定 🔒' : '正常'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">失败次数：</span>
              <span className={status.failedAttempts > 0 ? 'status-warning' : ''}>
                {status.failedAttempts}
              </span>
            </div>
          </div>
        </section>

        {/* 修改密码 */}
        {status.isSet && (
          <section className="section">
            <h2>修改主密码</h2>
            <form onSubmit={handleChangePassword} className="form">
              <div className="form-group">
                <label>当前密码</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="输入当前密码"
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-32 位字符"
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '修改中...' : '修改密码'}
              </button>
            </form>
          </section>
        )}

        {/* 数据管理 */}
        <section className="section">
          <h2>数据管理</h2>
          <div className="danger-zone">
            <h3>⚠️ 危险操作区</h3>
            <p>以下操作将清除所有数据且不可恢复</p>
            <button onClick={handleResetAll} className="btn btn-danger">
              重置所有数据
            </button>
          </div>
        </section>

        {/* 关于 */}
        <section className="section">
          <h2>关于</h2>
          <div className="about">
            <p><strong>Private BookMark</strong></p>
            <p>Version: 1.0.0</p>
            <p>本地优先、隐私至上的书签管理工具</p>
            <ul>
              <li>✓ AES-256-GCM 加密</li>
              <li>✓ PBKDF2 密钥派生（100000 次迭代）</li>
              <li>✓ 数据完全本地存储</li>
              <li>✓ 零网络请求</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
