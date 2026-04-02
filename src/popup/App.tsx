import React, { useState, useEffect } from 'react';
import { PasswordService } from '@/services';
import type { PasswordStatus } from '@/types';
import {
  WeakPasswordError,
  InvalidPasswordError,
  AccountLockedError
} from '@/types';
import { Popup } from './Popup';
import './App.css';

/**
 * Popup 主应用
 * 负责密码设置和解锁流程
 */
const App: React.FC = () => {
  const [status, setStatus] = useState<PasswordStatus | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // 加载密码状态
  useEffect(() => {
    loadPasswordStatus();
    checkUnlockStatus();
  }, []);

  const loadPasswordStatus = async () => {
    try {
      const passwordStatus = await PasswordService.getPasswordStatus();
      setStatus(passwordStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载状态失败');
    }
  };

  const checkUnlockStatus = () => {
    setIsUnlocked(PasswordService.isUnlocked());
  };

  // 设置主密码
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await PasswordService.setMasterPassword(password);
      setPassword('');
      setConfirmPassword('');
      await loadPasswordStatus();
      checkUnlockStatus();
      alert('主密码设置成功！');
    } catch (err) {
      if (err instanceof WeakPasswordError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : '设置密码失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 解锁
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await PasswordService.verifyMasterPassword(password);
      setPassword('');
      checkUnlockStatus();
      await loadPasswordStatus();
    } catch (err) {
      if (err instanceof InvalidPasswordError) {
        setError(`${err.message}，剩余尝试次数：${err.remainingAttempts}`);
      } else if (err instanceof AccountLockedError) {
        const seconds = Math.ceil((err.lockedUntil - Date.now()) / 1000);
        setError(`账户已锁定，请在 ${seconds} 秒后重试`);
      } else {
        setError(err instanceof Error ? err.message : '解锁失败');
      }
      await loadPasswordStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="app">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  // 未设置密码
  if (!status.isSet) {
    return (
      <div className="app">
        <div className="header">
          <h1>🔐 Encrypted Bookmark</h1>
          <p>首次使用，请设置主密码</p>
        </div>
        <form onSubmit={handleSetPassword} className="form">
          <div className="form-group">
            <label>主密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8-32 位字符"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              disabled={loading}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '设置中...' : '设置密码'}
          </button>
        </form>
        <div className="tips">
          <p>⚠️ 请牢记此密码，丢失后无法恢复数据</p>
        </div>
      </div>
    );
  }

  // 已锁定
  if (status.lockedUntil > Date.now()) {
    const seconds = Math.ceil((status.lockedUntil - Date.now()) / 1000);
    return (
      <div className="app">
        <div className="header">
          <h1>🔒 账户已锁定</h1>
          <p>密码错误次数过多</p>
        </div>
        <div className="locked-info">
          <p>请在 {seconds} 秒后重试</p>
          <p className="attempts">失败次数：{status.failedAttempts}</p>
        </div>
      </div>
    );
  }

  // 已解锁 → 渲染书签管理界面
  if (isUnlocked) {
    return <Popup />;
  }

  // 需要解锁
  return (
    <div className="app">
      <div className="header">
        <h1>🔐 Encrypted Bookmark</h1>
        <p>请输入主密码解锁</p>
      </div>
      <form onSubmit={handleUnlock} className="form">
        <div className="form-group">
          <label>主密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            disabled={loading}
            autoFocus
          />
        </div>
        {error && <div className="error">{error}</div>}
        {status.failedAttempts > 0 && (
          <div className="warning">
            ⚠️ 已失败 {status.failedAttempts} 次
            {status.failedAttempts >= 3 && '，请注意账户锁定风险'}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '验证中...' : '解锁'}
        </button>
      </form>
    </div>
  );
};

export default App;
