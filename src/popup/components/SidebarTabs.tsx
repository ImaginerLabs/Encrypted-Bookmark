import React from "react";
import "./SidebarTabs.css";

/**
 * 侧边栏 Tab 切换组件
 * 支持"文件夹"和"标签"两个视图切换
 */

export type SidebarTabType = "folders" | "tags";

interface SidebarTabsProps {
  /** 当前激活的 Tab */
  activeTab: SidebarTabType;
  /** Tab 切换回调 */
  onTabChange: (tab: SidebarTabType) => void;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="sidebar-tabs">
      <button
        className={`sidebar-tab ${activeTab === "folders" ? "active" : ""}`}
        onClick={() => onTabChange("folders")}
        title="文件夹"
      >
        <span className="sidebar-tab-icon">📁</span>
        <span className="sidebar-tab-label">文件夹</span>
      </button>
      <button
        className={`sidebar-tab ${activeTab === "tags" ? "active" : ""}`}
        onClick={() => onTabChange("tags")}
        title="标签"
      >
        <span className="sidebar-tab-icon">🏷️</span>
        <span className="sidebar-tab-label">标签</span>
      </button>
    </div>
  );
};
