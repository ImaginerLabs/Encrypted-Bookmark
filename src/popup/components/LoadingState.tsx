import React from 'react';
import './LoadingState.css';

/**
 * 加载状态组件
 * 显示骨架屏或加载动画
 */
export const LoadingState: React.FC = () => {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p className="loading-text">加载中...</p>
    </div>
  );
};
