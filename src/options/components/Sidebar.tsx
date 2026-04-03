import React from "react";
import "./Sidebar.css";

export type SettingsTab =
  | "basic"
  | "security"
  | "storage"
  | "import-export"
  | "about";

interface SidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

/**
 * 设置页侧边导航组件
 */
const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs: Array<{ id: SettingsTab; icon: string; label: string }> = [
    { id: "basic", icon: "⚙️", label: "基本设置" },
    { id: "security", icon: "🔒", label: "安全设置" },
    { id: "storage", icon: "💾", label: "存储设置" },
    { id: "import-export", icon: "🔄", label: "导入导出" },
    { id: "about", icon: "ℹ️", label: "关于" },
  ];

  return (
    <aside className="settings-sidebar">
      <div className="sidebar-header">
        <h2>🔐 Encrypted Bookmark</h2>
        <p className="version">v{__APP_VERSION__}</p>
      </div>
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar-icon">{tab.icon}</span>
            <span className="sidebar-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
