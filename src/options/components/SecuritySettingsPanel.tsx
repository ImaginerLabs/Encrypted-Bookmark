import React, { useState, useEffect } from 'react';
import { SettingsService } from '@/services/SettingsService';
import { PasswordService } from '@/services/PasswordService';
import type { SecuritySettings, PasswordStrengthLevel } from '@/types/settings';
import './SettingsPanel.css';

interface SecuritySettingsPanelProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
}

/**
 * 安全设置面板
 */
const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ onMessage }) => {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(false);

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<{
    level: PasswordStrengthLevel;
    score: number;
    feedback: string[];
  } | null>(null);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  // 监听新密码变化，评估强度
  useEffect(() => {
    if (newPassword) {
      const strength = SettingsService.evaluatePasswordStrength(newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

  const loadSettings = async () => {
    try {
      const securitySettings = await SettingsService.getSecuritySettings();
      setSettings(securitySettings);
    } catch (error) {
      console.error('Failed to load security settings:', error);
      onMessage('加载设置失败', 'error');
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      await SettingsService.saveSecuritySettings(settings);
      onMessage('保存成功！', 'success');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!oldPassword || !newPassword || !confirmPassword) {
      onMessage('请填写完整的密码信息', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      onMessage('两次输入的新密码不一致', 'error');
      return;
    }

    if (newPassword === oldPassword) {
      onMessage('新密码不能与旧密码相同', 'error');
      return;
    }

    // 检查密码强度
    if (passwordStrength && passwordStrength.level === 'weak') {
      const confirm = window.confirm(
        '您的密码强度较弱，建议使用更强的密码。是否继续？'
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      await PasswordService.changeMasterPassword(oldPassword, newPassword);
      
      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(null);
      
      onMessage('密码修改成功！', 'success');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '修改密码失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="settings-panel">
      <h1 className="panel-title">安全设置</h1>
      <p className="panel-desc">管理密码和安全选项</p>

      {/* 修改密码 */}
      <div className="settings-section">
        <h3 className="section-title">修改主密码</h3>
        <p className="section-desc">修改密码后需要重新加密所有数据</p>
        
        <form onSubmit={handleChangePassword} className="password-form">
          <div className="form-group">
            <label>当前密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="输入当前密码"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8-32位字符"
              disabled={loading}
              autoComplete="new-password"
            />
            {passwordStrength && (
              <div className={`password-strength strength-${passwordStrength.level}`}>
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                <div className="strength-text">
                  密码强度: {
                    passwordStrength.level === 'strong' ? '强' :
                    passwordStrength.level === 'medium' ? '中等' : '弱'
                  }
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="strength-feedback">
                    {passwordStrength.feedback.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
          >
            {loading ? '修改中...' : '修改密码'}
          </button>
        </form>
      </div>

      {/* 自动锁定 */}
      <div className="settings-section">
        <h3 className="section-title">自动锁定</h3>
        <p className="section-desc">无操作一段时间后自动锁定</p>
        
        <select
          className="settings-select"
          value={settings.autoLockMinutes}
          onChange={(e) => setSettings({ ...settings, autoLockMinutes: Number(e.target.value) })}
          disabled={loading}
        >
          <option value={0}>永不锁定</option>
          <option value={5}>5 分钟</option>
          <option value={15}>15 分钟</option>
          <option value={30}>30 分钟</option>
          <option value={60}>1 小时</option>
        </select>
      </div>

      {/* 浏览器关闭时锁定 */}
      <div className="settings-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.lockOnBrowserClose}
            onChange={(e) => setSettings({ ...settings, lockOnBrowserClose: e.target.checked })}
            disabled={loading}
          />
          <span>浏览器关闭时自动锁定</span>
        </label>
      </div>

      {/* 密码提示 */}
      <div className="settings-section">
        <h3 className="section-title">密码提示（可选）</h3>
        <p className="section-desc">设置密码提示可以帮助您记住密码，但请勿包含密码本身</p>
        
        <input
          type="text"
          className="settings-input"
          value={settings.passwordHint || ''}
          onChange={(e) => setSettings({ ...settings, passwordHint: e.target.value })}
          placeholder="例如: 我的生日+宠物名字"
          disabled={loading}
          maxLength={100}
        />
      </div>

      <div className="panel-actions">
        <button
          className="btn btn-primary"
          onClick={handleSaveSettings}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
