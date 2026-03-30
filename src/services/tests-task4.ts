/**
 * Task4 功能测试
 * 验证认证、会话和自动锁定功能
 */

import { AuthService } from './AuthService';
import { SessionService } from './SessionService';
import { LockService } from './LockService';
import { PasswordValidator } from '@/utils/passwordValidator';
import { XSSProtection } from '@/utils/xssProtection';
import { PasswordStrength } from '@/types/auth';

/**
 * 测试辅助函数：等待指定时间
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 测试辅助函数：清除所有数据
 */
async function clearAllData() {
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
}

/**
 * 测试 1: 密码强度评估
 */
export async function test1_PasswordStrength() {
  console.log('=== 测试 1: 密码强度评估 ===\n');

  const testCases = [
    { password: '123', expectedStrength: PasswordStrength.WEAK },
    { password: '123456', expectedStrength: PasswordStrength.WEAK },
    { password: 'password', expectedStrength: PasswordStrength.WEAK },
    { password: 'MyPass123', expectedStrength: PasswordStrength.MEDIUM },
    { password: 'Secure@Pass2024', expectedStrength: PasswordStrength.STRONG }
  ];

  for (const testCase of testCases) {
    const result = PasswordValidator.evaluate(testCase.password);
    const passed = result.strength === testCase.expectedStrength;

    console.log(`密码: "${testCase.password}"`);
    console.log(`预期强度: ${testCase.expectedStrength}`);
    console.log(`实际强度: ${result.strength}`);
    console.log(`分数: ${result.score}`);
    console.log(`测试结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
  }
}

/**
 * 测试 2: 首次设置密码
 */
export async function test2_SetPassword() {
  console.log('=== 测试 2: 首次设置密码 ===\n');

  await clearAllData();

  // 1. 验证初始状态（未设置密码）
  let isSet = await AuthService.isPasswordSet();
  console.log(`1. 初始状态 - 密码已设置: ${isSet}`);
  console.log(`   测试结果: ${!isSet ? '✅ 通过' : '❌ 失败'}\n`);

  // 2. 设置密码
  const password = 'TestPass@123';
  const result = await AuthService.setPassword(password);
  console.log(`2. 设置密码 - 成功: ${result.success}`);
  console.log(`   测试结果: ${result.success ? '✅ 通过' : '❌ 失败'}\n`);

  // 3. 验证密码已设置
  isSet = await AuthService.isPasswordSet();
  console.log(`3. 验证状态 - 密码已设置: ${isSet}`);
  console.log(`   测试结果: ${isSet ? '✅ 通过' : '❌ 失败'}\n`);

  // 4. 尝试重复设置（应该失败）
  const result2 = await AuthService.setPassword('AnotherPass@456');
  console.log(`4. 重复设置 - 成功: ${result2.success}`);
  console.log(`   错误信息: ${result2.error}`);
  console.log(`   测试结果: ${!result2.success ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 3: 密码验证
 */
export async function test3_VerifyPassword() {
  console.log('=== 测试 3: 密码验证 ===\n');

  await clearAllData();

  const password = 'TestPass@123';
  await AuthService.setPassword(password);

  // 1. 正确密码验证
  const result1 = await AuthService.verifyPassword(password);
  console.log(`1. 正确密码 - 成功: ${result1.success}`);
  console.log(`   测试结果: ${result1.success ? '✅ 通过' : '❌ 失败'}\n`);

  // 2. 错误密码验证
  const result2 = await AuthService.verifyPassword('WrongPass@456');
  console.log(`2. 错误密码 - 成功: ${result2.success}`);
  console.log(`   错误信息: ${result2.error}`);
  console.log(`   测试结果: ${!result2.success ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 4: 防爆破锁定机制
 */
export async function test4_BruteForceProtection() {
  console.log('=== 测试 4: 防爆破锁定机制 ===\n');

  await clearAllData();

  const password = 'TestPass@123';
  await AuthService.setPassword(password);

  // 1. 连续输入 3 次错误密码
  console.log('1. 连续输入 3 次错误密码:\n');
  for (let i = 1; i <= 3; i++) {
    const result = await AuthService.verifyPassword('WrongPass');
    const remaining = await AuthService.getRemainingAttempts();
    console.log(`   第 ${i} 次尝试 - 成功: ${result.success}`);
    console.log(`   剩余尝试次数: ${remaining}`);
  }

  // 2. 检查锁定状态
  const lockStatus = await AuthService.checkLockStatus();
  console.log(`\n2. 锁定状态:`);
  console.log(`   已锁定: ${lockStatus.isLocked}`);
  console.log(`   剩余锁定时间: ${lockStatus.remainingSeconds} 秒`);
  console.log(`   测试结果: ${lockStatus.isLocked ? '✅ 通过' : '❌ 失败'}\n`);

  // 3. 尝试在锁定期间验证（应该失败）
  const result = await AuthService.verifyPassword(password);
  console.log(`3. 锁定期间验证 - 成功: ${result.success}`);
  console.log(`   错误信息: ${result.error}`);
  console.log(`   测试结果: ${!result.success ? '✅ 通过' : '❌ 失败'}\n`);

  console.log('⏳ 等待 5 秒（模拟锁定倒计时）...\n');
  await wait(5000);

  const lockStatus2 = await AuthService.checkLockStatus();
  console.log(`4. 5秒后锁定状态:`);
  console.log(`   已锁定: ${lockStatus2.isLocked}`);
  console.log(`   剩余锁定时间: ${lockStatus2.remainingSeconds} 秒\n`);
}

/**
 * 测试 5: 会话解锁与锁定
 */
export async function test5_SessionUnlockLock() {
  console.log('=== 测试 5: 会话解锁与锁定 ===\n');

  await clearAllData();

  const password = 'TestPass@123';
  await AuthService.setPassword(password);

  // 1. 初始状态（已锁定）
  let isLocked = await SessionService.isLocked();
  console.log(`1. 初始状态 - 已锁定: ${isLocked}`);
  console.log(`   测试结果: ${isLocked ? '✅ 通过' : '❌ 失败'}\n`);

  // 2. 解锁会话
  const unlockResult = await SessionService.unlock(password);
  console.log(`2. 解锁会话 - 成功: ${unlockResult.success}`);
  console.log(`   测试结果: ${unlockResult.success ? '✅ 通过' : '❌ 失败'}\n`);

  // 3. 验证已解锁
  isLocked = await SessionService.isLocked();
  const key = SessionService.getEncryptionKey();
  console.log(`3. 验证状态 - 已锁定: ${isLocked}`);
  console.log(`   加密密钥已加载: ${key !== null}`);
  console.log(`   测试结果: ${!isLocked && key !== null ? '✅ 通过' : '❌ 失败'}\n`);

  // 4. 锁定会话
  await SessionService.lock();
  isLocked = await SessionService.isLocked();
  const key2 = SessionService.getEncryptionKey();
  console.log(`4. 锁定会话 - 已锁定: ${isLocked}`);
  console.log(`   加密密钥已清除: ${key2 === null}`);
  console.log(`   测试结果: ${isLocked && key2 === null ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 6: 自动锁定计时器
 */
export async function test6_AutoLockTimer() {
  console.log('=== 测试 6: 自动锁定计时器 ===\n');

  await clearAllData();

  const password = 'TestPass@123';
  await AuthService.setPassword(password);
  await SessionService.unlock(password);

  // 1. 设置锁定时间为 10 秒（测试用）
  await LockService.setLockTimeout(0.1667); // 约 10 秒
  const timeout = await LockService.getLockTimeout();
  console.log(`1. 设置锁定时间: ${timeout} 分钟`);
  console.log(`   测试结果: ✅ 通过\n`);

  // 2. 启动计时器
  let locked = false;
  LockService.onLock(() => {
    locked = true;
    console.log(`   🔒 触发自动锁定！`);
  });

  await LockService.startTimer();
  console.log(`2. 启动自动锁定计时器`);

  const remaining = await LockService.getRemainingTime();
  console.log(`   剩余时间: ${remaining} 秒\n`);

  // 3. 等待 12 秒，验证自动锁定
  console.log('⏳ 等待 12 秒，验证自动锁定...\n');
  await wait(12000);

  const isLocked = await SessionService.isLocked();
  console.log(`3. 自动锁定结果:`);
  console.log(`   会话已锁定: ${isLocked}`);
  console.log(`   回调已触发: ${locked}`);
  console.log(`   测试结果: ${isLocked && locked ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 7: 用户活动重置计时器
 */
export async function test7_ActivityReset() {
  console.log('=== 测试 7: 用户活动重置计时器 ===\n');

  await clearAllData();

  const password = 'TestPass@123';
  await AuthService.setPassword(password);
  await SessionService.unlock(password);

  // 设置锁定时间为 15 秒
  await LockService.setLockTimeout(0.25); // 15 秒
  await LockService.startTimer();

  console.log('1. 启动自动锁定计时器 (15秒)');

  // 等待 8 秒
  console.log('⏳ 等待 8 秒...');
  await wait(8000);

  let remaining1 = await LockService.getRemainingTime();
  console.log(`   剩余时间: ${remaining1} 秒\n`);

  // 模拟用户活动，重置计时器
  console.log('2. 模拟用户活动，重置计时器');
  await LockService.resetTimer();

  let remaining2 = await LockService.getRemainingTime();
  console.log(`   重置后剩余时间: ${remaining2} 秒`);
  console.log(`   测试结果: ${remaining2 > remaining1 ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 8: XSS 防护
 */
export async function test8_XSSProtection() {
  console.log('=== 测试 8: XSS 防护 ===\n');

  const testCases = [
    {
      name: 'HTML 转义',
      input: '<script>alert("XSS")</script>',
      method: 'escapeHtml',
      shouldContain: '&lt;script&gt;'
    },
    {
      name: '输入清理',
      input: '<img src=x onerror=alert(1)>',
      method: 'sanitizeInput',
      shouldNotContain: '<img'
    },
    {
      name: 'URL 验证 - 危险',
      input: 'javascript:alert(1)',
      method: 'isUrlSafe',
      expected: false
    },
    {
      name: 'URL 验证 - 安全',
      input: 'https://example.com',
      method: 'isUrlSafe',
      expected: true
    }
  ];

  for (const testCase of testCases) {
    console.log(`${testCase.name}:`);
    console.log(`  输入: ${testCase.input}`);

    let result;
    let passed = false;

    if (testCase.method === 'escapeHtml') {
      result = XSSProtection.escapeHtml(testCase.input);
      passed = result.includes(testCase.shouldContain!);
      console.log(`  输出: ${result}`);
    } else if (testCase.method === 'sanitizeInput') {
      result = XSSProtection.sanitizeInput(testCase.input);
      passed = !result.includes(testCase.shouldNotContain!);
      console.log(`  输出: ${result}`);
    } else if (testCase.method === 'isUrlSafe') {
      result = XSSProtection.isUrlSafe(testCase.input);
      passed = result === testCase.expected;
      console.log(`  结果: ${result}`);
    }

    console.log(`  测试结果: ${passed ? '✅ 通过' : '❌ 失败'}\n`);
  }
}

/**
 * 测试 9: 密码修改
 */
export async function test9_ChangePassword() {
  console.log('=== 测试 9: 密码修改 ===\n');

  await clearAllData();

  const oldPassword = 'OldPass@123';
  const newPassword = 'NewPass@456';

  // 1. 设置初始密码
  await AuthService.setPassword(oldPassword);
  console.log('1. 设置初始密码: OldPass@123\n');

  // 2. 修改密码
  const result = await AuthService.changePassword(oldPassword, newPassword);
  console.log(`2. 修改密码 - 成功: ${result.success}`);
  console.log(`   测试结果: ${result.success ? '✅ 通过' : '❌ 失败'}\n`);

  // 3. 验证旧密码失效
  const result2 = await AuthService.verifyPassword(oldPassword);
  console.log(`3. 验证旧密码 - 成功: ${result2.success}`);
  console.log(`   测试结果: ${!result2.success ? '✅ 通过' : '❌ 失败'}\n`);

  // 4. 验证新密码有效
  const result3 = await AuthService.verifyPassword(newPassword);
  console.log(`4. 验证新密码 - 成功: ${result3.success}`);
  console.log(`   测试结果: ${result3.success ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 测试 10: 锁定设置管理
 */
export async function test10_LockSettings() {
  console.log('=== 测试 10: 锁定设置管理 ===\n');

  // 1. 获取默认设置
  let settings = await LockService.getLockSettings();
  console.log('1. 默认设置:');
  console.log(`   自动锁定时间: ${settings.autoLockMinutes} 分钟`);
  console.log(`   浏览器关闭时锁定: ${settings.lockOnBrowserClose}`);
  console.log(`   提醒时间: ${settings.reminderSeconds.join(', ')} 秒\n`);

  // 2. 修改设置
  await LockService.setLockTimeout(15);
  const newTimeout = await LockService.getLockTimeout();
  console.log(`2. 修改锁定时间为 15 分钟`);
  console.log(`   当前设置: ${newTimeout} 分钟`);
  console.log(`   测试结果: ${newTimeout === 15 ? '✅ 通过' : '❌ 失败'}\n`);

  // 3. 修改提醒设置
  settings = await LockService.getLockSettings();
  settings.reminderSeconds = [180, 60, 10]; // 3分钟、1分钟、10秒
  await LockService.saveLockSettings(settings);

  const newSettings = await LockService.getLockSettings();
  const reminderMatches =
    JSON.stringify(newSettings.reminderSeconds) ===
    JSON.stringify([180, 60, 10]);
  console.log(`3. 修改提醒设置为 [180, 60, 10]`);
  console.log(`   当前设置: ${newSettings.reminderSeconds.join(', ')}`);
  console.log(`   测试结果: ${reminderMatches ? '✅ 通过' : '❌ 失败'}\n`);
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║        Task4 功能测试 - 开始执行                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await test1_PasswordStrength();
    await test2_SetPassword();
    await test3_VerifyPassword();
    await test4_BruteForceProtection();
    await test5_SessionUnlockLock();
    await test6_AutoLockTimer();
    await test7_ActivityReset();
    await test8_XSSProtection();
    await test9_ChangePassword();
    await test10_LockSettings();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║        ✅ 所有测试完成！                         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 测试运行出错:', error);
  }
}
