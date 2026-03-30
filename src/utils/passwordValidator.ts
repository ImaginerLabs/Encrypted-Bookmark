import { PasswordStrength, type PasswordStrengthResult } from '@/types/auth';

/**
 * 密码强度校验工具
 * 评估规则: 6-20位, 支持字母/数字/特殊字符
 */
export class PasswordValidator {
  /** 最小密码长度 */
  private static readonly MIN_LENGTH = 6;
  /** 最大密码长度 */
  private static readonly MAX_LENGTH = 20;

  /** 常见弱密码列表 */
  private static readonly COMMON_WEAK_PASSWORDS = new Set([
    '123456',
    'password',
    '12345678',
    'qwerty',
    'abc123',
    '111111',
    'password1',
    '123456789',
    'letmein',
    '1234567890',
    'welcome',
    'admin',
    '123123',
    'password123',
    '666666',
    '888888',
    '000000'
  ]);

  /**
   * 验证密码长度是否合法
   * @param password 密码
   * @returns 是否合法
   */
  static isValidLength(password: string): boolean {
    return (
      password.length >= this.MIN_LENGTH &&
      password.length <= this.MAX_LENGTH
    );
  }

  /**
   * 检查密码字符类型
   * @param password 密码
   * @returns 字符类型统计
   */
  private static analyzeCharacterTypes(password: string): {
    hasLowerCase: boolean;
    hasUpperCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    typeCount: number;
  } {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

    const typeCount =
      [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean)
        .length;

    return {
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      typeCount
    };
  }

  /**
   * 检查是否为常见弱密码
   * @param password 密码
   * @returns 是否为弱密码
   */
  private static isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.COMMON_WEAK_PASSWORDS.has(lowerPassword);
  }

  /**
   * 检查密码是否包含连续字符 (如 123, abc)
   * @param password 密码
   * @returns 是否包含连续字符
   */
  private static hasSequentialChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      const code1 = password.charCodeAt(i);
      const code2 = password.charCodeAt(i + 1);
      const code3 = password.charCodeAt(i + 2);

      // 检查连续递增或递减
      if (
        (code2 === code1 + 1 && code3 === code2 + 1) ||
        (code2 === code1 - 1 && code3 === code2 - 1)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查密码是否包含重复字符 (如 aaa, 111)
   * @param password 密码
   * @returns 是否包含重复字符
   */
  private static hasRepeatingChars(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (
        password[i] === password[i + 1] &&
        password[i] === password[i + 2]
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 计算密码强度分数 (0-100)
   * @param password 密码
   * @returns 分数
   */
  private static calculateScore(password: string): number {
    let score = 0;

    // 长度加分 (最多 40 分)
    const lengthScore = Math.min(
      (password.length / this.MAX_LENGTH) * 40,
      40
    );
    score += lengthScore;

    // 字符类型加分 (最多 40 分)
    const { typeCount } = this.analyzeCharacterTypes(password);
    score += typeCount * 10;

    // 额外长度奖励 (10+ 字符)
    if (password.length >= 10) {
      score += 10;
    }

    // 惩罚项
    if (this.isCommonPassword(password)) {
      score -= 30; // 常见密码
    }
    if (this.hasSequentialChars(password)) {
      score -= 10; // 连续字符
    }
    if (this.hasRepeatingChars(password)) {
      score -= 10; // 重复字符
    }

    // 确保分数在 0-100 范围内
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估密码强度
   * @param password 密码
   * @returns 强度评估结果
   */
  static evaluate(password: string): PasswordStrengthResult {
    const feedback: string[] = [];

    // 1. 长度检查
    if (!this.isValidLength(password)) {
      feedback.push(`密码长度必须在 ${this.MIN_LENGTH}-${this.MAX_LENGTH} 位之间`);
      return {
        strength: PasswordStrength.WEAK,
        score: 0,
        feedback
      };
    }

    // 2. 字符类型分析
    const {
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      typeCount
    } = this.analyzeCharacterTypes(password);

    // 3. 常见密码检查
    if (this.isCommonPassword(password)) {
      feedback.push('这是一个常见的弱密码，建议更换');
    }

    // 4. 连续字符检查
    if (this.hasSequentialChars(password)) {
      feedback.push('包含连续字符 (如 123, abc)，降低了安全性');
    }

    // 5. 重复字符检查
    if (this.hasRepeatingChars(password)) {
      feedback.push('包含重复字符 (如 aaa, 111)，降低了安全性');
    }

    // 6. 计算分数
    const score = this.calculateScore(password);

    // 7. 确定强度等级
    let strength: PasswordStrength;
    if (score >= 70) {
      strength = PasswordStrength.STRONG;
    } else if (score >= 40) {
      strength = PasswordStrength.MEDIUM;
    } else {
      strength = PasswordStrength.WEAK;
    }

    // 8. 生成改进建议
    if (strength !== PasswordStrength.STRONG) {
      if (typeCount < 3) {
        const missing: string[] = [];
        if (!hasLowerCase) missing.push('小写字母');
        if (!hasUpperCase) missing.push('大写字母');
        if (!hasNumber) missing.push('数字');
        if (!hasSpecialChar) missing.push('特殊字符');
        feedback.push(`建议添加: ${missing.join('、')}`);
      }
      if (password.length < 10) {
        feedback.push('建议密码长度至少 10 位');
      }
    }

    if (feedback.length === 0) {
      feedback.push('密码强度良好');
    }

    return {
      strength,
      score,
      feedback
    };
  }

  /**
   * 获取密码要求说明
   * @returns 要求说明文本
   */
  static getRequirements(): string[] {
    return [
      `长度: ${this.MIN_LENGTH}-${this.MAX_LENGTH} 位`,
      '支持字母 (大小写)、数字、特殊字符',
      '建议使用多种字符类型组合',
      '避免使用常见密码 (如 123456, password)',
      '避免使用连续或重复的字符'
    ];
  }
}
