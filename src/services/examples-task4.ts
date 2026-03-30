/**
 * Task4 - 安全与会话管理功能 使用示例
 * 
 * 本文件演示如何使用认证、会话和自动锁定服务
 */

import { AuthService } from './AuthService';
import { SessionService } from './SessionService';
import { LockService } from './LockService';
import { PasswordValidator } from '@/utils/passwordValidator';
import { XSSProtection } from '@/utils/xssProtection';

/* ============================================
 * 示例 1: 首次设置密码流程
 * ============================================ */

async function exampleFirstTimeSetup() {
  console.log('=== 示例 1: 首次设置密码 ===\n');

  // 1. 检查是否已设置密码
  const isSet = await AuthService.isPasswordSet();
  console.log('密码是否已设置:', isSet);

  if (isSet) {
    console.log('密码已设置，跳过首次设置流程\n');
    return;
  }

  // 2. 用户输入密码
  const password = 'MySecure@123';

  // 3. 实时评估密码强度
  const strengthResult = PasswordValidator.evaluate(password);
  console.log('密码强度:', strengthResult.strength);
  console.log('强度分数:', strengthResult.score);
  console.log('反馈信息:', strengthResult.feedback.join('\n'));

  // 4. 设置密码
  const result = await AuthService.setPassword(password);
  if (result.success) {
    console.log('✅ 密码设置成功\n');
  } else {
    console.log('❌ 密码设置失败:', result.error, '\n');
  }
}

/* ============================================
 * 示例 2: 解锁验证流程
 * ============================================ */

async function exampleUnlockFlow() {
  console.log('=== 示例 2: 解锁验证流程 ===\n');

  // 1. 检查锁定状态
  const isLocked = await SessionService.isLocked();
  console.log('当前是否锁定:', isLocked);

  if (!isLocked) {
    console.log('当前已解锁，无需验证\n');
    return;
  }

  // 2. 用户输入密码
  const password = 'MySecure@123';

  // 3. 解锁
  const unlockResult = await SessionService.unlock(password);

  if (unlockResult.success) {
    console.log('✅ 解锁成功');
    console.log('加密密钥已加载到内存\n');
  } else {
    console.log('❌ 解锁失败:', unlockResult.error);
    if (unlockResult.remainingAttempts !== undefined) {
      console.log('剩余尝试次数:', unlockResult.remainingAttempts);
    }
    if (unlockResult.lockedUntil) {
      const remainingSeconds = Math.ceil(
        (unlockResult.lockedUntil - Date.now()) / 1000
      );
      console.log(`账户已锁定，${remainingSeconds} 秒后可重试\n`);
    }
  }
}

/* ============================================
 * 示例 3: 密码验证失败与防爆破
 * ============================================ */

async function examplePasswordBruteForceProtection() {
  console.log('=== 示例 3: 密码验证失败与防爆破 ===\n');

  const wrongPassword = 'WrongPassword123';

  // 模拟连续 3 次输入错误密码
  for (let i = 1; i <= 4; i++) {
    console.log(`第 ${i} 次尝试...`);

    const result = await SessionService.unlock(wrongPassword);

    if (!result.success) {
      console.log('❌ 解锁失败:', result.error);
      console.log('剩余尝试次数:', result.remainingAttempts, '\n');

      // 第 3 次失败后会触发锁定
      if (result.lockedUntil) {
        console.log('🔒 账户已锁定 30 秒\n');
        break;
      }
    }

    // 短暂延迟
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 检查锁定状态
  const lockStatus = await AuthService.checkLockStatus();
  if (lockStatus.isLocked) {
    console.log('当前锁定中，剩余时间:', lockStatus.remainingSeconds, '秒\n');
  }
}

/* ============================================
 * 示例 4: 自动锁定计时器
 * ============================================ */

async function exampleAutoLockTimer() {
  console.log('=== 示例 4: 自动锁定计时器 ===\n');

  // 1. 设置自动锁定时间 (30 分钟)
  await LockService.setLockTimeout(30);
  console.log('已设置自动锁定时间: 30 分钟');

  // 2. 启动计时器
  await LockService.startTimer();
  console.log('自动锁定计时器已启动');

  // 3. 注册锁定回调
  LockService.onLock(() => {
    console.log('🔒 触发自动锁定！');
  });

  // 4. 注册提醒回调
  LockService.onReminder((remainingSeconds) => {
    console.log(`⏰ 提醒: 还有 ${remainingSeconds} 秒将自动锁定`);
  });

  // 5. 模拟用户活动 (重置计时器)
  console.log('模拟用户活动，重置计时器...');
  await LockService.resetTimer();

  // 6. 获取剩余时间
  const remainingTime = await LockService.getRemainingTime();
  console.log('距离自动锁定剩余时间:', remainingTime, '秒\n');
}

/* ============================================
 * 示例 5: 用户活动监听
 * ============================================ */

function exampleActivityListeners() {
  console.log('=== 示例 5: 用户活动监听 ===\n');

  // 在页面加载时启动活动监听
  LockService.startActivityListeners();
  console.log('用户活动监听已启动');
  console.log('监听事件: mousedown, keydown, scroll, touchstart');
  console.log('任何用户操作都会重置自动锁定计时器\n');
}

/* ============================================
 * 示例 6: 修改密码
 * ============================================ */

async function exampleChangePassword() {
  console.log('=== 示例 6: 修改密码 ===\n');

  const oldPassword = 'MySecure@123';
  const newPassword = 'NewSecure@456';

  // 1. 评估新密码强度
  const strengthResult = PasswordValidator.evaluate(newPassword);
  console.log('新密码强度:', strengthResult.strength);
  console.log('强度分数:', strengthResult.score);

  // 2. 修改密码
  const result = await AuthService.changePassword(oldPassword, newPassword);

  if (result.success) {
    console.log('✅ 密码修改成功\n');
  } else {
    console.log('❌ 密码修改失败:', result.error, '\n');
  }
}

/* ============================================
 * 示例 7: XSS 防护
 * ============================================ */

function exampleXSSProtection() {
  console.log('=== 示例 7: XSS 防护 ===\n');

  // 1. 转义 HTML 特殊字符
  const maliciousTitle = '<script>alert("XSS")</script>My Bookmark';
  const safeTitleEscaped = XSSProtection.escapeHtml(maliciousTitle);
  console.log('原始输入:', maliciousTitle);
  console.log('转义后:', safeTitleEscaped);

  // 2. 清理用户输入
  const maliciousNote =
    'Check this <img src=x onerror=alert(1)> amazing site!';
  const safeNote = XSSProtection.sanitizeNote(maliciousNote);
  console.log('\n原始备注:', maliciousNote);
  console.log('清理后:', safeNote);

  // 3. 验证 URL 安全性
  const dangerousUrl = 'javascript:alert("XSS")';
  const safeUrl = 'https://example.com';

  console.log('\n危险 URL:', dangerousUrl);
  console.log('是否安全:', XSSProtection.isUrlSafe(dangerousUrl));

  console.log('安全 URL:', safeUrl);
  console.log('是否安全:', XSSProtection.isUrlSafe(safeUrl), '\n');
}

/* ============================================
 * 示例 8: 密码强度评估
 * ============================================ */

function examplePasswordStrengthEvaluation() {
  console.log('=== 示例 8: 密码强度评估 ===\n');

  const passwords = [
    '123456', // 弱密码
    'password', // 弱密码
    'MyPass123', // 中等强度
    'Secure@Pass2024' // 强密码
  ];

  for (const password of passwords) {
    const result = PasswordValidator.evaluate(password);
    console.log(`密码: "${password}"`);
    console.log(`强度: ${result.strength} (分数: ${result.score})`);
    console.log(`反馈: ${result.feedback.join('; ')}`);
    console.log('---');
  }

  // 获取密码要求说明
  console.log('\n密码要求:');
  const requirements = PasswordValidator.getRequirements();
  requirements.forEach((req, index) => {
    console.log(`${index + 1}. ${req}`);
  });
  console.log();
}

/* ============================================
 * 示例 9: 完整的应用初始化流程
 * ============================================ */

async function exampleAppInitialization() {
  console.log('=== 示例 9: 应用初始化流程 ===\n');

  // 1. 检查是否首次使用
  const isPasswordSet = await AuthService.isPasswordSet();
  console.log('是否已设置密码:', isPasswordSet);

  if (!isPasswordSet) {
    console.log('→ 首次使用，引导用户设置密码\n');
    return;
  }

  // 2. 检查会话是否已超时
  await LockService.checkSessionTimeout();
  console.log('已检查会话超时状态');

  // 3. 检查锁定状态
  const isLocked = await SessionService.isLocked();
  console.log('当前锁定状态:', isLocked);

  if (isLocked) {
    console.log('→ 应用已锁定，显示解锁界面\n');
    return;
  }

  // 4. 已解锁，启动自动锁定计时器
  await LockService.startTimer();
  console.log('自动锁定计时器已启动');

  // 5. 启动用户活动监听
  LockService.startActivityListeners();
  console.log('用户活动监听已启动');

  // 6. 获取加密密钥
  const encryptionKey = SessionService.getEncryptionKey();
  if (encryptionKey) {
    console.log('✅ 加密密钥已加载，可以访问加密数据\n');
  } else {
    console.log('❌ 加密密钥未加载，需要重新解锁\n');
  }
}

/* ============================================
 * 示例 10: 锁定设置管理
 * ============================================ */

async function exampleLockSettingsManagement() {
  console.log('=== 示例 10: 锁定设置管理 ===\n');

  // 1. 获取当前锁定设置
  const settings = await LockService.getLockSettings();
  console.log('当前锁定设置:', settings);

  // 2. 修改锁定时间
  const newTimeoutOptions = [5, 15, 30, 60, 0]; // 0 表示永不锁定
  console.log('\n可选锁定时间 (分钟):', newTimeoutOptions.join(', '));

  // 设置为 15 分钟
  await LockService.setLockTimeout(15);
  console.log('已设置自动锁定时间: 15 分钟');

  // 3. 验证设置是否生效
  const currentTimeout = await LockService.getLockTimeout();
  console.log('当前锁定时间设置:', currentTimeout, '分钟\n');
}

/* ============================================
 * 运行所有示例
 * ============================================ */

export async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Task4 - 安全与会话管理功能 使用示例           ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await exampleFirstTimeSetup();
    await exampleUnlockFlow();
    await examplePasswordBruteForceProtection();
    await exampleAutoLockTimer();
    exampleActivityListeners();
    await exampleChangePassword();
    exampleXSSProtection();
    examplePasswordStrengthEvaluation();
    await exampleAppInitialization();
    await exampleLockSettingsManagement();

    console.log('✅ 所有示例运行完成！\n');
  } catch (error) {
    console.error('❌ 运行示例时出错:', error);
  }
}

// 导出单个示例函数供外部使用
export {
  exampleFirstTimeSetup,
  exampleUnlockFlow,
  examplePasswordBruteForceProtection,
  exampleAutoLockTimer,
  exampleActivityListeners,
  exampleChangePassword,
  exampleXSSProtection,
  examplePasswordStrengthEvaluation,
  exampleAppInitialization,
  exampleLockSettingsManagement
};
