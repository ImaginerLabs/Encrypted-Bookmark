import type {
  AppSettings,
  StorageSettings,
  SecuritySettings,
  BasicSettings,
  PathValidationResult,
  TestConnectionResult,
  PasswordStrengthInfo
} from '@/types/settings';
import { PasswordStrengthLevel } from '@/types/settings';
import { StorageError } from '@/types/errors';
import type { IStorageAdapter, StorageCapacityInfo } from '@/storage/interfaces/IStorageAdapter';
import { FileSystemAdapter } from '@/storage/adapters/FileSystemAdapter';
import { ChromeStorageAdapter } from '@/storage/adapters/ChromeStorageAdapter';

/**
 * 设置管理服务
 * 负责应用设置的读取、保存、验证和测试
 */
export class SettingsService {
  /** 存储键: 应用设置 */
  private static readonly STORAGE_KEY = 'app_settings';

  /** 默认设置 */
  private static readonly DEFAULT_SETTINGS: AppSettings = {
    storage: {
      type: 'chrome'
    },
    security: {
      autoLockMinutes: 15,
      lockOnBrowserClose: true
    },
    basic: {
      defaultFolderId: 'root',
      openInNewTab: true,
      theme: 'auto'
    }
  };

  /**
   * 获取应用设置
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const settings = result[this.STORAGE_KEY] as AppSettings | undefined;

      if (!settings) {
        return this.DEFAULT_SETTINGS;
      }

      // 合并默认设置（防止缺失字段）
      return {
        storage: { ...this.DEFAULT_SETTINGS.storage, ...settings.storage },
        security: { ...this.DEFAULT_SETTINGS.security, ...settings.security },
        basic: { ...this.DEFAULT_SETTINGS.basic, ...settings.basic }
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  /**
   * 保存应用设置
   */
  static async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings: AppSettings = {
        storage: { ...currentSettings.storage, ...settings.storage },
        security: { ...currentSettings.security, ...settings.security },
        basic: { ...currentSettings.basic, ...settings.basic }
      };

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: newSettings
      });
    } catch (error) {
      throw new StorageError('保存设置失败', error);
    }
  }

  /**
   * 获取存储设置
   */
  static async getStorageSettings(): Promise<StorageSettings> {
    const settings = await this.getSettings();
    return settings.storage;
  }

  /**
   * 保存存储设置
   */
  static async saveStorageSettings(storage: Partial<StorageSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    await this.saveSettings({ 
      storage: { ...currentSettings.storage, ...storage }
    });
  }

  /**
   * 获取安全设置
   */
  static async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await this.getSettings();
    return settings.security;
  }

  /**
   * 保存安全设置
   */
  static async saveSecuritySettings(security: Partial<SecuritySettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    await this.saveSettings({ 
      security: { ...currentSettings.security, ...security }
    });
  }

  /**
   * 获取基本设置
   */
  static async getBasicSettings(): Promise<BasicSettings> {
    const settings = await this.getSettings();
    return settings.basic;
  }

  /**
   * 保存基本设置
   */
  static async saveBasicSettings(basic: Partial<BasicSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    await this.saveSettings({ 
      basic: { ...currentSettings.basic, ...basic }
    });
  }

  /**
   * 验证本地路径
   * 检查路径是否可访问、可读、可写
   */
  static async validatePath(
    directoryHandle: FileSystemDirectoryHandle
  ): Promise<PathValidationResult> {
    try {
      // 检查读权限
      const readPermission = await (directoryHandle as unknown as FileSystemHandle).queryPermission({ mode: 'read' });
      if (readPermission !== 'granted') {
        const requestRead = await (directoryHandle as unknown as FileSystemHandle).requestPermission({ mode: 'read' });
        if (requestRead !== 'granted') {
          return {
            valid: false,
            error: '没有读取权限，请授权后重试'
          };
        }
      }

      // 检查写权限
      const writePermission = await (directoryHandle as unknown as FileSystemHandle).queryPermission({ mode: 'readwrite' });
      if (writePermission !== 'granted') {
        const requestWrite = await (directoryHandle as unknown as FileSystemHandle).requestPermission({ mode: 'readwrite' });
        if (requestWrite !== 'granted') {
          return {
            valid: false,
            error: '没有写入权限，请授权后重试'
          };
        }
      }

      // 尝试创建测试文件
      try {
        await directoryHandle.getFileHandle('.bookmark_test', { create: true });
        await directoryHandle.removeEntry('.bookmark_test');
        
        return {
          valid: true,
          info: {
            readable: true,
            writable: true,
            path: directoryHandle.name
          }
        };
      } catch (error) {
        return {
          valid: false,
          error: '无法在该目录创建文件，请检查权限'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '路径验证失败'
      };
    }
  }

  /**
   * 测试存储连接
   * 测试当前存储配置是否可用
   */
  static async testConnection(adapter: IStorageAdapter): Promise<TestConnectionResult> {
    const startTime = Date.now();

    try {
      // 检查存储是否可用
      const isAvailable = await adapter.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: '存储不可用，请检查配置'
        };
      }

      // 获取容量信息
      let capacity: StorageCapacityInfo | undefined;
      try {
        capacity = await adapter.getCapacity();
      } catch (error) {
        console.warn('Failed to get capacity:', error);
      }

      // 测试读取
      try {
        await adapter.read();
      } catch (error) {
        return {
          success: false,
          error: '读取测试失败: ' + (error instanceof Error ? error.message : '未知错误')
        };
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        capacity
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 创建存储适配器
   * 根据当前设置创建对应的存储适配器实例
   */
  static async createStorageAdapter(): Promise<IStorageAdapter> {
    const settings = await this.getStorageSettings();

    if (settings.type === 'filesystem') {
      // 文件系统存储
      const adapter = new FileSystemAdapter();
      
      // 如果有保存的目录句柄ID，尝试恢复
      // 注意：File System Access API 的句柄无法序列化，需要用户重新选择
      // 这里返回未初始化的适配器，需要在使用前设置目录句柄
      return adapter;
    } else {
      // Chrome Storage
      return new ChromeStorageAdapter();
    }
  }

  /**
   * 切换存储方式
   * @param newType 新的存储方式
   * @param directoryHandle 当切换到filesystem时需要提供目录句柄
   */
  static async switchStorageType(
    newType: 'chrome' | 'filesystem',
    directoryHandle?: FileSystemDirectoryHandle
  ): Promise<void> {
    const currentSettings = await this.getStorageSettings();

    if (newType === currentSettings.type) {
      return; // 无需切换
    }

    if (newType === 'filesystem' && !directoryHandle) {
      throw new StorageError('切换到文件系统存储需要提供目录句柄');
    }

    // 验证新的存储方式
    if (newType === 'filesystem' && directoryHandle) {
      const validation = await this.validatePath(directoryHandle);
      if (!validation.valid) {
        throw new StorageError(validation.error || '路径验证失败');
      }
    }

    // 保存新的存储设置
    await this.saveStorageSettings({
      type: newType,
      localPath: directoryHandle?.name
    });

    // 注意：这里不执行数据迁移，需要在调用方处理
    // 数据迁移应该使用 StorageMigrator 服务
  }

  /**
   * 评估密码强度
   */
  static evaluatePasswordStrength(password: string): PasswordStrengthInfo {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('密码长度至少8位');
    }

    if (password.length >= 12) {
      score += 10;
    }

    if (password.length >= 16) {
      score += 10;
    }

    // 包含小写字母
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('建议包含小写字母');
    }

    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('建议包含大写字母');
    }

    // 包含数字
    if (/\d/.test(password)) {
      score += 15;
    } else {
      feedback.push('建议包含数字');
    }

    // 包含特殊字符
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 15;
    } else {
      feedback.push('建议包含特殊字符');
    }

    // 判断强度等级
    let level: PasswordStrengthLevel;
    if (score >= 70) {
      level = PasswordStrengthLevel.STRONG;
    } else if (score >= 50) {
      level = PasswordStrengthLevel.MEDIUM;
    } else {
      level = PasswordStrengthLevel.WEAK;
    }

    return {
      level,
      score,
      feedback
    };
  }

  /**
   * 重置所有设置为默认值
   */
  static async resetToDefault(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: this.DEFAULT_SETTINGS
      });
    } catch (error) {
      throw new StorageError('重置设置失败', error);
    }
  }
}
