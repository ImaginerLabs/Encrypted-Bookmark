import React from "react";
import "./EmptyState.css";

/**
 * 空状态组件
 * 显示无数据或无搜索结果提示
 */

interface EmptyStateProps {
  type?: "no-bookmarks" | "no-results" | "no-folder";
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = "no-bookmarks",
  message,
}) => {
  const getDefaultMessage = () => {
    switch (type) {
      case "no-results":
        return "未找到匹配的书签";
      case "no-folder":
        return "该文件夹暂无书签";
      default:
        return "暂无书签，点击右上角 + 添加";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "no-results":
        return "🔍";
      case "no-folder":
        return "📂";
      default:
        return "📚";
    }
  };

  return (
    <div className="empty-state">
      <div className="empty-icon">{getIcon()}</div>
      <p className="empty-message">{message || getDefaultMessage()}</p>
      {type === "no-bookmarks" && (
        <p className="empty-hint">收藏你喜欢的网页，随时加密保存</p>
      )}
    </div>
  );
};
