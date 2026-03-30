import { useState, useEffect } from 'react';

/**
 * 当前标签页信息 Hook
 * 使用 Chrome Tabs API 获取当前活动标签页的标题和 URL
 */
export const useCurrentTab = () => {
  const [currentTab, setCurrentTab] = useState<{ title: string; url: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0]) {
          setCurrentTab({
            title: tabs[0].title || '',
            url: tabs[0].url || ''
          });
        }
      } catch (err) {
        console.error('获取当前标签页失败:', err);
        setCurrentTab(null);
      } finally {
        setLoading(false);
      }
    };

    getCurrentTab();
  }, []);

  return { currentTab, loading };
};
