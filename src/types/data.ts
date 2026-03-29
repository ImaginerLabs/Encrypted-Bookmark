/**
 * 书签数据结构
 */
export interface Bookmark {
  /** 唯一标识符 */
  id: string;
  /** 书签标题 */
  title: string;
  /** 书签 URL */
  url: string;
  /** 所属文件夹 ID */
  folderId?: string;
  /** 标签列表 */
  tags?: string[];
  /** 备注信息 */
  note?: string;
  /** 创建时间戳 */
  createTime: number;
  /** 更新时间戳 */
  updateTime: number;
  /** 访问次数 */
  visitCount?: number;
}

/**
 * 文件夹数据结构
 */
export interface Folder {
  /** 唯一标识符 */
  id: string;
  /** 文件夹名称 */
  name: string;
  /** 父文件夹 ID（根目录为 undefined） */
  parentId?: string;
  /** 排序权重 */
  sort: number;
  /** 创建时间戳 */
  createTime: number;
}

/**
 * 标签数据结构
 */
export interface Tag {
  /** 唯一标识符 */
  id: string;
  /** 标签名称 */
  name: string;
  /** 标签颜色（HEX 格式） */
  color: string;
  /** 创建时间戳 */
  createTime: number;
}

/**
 * 加密数据结构
 * 存储格式遵循 AES-256-GCM 标准
 */
export interface EncryptedData {
  /** 数据版本号，用于未来升级兼容 */
  version: number;
  /** PBKDF2 盐值（Base64） */
  salt: string;
  /** AES-GCM 初始化向量（Base64） */
  iv: string;
  /** 加密后的密文（Base64） */
  ciphertext: string;
  /** SHA-256 校验和，用于验证数据完整性（Base64） */
  checksum: string;
}

/**
 * 密码验证状态
 */
export interface PasswordStatus {
  /** 是否已设置主密码 */
  isSet: boolean;
  /** 密码错误尝试次数 */
  failedAttempts: number;
  /** 锁定到期时间戳（0 表示未锁定） */
  lockedUntil: number;
}

/**
 * 存储在 chrome.storage.local 的数据结构
 */
export interface StorageData {
  /** 密码哈希（SHA-256） */
  passwordHash?: string;
  /** 加密后的书签数据 */
  encryptedBookmarks?: EncryptedData;
  /** 加密后的文件夹数据 */
  encryptedFolders?: EncryptedData;
  /** 加密后的标签数据 */
  encryptedTags?: EncryptedData;
  /** 密码验证状态 */
  passwordStatus?: PasswordStatus;
}
