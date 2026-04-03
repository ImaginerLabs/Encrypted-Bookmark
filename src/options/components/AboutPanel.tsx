import React from "react";
import "./SettingsPanel.css";

interface AboutPanelProps {
  onMessage: (message: string, type: "success" | "error") => void;
}

/**
 * 关于面板
 */
const AboutPanel: React.FC<AboutPanelProps> = ({ onMessage }) => {
  const version = __APP_VERSION__;

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      "⚠️ 危险操作！\n\n" +
        "这将清除所有数据，包括：\n" +
        "- 主密码\n" +
        "- 所有书签\n" +
        "- 所有文件夹\n" +
        "- 所有标签\n" +
        "- 所有设置\n\n" +
        "此操作不可恢复，确定要继续吗？",
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm("请再次确认：是否要删除所有数据？");
    if (!doubleConfirm) return;

    try {
      await chrome.storage.local.clear();
      await chrome.storage.session.clear();
      onMessage("所有数据已清除，页面将在3秒后刷新", "success");

      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "重置失败", "error");
    }
  };

  return (
    <div className="settings-panel">
      <h1 className="panel-title">关于</h1>

      <div className="about-content">
        <div className="app-icon">🔐</div>

        <h2 className="app-name">Encrypted Bookmark</h2>
        <p className="app-version">版本 {version}</p>
        <p className="app-tagline">本地优先、隐私至上的书签管理工具</p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>AES-256-GCM 加密</h3>
            <p>军事级别的数据加密标准</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>PBKDF2 密钥派生</h3>
            <p>100,000 次迭代，防止暴力破解</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>本地存储</h3>
            <p>数据完全保存在本地，无网络请求</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>性能优秀</h3>
            <p>快速响应，流畅体验</p>
          </div>
        </div>

        <div className="info-section">
          <h3>技术栈</h3>
          <ul className="tech-list">
            <li>React 18 + TypeScript</li>
            <li>Chrome Extension Manifest V3</li>
            <li>Web Crypto API</li>
            <li>File System Access API</li>
          </ul>
        </div>

        <div className="info-section">
          <h3>开源许可</h3>
          <p>本项目采用 MIT 许可证</p>
          <p className="license-note">
            您可以自由使用、修改和分发本软件，但需保留版权声明
          </p>
        </div>

        <div className="info-section">
          <h3>隐私政策</h3>
          <ul className="privacy-list">
            <li>✓ 不收集任何用户数据</li>
            <li>✓ 不上传任何数据到服务器</li>
            <li>✓ 不使用任何追踪技术</li>
            <li>✓ 完全离线工作</li>
          </ul>
        </div>

        <div className="danger-section">
          <h3>⚠️ 危险操作区</h3>
          <p className="danger-warning">
            以下操作将清除所有数据且不可恢复，请谨慎操作
          </p>
          <button className="btn btn-danger" onClick={handleResetAll}>
            重置所有数据
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutPanel;
