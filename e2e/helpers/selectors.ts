/**
 * 页面选择器常量
 * 集中管理所有 CSS 选择器，便于维护
 */

export const PopupSelectors = {
  // 通用
  app: '.app',
  header: '.header',
  headerTitle: '.header h1',
  loading: '.loading',
  error: '.error',
  warning: '.warning',

  // 表单
  form: '.form',
  formGroup: '.form-group',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',

  // 设置密码页面
  setPasswordInput: 'input[placeholder="8-32 位字符"]',
  confirmPasswordInput: 'input[placeholder="再次输入密码"]',
  setPasswordButton: 'button:has-text("设置密码")',

  // 解锁页面
  unlockPasswordInput: 'input[placeholder="输入密码"]',
  unlockButton: 'button:has-text("解锁")',

  // 已解锁页面
  unlockedContent: '.unlocked-content',
  lockButton: 'button:has-text("锁定")',

  // 锁定页面
  lockedInfo: '.locked-info',
  attemptsInfo: '.attempts',

  // 提示
  tips: '.tips',
};

export const OptionsSelectors = {
  // 布局
  container: '.options-container',
  sidebar: '.sidebar',
  content: '.options-content',

  // 侧边栏导航（实际使用 button.sidebar-item，无 data-tab）
  navItem: 'button.sidebar-item',
  navItemActive: 'button.sidebar-item.active',
  tabBasic: 'button.sidebar-item:has-text("基本设置")',
  tabSecurity: 'button.sidebar-item:has-text("安全设置")',
  tabStorage: 'button.sidebar-item:has-text("存储设置")',
  tabImportExport: 'button.sidebar-item:has-text("导入导出")',
  tabAbout: 'button.sidebar-item:has-text("关于")',

  // 消息提示
  globalMessage: '.global-message',
  messageSuccess: '.message-success',
  messageError: '.message-error',

  // 面板
  settingsPanel: '.settings-panel',
  panelTitle: '.panel-title',
  panelSection: '.panel-section',
};

export const CommonSelectors = {
  // 按钮
  btnPrimary: '.btn-primary',
  btnSecondary: '.btn-secondary',
  btnDanger: '.btn-danger',

  // 输入
  input: 'input',
  textarea: 'textarea',
  select: 'select',

  // 状态
  disabled: '[disabled]',
  loading: '.loading',
};

/**
 * 获取带文本的选择器
 */
export function withText(selector: string, text: string): string {
  return `${selector}:has-text("${text}")`;
}

/**
 * 获取第 N 个元素的选择器
 */
export function nth(selector: string, index: number): string {
  return `${selector} >> nth=${index}`;
}
