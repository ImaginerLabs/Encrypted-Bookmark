import { StorageError } from '@/types/errors';
import type { EncryptedData } from '@/types/data';
import type { IStorageAdapter, StorageCapacityInfo } from '../interfaces/IStorageAdapter';

/**
 * 文件存储配置
 */
const FILE_STORAGE_CONFIG = {
  /** 默认文件名 */
  DEFAULT_FILENAME: 'bookmarks_encrypted.dat',
  /** 文件MIME类型 */
  FILE_MIME_TYPE: 'application/octet-stream',
  /** 文件编码 */
  FILE_ENCODING: 'utf-8',
} as const;

/**
 * 文件系统存储适配器
 * 基于 File System Access API 实现本地文件存储
 * 
 * 功能特性：
 * - 无容量限制（取决于磁盘空间）
 * - 路径有效性校验
 * - 文件读写权限检测
 * - 自动创建和更新文件
 * - 完整的错误处理
 * 
 * 注意事项：
 * - 需要用户手动授权文件访问权限
 * - 仅支持 Chrome 86+ 和 Edge 86+
 * - 不支持 Firefox（可降级到 Chrome Storage）
 */
export class FileSystemAdapter implements IStorageAdapter {
  private fileHandle: FileSystemFileHandle | null = null;
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  /**
   * 创建文件系统适配器
   * @param directoryHandle - 可选的目录句柄,如果提供则跳过目录选择
   */
  constructor(directoryHandle?: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle || null;
  }

  /**
   * 读取加密数据
   */
  async read(): Promise<EncryptedData | null> {
    try {
      // 确保已获取文件句柄
      await this.ensureFileHandle();

      if (!this.fileHandle) {
        return null;
      }

      // 验证读取权限
      const permissionStatus = await this.verifyPermission(this.fileHandle, false);
      if (!permissionStatus) {
        throw new StorageError('没有文件读取权限,请重新授权');
      }

      // 读取文件内容
      const file = await this.fileHandle.getFile();
      const content = await file.text();

      if (!content || content.trim() === '') {
        return null;
      }

      // 解析 JSON 数据
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        throw new StorageError('文件内容格式错误,无法解析 JSON 数据', {
          originalError: parseError,
        });
      }

      // 验证数据结构
      this.validateEncryptedData(data);

      return data as EncryptedData;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('读取文件失败', { originalError: error });
    }
  }

  /**
   * 写入加密数据
   */
  async write(data: EncryptedData): Promise<void> {
    try {
      // 验证输入数据
      this.validateEncryptedData(data);

      // 确保已获取文件句柄
      await this.ensureFileHandle();

      if (!this.fileHandle) {
        throw new StorageError('无法获取文件句柄');
      }

      // 验证写入权限
      const permissionStatus = await this.verifyPermission(this.fileHandle, true);
      if (!permissionStatus) {
        throw new StorageError('没有文件写入权限,请重新授权');
      }

      // 创建可写流
      const writable = await this.fileHandle.createWritable();

      try {
        // 序列化数据（格式化输出，便于调试）
        const jsonContent = JSON.stringify(data, null, 2);

        // 写入文件
        await writable.write(jsonContent);

        // 确保写入完成
        await writable.close();
      } catch (writeError) {
        // 写入失败时尝试关闭流
        try {
          await writable.abort();
        } catch {
          // 忽略 abort 错误
        }
        throw writeError;
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('写入文件失败', { originalError: error });
    }
  }

  /**
   * 清空存储数据
   */
  async clear(): Promise<void> {
    try {
      if (!this.fileHandle) {
        // 如果没有文件句柄，说明文件不存在或未初始化，直接返回
        return;
      }

      // 验证写入权限
      const permissionStatus = await this.verifyPermission(this.fileHandle, true);
      if (!permissionStatus) {
        throw new StorageError('没有文件删除权限,请重新授权');
      }

      // 清空文件内容（写入空字符串）
      const writable = await this.fileHandle.createWritable();
      try {
        await writable.write('');
        await writable.close();
      } catch (error) {
        await writable.abort();
        throw error;
      }

      // 清空句柄缓存
      this.fileHandle = null;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError('清空文件失败', { originalError: error });
    }
  }

  /**
   * 获取存储容量信息
   * 注意：文件系统存储无容量限制，返回实际文件大小
   */
  async getCapacity(): Promise<StorageCapacityInfo> {
    try {
      if (!this.fileHandle) {
        await this.ensureFileHandle();
      }

      if (!this.fileHandle) {
        return {
          used: 0,
          total: -1, // -1 表示无限制
          usagePercent: 0,
        };
      }

      const file = await this.fileHandle.getFile();
      const fileSize = file.size;

      return {
        used: fileSize,
        total: -1, // 文件系统存储无容量限制
        usagePercent: 0,
      };
    } catch (error) {
      throw new StorageError('获取文件容量失败', { originalError: error });
    }
  }

  /**
   * 检查存储是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      // 检查 File System Access API 是否可用
      if (!window.showDirectoryPicker || !window.showSaveFilePicker) {
        return false;
      }

      // 如果有目录句柄，检查权限
      if (this.directoryHandle) {
        const permission = await (this.directoryHandle as unknown as FileSystemHandle).queryPermission({ mode: 'readwrite' });
        return permission === 'granted';
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取存储适配器类型
   */
  getType(): 'filesystem' {
    return 'filesystem';
  }

  /**
   * 设置目录句柄
   * 用于用户选择存储目录后更新适配器配置
   */
  setDirectoryHandle(handle: FileSystemDirectoryHandle): void {
    this.directoryHandle = handle;
    this.fileHandle = null; // 清除旧的文件句柄
  }

  /**
   * 获取当前目录句柄
   */
  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle;
  }

  /**
   * 确保已获取文件句柄
   * 如果没有则尝试在目录中获取或创建文件
   */
  private async ensureFileHandle(): Promise<void> {
    if (this.fileHandle) {
      return;
    }

    if (!this.directoryHandle) {
      throw new StorageError('未设置存储目录，请先配置存储路径');
    }

    try {
      // 尝试获取或创建文件
      this.fileHandle = await this.directoryHandle.getFileHandle(
        FILE_STORAGE_CONFIG.DEFAULT_FILENAME,
        { create: true }
      );
    } catch (error) {
      throw new StorageError('无法访问存储文件', { originalError: error });
    }
  }

  /**
   * 验证文件权限
   * @param fileHandle - 文件句柄
   * @param readWrite - true 表示需要读写权限，false 表示只需要读权限
   * @returns 权限验证通过返回 true
   */
  private async verifyPermission(
    fileHandle: FileSystemFileHandle,
    readWrite: boolean
  ): Promise<boolean> {
    const options: FileSystemHandlePermissionDescriptor = {
      mode: readWrite ? 'readwrite' : 'read',
    };

    // 检查现有权限
    let permission = await (fileHandle as FileSystemHandle).queryPermission(options);
    if (permission === 'granted') {
      return true;
    }

    // 请求权限
    permission = await (fileHandle as FileSystemHandle).requestPermission(options);
    return permission === 'granted';
  }

  /**
   * 验证加密数据结构完整性
   */
  private validateEncryptedData(data: unknown): asserts data is EncryptedData {
    if (!data || typeof data !== 'object') {
      throw new StorageError('无效的数据格式：数据必须是对象');
    }

    const encData = data as Partial<EncryptedData>;

    if (typeof encData.version !== 'number') {
      throw new StorageError('无效的数据格式：缺少版本号');
    }

    if (typeof encData.salt !== 'string' || !encData.salt) {
      throw new StorageError('无效的数据格式：缺少盐值');
    }

    if (typeof encData.iv !== 'string' || !encData.iv) {
      throw new StorageError('无效的数据格式：缺少初始化向量');
    }

    if (typeof encData.ciphertext !== 'string' || !encData.ciphertext) {
      throw new StorageError('无效的数据格式：缺少密文数据');
    }

    if (typeof encData.checksum !== 'string' || !encData.checksum) {
      throw new StorageError('无效的数据格式：缺少校验和');
    }
  }
}
