import { useEffect } from "react";
import { LockService } from "@/services/LockService";
import { SettingsService } from "@/services/SettingsService";

/**
 * 锁定设置同步 Hook
 * 监听设置变更，同步 LockService 定时器
 */
export const useLockSettings = () => {
  useEffect(() => {
    // 初始化：读取当前设置并启动定时器
    const initLockTimer = async () => {
      try {
        const security = await SettingsService.getSecuritySettings();
        const currentSettings = await LockService.getLockSettings();

        // 同步 autoLockMinutes 到 LockService
        if (currentSettings.autoLockMinutes !== security.autoLockMinutes) {
          await LockService.setLockTimeout(security.autoLockMinutes);
        }

        // 启动定时器和活动监听
        await LockService.startTimer();
        LockService.startActivityListeners();
      } catch (error) {
        console.error("初始化锁定设置失败:", error);
      }
    };

    void initLockTimer();

    // 监听 storage 变更，实时同步设置
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== "local" || !changes.app_settings) return;

      const newSettings = changes.app_settings.newValue;
      if (newSettings?.security?.autoLockMinutes !== undefined) {
        void LockService.setLockTimeout(newSettings.security.autoLockMinutes);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      LockService.stopTimer();
    };
  }, []);
};
